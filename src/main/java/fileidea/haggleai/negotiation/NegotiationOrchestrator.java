package fileidea.haggleai.negotiation;

import fileidea.haggleai.clinic.ClinicAgent;
import fileidea.haggleai.clinic.ClinicConfigService;
import fileidea.haggleai.clinic.ClinicProfile;
import fileidea.haggleai.quote.Quote;
import fileidea.haggleai.quote.QuoteRepository;
import fileidea.haggleai.run.Run;
import fileidea.haggleai.run.RunRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Bulk Synchronous Parallel negotiation: round 1 shops in parallel (sequential
 * here for simplicity), then rounds 2+ cite verified leverage until prices stop
 * moving or the deadline hits.
 */
@Service
@RequiredArgsConstructor
public class NegotiationOrchestrator {

    private final RunRepository runRepository;
    private final QuoteRepository quoteRepository;
    private final NegotiationEventRepository negotiationEventRepository;
    private final ClinicConfigService clinicConfigService;
    private final ClinicAgent clinicAgent;
    private final NegotiatorAgent negotiatorAgent;

    @Value("${haggle.run.max-rounds:3}")
    private int maxRounds;

    public void execute(UUID runId) {
        Optional<Run> runOpt = runRepository.findById(runId);
        if (runOpt.isEmpty()) {
            return;
        }
        Run run = runOpt.get();

        try {
            shopRound1(run);
            if (run.expired()) {
                finishPartialOrFailed(run);
                return;
            }

            itemizeBundled(run);
            if (run.expired()) {
                finishPartialOrFailed(run);
                return;
            }

            if (!run.isLeverageEnabled()) {
                finishReadyOrFailed(run);
                return;
            }

            negotiateRounds(run);
            finishReadyOrFailed(run);
        } catch (Exception e) {
            run.setState(hasCitable(runId) ? Run.RunState.PARTIAL : Run.RunState.FAILED);
            run.setCompletedAt(Instant.now());
            runRepository.save(run);
            emit(runId, NegotiationEvent.Type.RUN_COMPLETE, null, run.getRound(),
                    "Run ended with error: " + e.getMessage(), null);
        }
    }

    private void shopRound1(Run run) {
        UUID runId = run.getId();
        run.setState(Run.RunState.SHOPPING);
        run.setRound(1);
        runRepository.save(run);
        emit(runId, NegotiationEvent.Type.RUN_STARTED, null, 1, "Shopping started", null);

        for (ClinicProfile clinic : clinicConfigService.forRun()) {
            if (run.expired()) {
                break;
            }
            emit(runId, NegotiationEvent.Type.CLINIC_DIALED, clinic.name(), 1,
                    "Calling " + clinic.name(), null);
            Quote quote = clinicAgent.openingQuote(runId, clinic, run.getSpec());
            quoteRepository.save(quote);
            emit(runId, NegotiationEvent.Type.QUOTE_RECEIVED, clinic.name(), 1,
                    quote.getOutcome().name(),
                    quote.citable() || quote.getOutcome() == Quote.Outcome.BUNDLED
                            ? quote.total() : null);
        }
        emit(runId, NegotiationEvent.Type.ROUND_COMPLETE, null, 1, "Round 1 complete", null);
    }

    /** Reveal fees on BUNDLED quotes so they become citable leverage. */
    private void itemizeBundled(Run run) {
        UUID runId = run.getId();
        Map<String, Quote> latestByClinic = latestQuotes(runId);

        for (Map.Entry<String, Quote> entry : latestByClinic.entrySet()) {
            if (run.expired()) {
                break;
            }
            Quote latest = entry.getValue();
            if (latest.getOutcome() != Quote.Outcome.BUNDLED) {
                continue;
            }
            Optional<ClinicProfile> profile = clinicConfigService.byName(entry.getKey());
            if (profile.isEmpty()) {
                continue;
            }
            emit(runId, NegotiationEvent.Type.PRESSED_FOR_ITEMIZATION, entry.getKey(), 1,
                    "Pressed for itemization", latest.total());
            Quote itemized = clinicAgent.pressForItemization(runId, profile.get(), run.getSpec());
            quoteRepository.save(itemized);
            emit(runId, NegotiationEvent.Type.QUOTE_RECEIVED, entry.getKey(), 1,
                    itemized.getOutcome().name(),
                    itemized.citable() ? itemized.total() : null);
        }
    }

