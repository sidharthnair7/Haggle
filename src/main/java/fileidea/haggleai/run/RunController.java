package fileidea.haggleai.run;

import fileidea.haggleai.negotiation.NegotiationEvent;
import fileidea.haggleai.negotiation.NegotiationEventRepository;
import fileidea.haggleai.quote.LeverageGate;
import fileidea.haggleai.quote.Quote;
import fileidea.haggleai.quote.QuoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@RestController
@RequestMapping("/api/runs")
@RequiredArgsConstructor
public class RunController {

    private final RunService runService;
    private final RunRepository runRepository;
    private final QuoteRepository quoteRepository;
    private final NegotiationEventRepository negotiationEventRepository;
    private final LeverageGate leverageGate;

    private final ExecutorService sseExecutor = Executors.newVirtualThreadPerTaskExecutor();

    /**
     * Every field is boxed and optional on purpose. A primitive here means an
     * omitted field is a 400 instead of a default — the API should accept
     * {@code {"procedureName":"MRI"}} and fill in the rest.
     */
    public record StartRunRequest(
            String procedureName,
            String bodyPart,
            Boolean contrast,
            String location,
            Integer radiusKm,
            Boolean leverageEnabled
    ) {
    }

    public record LineItemDto(String label, double amount) {
    }

    public record QuoteDto(
            String clinicName,
            int round,
            String outcome,
            double total,
            boolean citable,
            List<LineItemDto> lineItems,
            Instant capturedAt
    ) {
    }

    public record EventDto(
            Long id,
            String type,
            String clinicName,
            int round,
            String detail,
            Double amount,
            Instant at
    ) {
    }

    public record RunSnapshot(
            UUID id,
            String state,
            String status,
            boolean answerable,
            boolean leverageEnabled,
            int round,
            Instant createdAt,
            Instant completedAt,
            Instant deadline,
            JobSpec spec,
            List<QuoteDto> quotes,
            List<EventDto> events,
            QuoteDto winner,
            double savingsVsHighest,
            double savingsVsNaive,
            double openingLow,
            double openingHigh,
            double biggestConcession,
            String biggestConcessionClinic
    ) {
    }

    @PostMapping
    public Map<String, Object> start(@RequestBody StartRunRequest body) {
        JobSpec spec = new JobSpec(
                body.procedureName() != null && !body.procedureName().isBlank()
                        ? body.procedureName() : "MRI",
                body.bodyPart(),
                Boolean.TRUE.equals(body.contrast()),
                body.location() != null && !body.location().isBlank()
                        ? body.location() : "Peterborough",
                body.radiusKm() != null ? body.radiusKm() : 50
        );
        boolean leverage = body.leverageEnabled() == null || body.leverageEnabled();
        Run run = runService.start(spec, leverage);
        return Map.of(
                "id", run.getId().toString(),
                "state", run.getState().name(),
                "deadline", run.getDeadline().toString()
        );
    }

    @GetMapping("/{id}")
    public RunSnapshot get(@PathVariable UUID id) {
        Run run = runRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Run not found: " + id));
        List<Quote> quotes = quoteRepository.findByRunIdOrderByCapturedAtAsc(id);
        List<NegotiationEvent> events = negotiationEventRepository.findByRunIdOrderByAtAsc(id);

        Map<String, Quote> latestCitable = new LinkedHashMap<>();
        Map<String, Quote> openingCitable = new LinkedHashMap<>();
        for (Quote q : quotes) {
            if (q.citable()) {
                latestCitable.put(q.getClinicName(), q);
                openingCitable.putIfAbsent(q.getClinicName(), q); // first citable = opening
            }
        }
        Quote winner = latestCitable.values().stream()
                .min(Comparator.comparingDouble(Quote::total))
                .orElse(null);
        double highest = latestCitable.values().stream()
                .mapToDouble(Quote::total)
                .max()
                .orElse(0);
        double savings = winner != null ? Math.max(0, highest - winner.total()) : 0;

        // The opening market — what a patient faces before anyone negotiates.
        double openingLow = openingCitable.values().stream()
                .mapToDouble(Quote::total).min().orElse(0);
        double openingHigh = openingCitable.values().stream()
                .mapToDouble(Quote::total).max().orElse(0);

        // Headline number: what you'd expect to pay calling ONE clinic at random
        // (the average opening quote) versus what the run actually got you.
        double naiveBaseline = openingCitable.values().stream()
                .mapToDouble(Quote::total).average().orElse(0);
        double savingsVsNaive = winner != null
                ? Math.max(0, naiveBaseline - winner.total()) : 0;

        // The most visceral proof the negotiation did something: the single
        // largest drop between a clinic's opening and its final price.
        double biggestConcession = 0;
        String biggestConcessionClinic = null;
        for (Map.Entry<String, Quote> entry : openingCitable.entrySet()) {
            Quote latest = latestCitable.get(entry.getKey());
            if (latest == null) {
                continue;
            }
            double drop = entry.getValue().total() - latest.total();
            if (drop > biggestConcession) {
                biggestConcession = drop;
                biggestConcessionClinic = entry.getKey();
            }
        }

        return new RunSnapshot(
                run.getId(),
                run.getState().name(),
                runService.statusFor(id),
                runService.answerable(id),
                run.isLeverageEnabled(),
                run.getRound(),
                run.getCreatedAt(),
                run.getCompletedAt(),
                run.getDeadline(),
                run.getSpec(),
                quotes.stream().map(this::toDto).toList(),
                events.stream().map(this::toDto).toList(),
                winner != null ? toDto(winner) : null,
                savings,
                savingsVsNaive,
                openingLow,
                openingHigh,
                biggestConcession,
                biggestConcessionClinic
        );
    }

