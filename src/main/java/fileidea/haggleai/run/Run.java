package fileidea.haggleai.run;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "runs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Run {

    public enum RunState {
        CREATED,
        SHOPPING,
        NEGOTIATING,
        READY,
        PARTIAL,
        FAILED
    }

    @Id
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Setter
    private RunState state = RunState.CREATED;

    @Embedded
    private JobSpec spec;

    @Setter
    private int round;

    private Instant deadline;

    private Instant createdAt = Instant.now();

    @Setter
    private Instant completedAt;

    @Setter
    private boolean leverageEnabled = true;

    public Run(UUID id, JobSpec spec, Instant deadline) {
        this.id = id;
        this.spec = spec;
        this.deadline = deadline;
    }

    public boolean expired() {
        return deadline != null && Instant.now().isAfter(deadline);
    }
}
