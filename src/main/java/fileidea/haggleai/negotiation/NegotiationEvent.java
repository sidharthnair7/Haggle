package fileidea.haggleai.negotiation;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "negotiation_events")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
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

    public NegotiationEvent(UUID runId, Type type, String clinicName, int round, String detail, Double amount) {
        this.runId = runId;
        this.type = type;
        this.clinicName = clinicName;
        this.round = round;
        this.detail = detail;
        this.amount = amount;
    }
}
