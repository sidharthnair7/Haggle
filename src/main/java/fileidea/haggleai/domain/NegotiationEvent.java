package fileidea.haggleai.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/**
 * One thing that happened, in order. This table is the timeline the web view
 * streams over SSE and the source the phone reads when it narrates progress
 * during the hold loop — both surfaces, one truth.
 */
@Entity
@Table(name = "negotiation_events")
public class NegotiationEvent {

    public enum Type {
        RUN_STARTED,
        CLINIC_DIALED,
        QUOTE_RECEIVED,
        PRESSED_FOR_ITEMIZATION,
        LEVERAGE_ALLOWED,
        LEVERAGE_REFUSED,
        PRICE_MOVED,
        PRICE_HELD,
        ROUND_COMPLETE,
        DEADLINE_HIT,
        RUN_COMPLETE
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private UUID runId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Type type;

    private String clinicName;

    private int round;

    @Column(length = 1000)
    private String detail;

    private Double amount;

    private Instant at = Instant.now();

    protected NegotiationEvent() {
    }

    public NegotiationEvent(UUID runId, Type type, String clinicName, int round, String detail, Double amount) {
        this.runId = runId;
        this.type = type;
        this.clinicName = clinicName;
        this.round = round;
        this.detail = detail;
        this.amount = amount;
    }

    public Long getId() {
        return id;
    }

    public UUID getRunId() {
        return runId;
    }

    public Type getType() {
        return type;
    }

    public String getClinicName() {
        return clinicName;
    }

    public int getRound() {
        return round;
    }

    public String getDetail() {
        return detail;
    }

    public Double getAmount() {
        return amount;
    }

    public Instant getAt() {
        return at;
    }
}