    public record BluffRequest(Double claimedTotal, String againstClinic) {
    }

    public record BluffResponse(
            boolean allowed,
            String reason,
            double claimedTotal,
            String againstClinic,
            String demoNote
    ) {
    }

    /**
     * Honesty demo: deliberately try to cite a fake competing price.
     * The leverage gate should REFUSE — proving the agent cannot bluff.
     * This never contacts a clinic; it only exercises the gate + audit log.
     */
    @PostMapping("/{id}/bluff")
    public BluffResponse bluff(@PathVariable UUID id, @RequestBody(required = false) BluffRequest body) {
        if (runRepository.findById(id).isEmpty()) {
            throw new NoSuchElementException("Run not found: " + id);
        }

        double claimed = body != null && body.claimedTotal() != null ? body.claimedTotal() : 200.0;
        String against = body != null && body.againstClinic() != null && !body.againstClinic().isBlank()
                ? body.againstClinic()
                : quoteRepository.findByRunIdOrderByCapturedAtAsc(id).stream()
                .map(Quote::getClinicName)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse("Kawartha Imaging");

        LeverageGate.Result result = leverageGate.verify(id, against, claimed);
        String detail = (result.allowed() ? "Honesty demo ALLOWED: " : "Honesty demo REFUSED: ")
                + "agent tried to cite $" + claimed + " against " + against + " — " + result.reason();

        negotiationEventRepository.save(new NegotiationEvent(
                id,
                result.allowed() ? NegotiationEvent.Type.LEVERAGE_ALLOWED : NegotiationEvent.Type.LEVERAGE_REFUSED,
                against,
                0,
                detail,
                claimed
        ));

        return new BluffResponse(
                result.allowed(),
                result.reason(),
                claimed,
                against,
                result.allowed()
                        ? "Allowed — this figure is a real itemized quote in the provenance store, "
                          + "so the agent may cite it."
                        : "Refused — this figure is not in the provenance store, so the agent cannot "
                          + "cite it. Bluffing is blocked by the tool boundary, not by a prompt."
        );
    }

    @GetMapping(value = "/{id}/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@PathVariable UUID id,
                             @RequestParam(value = "afterId", required = false) Long afterId) {
        if (runRepository.findById(id).isEmpty()) {
            throw new NoSuchElementException("Run not found: " + id);
        }
        SseEmitter emitter = new SseEmitter(180_000L);
        long startAfter = afterId == null ? 0L : afterId;

        sseExecutor.execute(() -> {
            long cursor = startAfter;
            int idlePolls = 0;
            try {
                while (idlePolls < 90) {
                    List<NegotiationEvent> batch =
                            negotiationEventRepository.findByRunIdAndIdGreaterThanOrderByIdAsc(id, cursor);
                    if (batch.isEmpty()) {
                        idlePolls++;
                        Optional<Run> run = runRepository.findById(id);
                        if (run.isPresent()) {
                            Run.RunState state = run.get().getState();
                            if (state == Run.RunState.READY
                                    || state == Run.RunState.PARTIAL
                                    || state == Run.RunState.FAILED) {
                                emitter.send(SseEmitter.event().name("done").data(state.name()));
                                emitter.complete();
                                return;
                            }
                        }
                        Thread.sleep(400);
                        continue;
                    }
                    idlePolls = 0;
                    for (NegotiationEvent event : batch) {
                        emitter.send(SseEmitter.event()
                                .name("negotiation")
                                .id(String.valueOf(event.getId()))
                                .data(toDto(event)));
                        cursor = event.getId();
                    }
                }
                emitter.complete();
            } catch (IOException | InterruptedException e) {
                emitter.completeWithError(e);
                Thread.currentThread().interrupt();
            }
        });

        emitter.onTimeout(emitter::complete);
        emitter.onError(ex -> { });
        return emitter;
    }

    private QuoteDto toDto(Quote q) {
        return new QuoteDto(
                q.getClinicName(),
                q.getRound(),
                q.getOutcome().name(),
                q.total(),
                q.citable(),
                q.getLineItems().stream()
                        .map(li -> new LineItemDto(li.getLabel(), li.getAmount()))
                        .toList(),
                q.getCapturedAt()
        );
    }

    private EventDto toDto(NegotiationEvent e) {
        return new EventDto(
                e.getId(),
                e.getType().name(),
                e.getClinicName(),
                e.getRound(),
                e.getDetail(),
                e.getAmount(),
                e.getAt()
        );
    }
}
