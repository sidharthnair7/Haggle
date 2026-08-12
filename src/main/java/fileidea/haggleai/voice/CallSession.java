package fileidea.haggleai.voice;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "call_sessions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CallSession {

    @Id
    private String callSid;

    @Setter
    private UUID runId;

    private String fromNumber;

    private int pollCount;

    private Instant startedAt = Instant.now();

    @Setter
    private Instant endedAt;

    public CallSession(String callSid, String fromNumber) {
        this.callSid = callSid;
        this.fromNumber = fromNumber;
    }

    public int incrementPollCount() {
        return ++pollCount;
    }
}
