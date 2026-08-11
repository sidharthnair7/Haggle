package fileidea.haggleai.run;

import fileidea.haggleai.negotiation.NegotiationOrchestrator;
import fileidea.haggleai.quote.QuoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * ★ YOURS — the state machine both channels read.
 *
 * <p>Small class, load-bearing. The phone's hold loop asks it "are we there
 * yet?", the SSE stream asks it "what changed?", and the orchestrator is the
 * only thing that drives transitions. Getting this wrong shows up as a caller
 * stuck on hold forever.
 *
 * <h2>Legal transitions</h2>
 * <pre>
 * CREATED → SHOPPING → NEGOTIATING → READY
 *              ↓            ↓
 *           PARTIAL      PARTIAL     (deadline hit, but quotes exist)
 *              ↓            ↓
 *           FAILED       FAILED      (nothing usable at all)
 * </pre>
 *
 * <h2>What to build</h2>
 * <ol>
 *   <li>{@code start} — persist the run with a deadline of
 *       {@code now + haggle.run.deadline-seconds}, hand it to the orchestrator
 *       on a background thread, and return <b>immediately</b>. The phone webhook
 *       is on a 15-second budget; it cannot wait here.</li>
 *   <li>{@code statusFor} — a short, speakable sentence built from live state.
 *       This is what the hold loop says out loud, so it has to sound like a
 *       person: "two clinics have quoted, best so far is $340".</li>
 *   <li>Enforce transitions. An illegal one should throw, not silently pass —
 *       you want to find that bug in a test, not on a call.</li>
 * </ol>
 *
 * <h2>Think about</h2>
 * PARTIAL is the state that makes the product feel good instead of broken. It's
 * tempting to skip it and go straight to FAILED — don't. Partial results beat
 * error messages, and this is where that's implemented.
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

    /** One speakable sentence describing where this run is right now. */
    public String statusFor(UUID runId) {
        Optional<Run> run = runRepository.findById(runId);
        if(run.isEmpty()) {
            return "I couldn't find this run";
        }
        Run realRun = run.get();
        switch (realRun.getState()){
            case CREATED -> {
                return "It is running right now, please wait a moment";
            }
            case SHOPPING ->  {
                return "Agents are calling the clinics right now to get the prices";
            }
            case NEGOTIATING -> {
                return "Currently negotiating the prices so that the prices can go down";
            }
            case READY -> {
                return "Agents are done negotiating and there is a lower price compared to others";
            }
            case PARTIAL -> {
                return "Some of the Agents got a proper response back and there are some reasonable prices";
            }
            case FAILED -> {
                return "None of the Agents got a reply back";
            }
        }
        return null;
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
