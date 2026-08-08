package fileidea.haggleai.core;

import fileidea.haggleai.domain.JobSpec;
import fileidea.haggleai.domain.Run;

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
public class RunService {

    /** Creates the run, kicks off the orchestrator asynchronously, returns at once. */
    public Run start(JobSpec spec, boolean leverageEnabled) {
        throw new UnsupportedOperationException("yours to write");
    }

    /** One speakable sentence describing where this run is right now. */
    public String statusFor(UUID runId) {
        throw new UnsupportedOperationException("yours to write");
    }

    /** True when the caller can be given an answer — READY or PARTIAL. */
    public boolean answerable(UUID runId) {
        throw new UnsupportedOperationException("yours to write");
    }
}