    private void negotiateRounds(Run run) {
        UUID runId = run.getId();
        for (int round = 2; round <= maxRounds; round++) {
            if (run.expired()) {
                break;
            }
            run.setState(Run.RunState.NEGOTIATING);
            run.setRound(round);
            runRepository.save(run);

            boolean anyMoved = false;
            Map<String, Quote> latestByClinic = latestQuotes(runId);

            for (ClinicProfile clinic : clinicConfigService.forRun()) {
                if (run.expired()) {
                    break;
                }
                Quote theirs = latestByClinic.get(clinic.name());
                if (theirs == null || !theirs.citable()) {
                    continue;
                }
                double theirTotal = theirs.total();
                Optional<Double> cited = negotiatorAgent.negotiate(
                        runId, clinic, run.getSpec(), theirTotal, round);
                if (cited.isEmpty()) {
                    continue;
                }

                Quote response = clinicAgent.respondToLeverage(
                        runId, clinic, run.getSpec(), theirTotal, cited.get(), round);
                quoteRepository.save(response);

                boolean moved = response.citable() && response.total() < theirTotal - 0.01;
                emit(runId,
                        moved ? NegotiationEvent.Type.PRICE_MOVED : NegotiationEvent.Type.PRICE_HELD,
                        clinic.name(),
                        round,
                        moved
                                ? "Moved from $" + (int) theirTotal + " to $" + (int) response.total()
                                : "Held at $" + (int) theirTotal,
                        response.citable() ? response.total() : theirTotal);
                if (moved) {
                    anyMoved = true;
                }
            }

            emit(runId, NegotiationEvent.Type.ROUND_COMPLETE, null, round,
                    "Round " + round + " complete", null);
            if (!anyMoved) {
                break;
            }
        }
    }

    private Map<String, Quote> latestQuotes(UUID runId) {
        Map<String, Quote> latest = new HashMap<>();
        List<Quote> all = quoteRepository.findByRunIdOrderByCapturedAtAsc(runId);
        for (Quote q : all) {
            latest.put(q.getClinicName(), q); // later overwrites earlier
        }
        return latest;
    }

    private void finishReadyOrFailed(Run run) {
        if (run.expired()) {
            finishPartialOrFailed(run);
            return;
        }
        boolean ok = hasCitable(run.getId());
        run.setState(ok ? Run.RunState.READY : Run.RunState.FAILED);
        run.setCompletedAt(Instant.now());
        runRepository.save(run);
        emit(run.getId(), NegotiationEvent.Type.RUN_COMPLETE, null, run.getRound(),
                ok ? "Run complete" : "Run failed — no citable quotes", null);
    }

    private void finishPartialOrFailed(Run run) {
        emit(run.getId(), NegotiationEvent.Type.DEADLINE_HIT, null, run.getRound(),
                "Deadline hit", null);
        boolean ok = hasCitable(run.getId());
        run.setState(ok ? Run.RunState.PARTIAL : Run.RunState.FAILED);
        run.setCompletedAt(Instant.now());
        runRepository.save(run);
        emit(run.getId(), NegotiationEvent.Type.RUN_COMPLETE, null, run.getRound(),
                ok ? "Partial result — deadline expired" : "Run failed — no citable quotes", null);
    }

    private boolean hasCitable(UUID runId) {
        return quoteRepository.findByRunIdOrderByCapturedAtAsc(runId).stream()
                .anyMatch(Quote::citable);
    }

    private void emit(UUID runId, NegotiationEvent.Type type, String clinic,
                      int round, String detail, Double amount) {
        negotiationEventRepository.save(
                new NegotiationEvent(runId, type, clinic, round, detail, amount));
    }
}
