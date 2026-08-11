package fileidea.haggleai.voice;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/**
 * Binds a Twilio call to a run.
 *
 * <p>Twilio is stateless between webhooks — every request hands you a
 * {@code CallSid} and nothing else. This is the lookup that turns that back
 * into context. It lives in the database rather than a {@code Map} because an
 * in-memory version dies exactly once: the time the app restarts mid-demo.
 */
@Entity
@Table(name = "call_sessions")
public class CallSession {

    @Id
    private String callSid;

    private UUID runId;

    private String fromNumber;

    /** How many times the hold loop has re-entered. Guards against endless holds. */
    private int pollCount;

    private Instant startedAt = Instant.now();
    private Instant endedAt;

    protected CallSession() {
    }

    public CallSession(String callSid, String fromNumber) {
        this.callSid = callSid;
        this.fromNumber = fromNumber;
    }

    public String getCallSid() {
        return callSid;
    }

    public UUID getRunId() {
        return runId;
    }

    public void setRunId(UUID runId) {
        this.runId = runId;
    }

    public String getFromNumber() {
        return fromNumber;
    }

    public int getPollCount() {
        return pollCount;
    }

    public int incrementPollCount() {
        return ++pollCount;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public void setEndedAt(Instant endedAt) {
        this.endedAt = endedAt;
    }
}
