package fileidea.haggleai.negotiation;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "conversation_turns")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ConversationTurn {

    public enum Speaker {
        AGENT,
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

    private Double amount;

    private Instant at = Instant.now();

    public ConversationTurn(UUID runId, String clinicName, int round, Speaker speaker,
                            String text, Double amount) {
        this.runId = runId;
        this.clinicName = clinicName;
        this.round = round;
        this.speaker = speaker;
        this.text = text;
        this.amount = amount;
    }
}
