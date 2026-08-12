package fileidea.haggleai.negotiation;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/**
 * One spoken turn in the call between HaggleAI's negotiator and a clinic.
 *
 * <p>The agents were already producing these lines — the clinic model returns a
 * {@code say} field and the negotiator returns a {@code pitch} — they simply
 * weren't being kept. Persisting them turns the event log from a list of state
 * changes into an actual transcript a person can read, which is the difference
 * between "trust me, they negotiated" and showing the negotiation.
 *
 * <p>Append-only, like {@link fileidea.haggleai.quote.Quote}: turns are the
 * record of what was said, so nothing here is ever updated.
 */
@Entity
@Table(name = "conversation_turns")
public class ConversationTurn {

    public enum Speaker {
        /** HaggleAI's negotiator, acting for the caller. */
        AGENT,
        /** The clinic's billing desk. */
        CLINIC
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private UUID runId;

    @Column(nullable = false)
    private String clinicName;

    private int round;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Speaker speaker;

    @Column(length = 2000)
    private String text;

    /** Set when the line cites a figure, so the UI can show what was on the table. */
    private Double amount;

    private Instant at = Instant.now();

    protected ConversationTurn() {
    }

    public ConversationTurn(UUID runId, String clinicName, int round, Speaker speaker,
                            String text, Double amount) {
        this.runId = runId;
        this.clinicName = clinicName;
        this.round = round;
        this.speaker = speaker;
        this.text = text;
        this.amount = amount;
    }

    public Long getId() {
        return id;
    }

    public UUID getRunId() {
        return runId;
    }

    public String getClinicName() {
        return clinicName;
    }

    public int getRound() {
        return round;
    }

    public Speaker getSpeaker() {
        return speaker;
    }

    public String getText() {
        return text;
    }

    public Double getAmount() {
        return amount;
    }

    public Instant getAt() {
        return at;
    }
}
