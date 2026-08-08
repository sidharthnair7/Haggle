package fileidea.haggleai.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/**
 * One negotiation run. Both channels — phone and web — create one of these,
 * and everything else in the system hangs off its id.
 *
 * <p>{@link RunState} is what the phone hold loop and the SSE stream both read.
 * Keeping it in the database rather than in memory is deliberate: an app restart
 * mid-call shouldn't orphan a live caller.
 */
@Entity
@Table(name = "runs")
public class Run {

    public enum RunState {
        /** Created, nothing dialled yet. */
        CREATED,
        /** Round 1 — clinic agents gathering opening quotes in parallel. */
        SHOPPING,
        /** Round 2+ — negotiator calling back with cited leverage. */
        NEGOTIATING,
        /** Finished normally; a winner exists. */
        READY,
        /** Deadline expired with at least one quote — partial answer available. */
        PARTIAL,
        /** Nothing usable. The only state that becomes an apology on the phone. */
        FAILED
    }

    @Id
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RunState state = RunState.CREATED;

    @Embedded
    private JobSpec spec;

    /** Which round the orchestrator is on. Drives the phone's status narration. */
    private int round;

    /** Wall-clock deadline. Past this, whatever exists IS the answer. */
    private Instant deadline;

    private Instant createdAt = Instant.now();
    private Instant completedAt;

    /** Set false to run the control experiment: same code, no leverage, prices hold. */
    private boolean leverageEnabled = true;

    protected Run() {
    }

    public Run(UUID id, JobSpec spec, Instant deadline) {
        this.id = id;
        this.spec = spec;
        this.deadline = deadline;
    }

    public boolean expired() {
        return deadline != null && Instant.now().isAfter(deadline);
    }

    public UUID getId() {
        return id;
    }

    public RunState getState() {
        return state;
    }

    public void setState(RunState state) {
        this.state = state;
    }

    public JobSpec getSpec() {
        return spec;
    }

    public int getRound() {
        return round;
    }

    public void setRound(int round) {
        this.round = round;
    }

    public Instant getDeadline() {
        return deadline;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(Instant completedAt) {
        this.completedAt = completedAt;
    }

    public boolean isLeverageEnabled() {
        return leverageEnabled;
    }

    public void setLeverageEnabled(boolean leverageEnabled) {
        this.leverageEnabled = leverageEnabled;
    }
}
