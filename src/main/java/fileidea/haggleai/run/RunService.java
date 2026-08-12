package fileidea.haggleai.run;

import fileidea.haggleai.negotiation.NegotiationOrchestrator;
import fileidea.haggleai.quote.Quote;
import fileidea.haggleai.quote.QuoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.OptionalDouble;
import java.util.UUID;

/**
 * The run state machine that both channels read.
 *
 * <p>The phone's hold loop asks it "are we there yet?", the SSE stream asks it
 * "what changed?", and the orchestrator is the only thing that drives
 * transitions. One source of truth, two surfaces.
 *
 * <h2>Transitions</h2>
 * <pre>
 * CREATED → SHOPPING → NEGOTIATING → READY
 *              ↓            ↓
 *           PARTIAL      PARTIAL     (deadline hit, but quotes exist)
 *              ↓            ↓
 *           FAILED       FAILED      (nothing usable at all)
 * </pre>
 *
 * <p>PARTIAL is what makes a slow run feel like a product rather than an
 * outage: partial results beat error messages, and this is where that lives.
 */
@Service
@RequiredArgsConstructor
public class RunService {
    private final RunRepository runRepository;
    private final QuoteRepository quoteRepository;
    private final NegotiationOrchestrator negotiationOrchestrator;

    @Value("${haggle.run.deadline-seconds:25}")
    private int deadlineSeconds;

    /** Creates the run, kicks off the orchestrator asynchronously, returns at once. */
    public Run start(JobSpec spec, boolean leverageEnabled) {
        UUID uuid = UUID.randomUUID();
        Instant deadline = Instant.now().plusSeconds(deadlineSeconds);
        Run run = new Run(uuid,spec,deadline);
        run.setLeverageEnabled(leverageEnabled);
        Run saved = runRepository.save(run);
        Thread.startVirtualThread(() -> negotiationOrchestrator.execute(saved.getId()));
        return saved;
    }

    /**
     * One speakable sentence describing where this run is right now.
     *
     * <p>This is what the caller hears on every hold-loop poll, so it reports
     * <b>live numbers</b>, not state names. "Two clinics have quoted, best so far
     * is $340" is the difference between a caller who believes something is
     * happening and one who thinks the line went dead — and the figures come from
     * the same store the web view reads, so the two surfaces can never disagree.
     */
    public String statusFor(UUID runId) {
        Optional<Run> run = runRepository.findById(runId);
        if (run.isEmpty()) {
            return "I couldn't find that request.";
        }

        List<Quote> citable = quoteRepository.findByRunIdOrderByCapturedAtAsc(runId).stream()
                .filter(Quote::citable)
                .toList();
        long clinicsQuoted = citable.stream().map(Quote::getClinicName).distinct().count();
        OptionalDouble best = citable.stream().mapToDouble(Quote::total).min();
        String bestSoFar = best.isPresent()
                ? ", best so far is $" + (int) best.getAsDouble()
                : "";

        return switch (run.get().getState()) {
            case CREATED -> "Getting started.";
            case SHOPPING -> clinicsQuoted == 0
                    ? "Still calling clinics."
                    : clinicsQuoted + (clinicsQuoted == 1 ? " clinic has" : " clinics have")
                        + " quoted" + bestSoFar + ".";
            case NEGOTIATING -> "Negotiating now" + bestSoFar
                    + ". Pressing them with each other's prices.";
            case READY -> "All done.";
            case PARTIAL -> "Wrapping up with what I've got" + bestSoFar + ".";
            case FAILED -> "I'm having trouble reaching clinics right now.";
        };
    }

    /** True when the caller can be given an answer — READY or PARTIAL. */
    public boolean answerable(UUID runId) {

      Optional<Run> run = runRepository.findById(runId);
      if (run.isEmpty()) {
          return false;
      }

      Run actual=  run.get();
      return actual.getState() == Run.RunState.READY || actual.getState() == Run.RunState.PARTIAL;
    }
}
