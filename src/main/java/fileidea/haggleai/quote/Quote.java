package fileidea.haggleai.quote;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "quotes")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Quote {

    public enum Outcome {
        ITEMIZED,
        BUNDLED,
        DECLINED
    }

    @Id
    private UUID id = UUID.randomUUID();

    @Column(nullable = false)
    private UUID runId;

    @Column(nullable = false)
    private String clinicName;

    private int round;

    @Enumerated(EnumType.STRING)
    private Outcome outcome;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "quote_line_items", joinColumns = @JoinColumn(name = "quote_id"))
    private List<LineItem> lineItems = new ArrayList<>();

    private Instant capturedAt = Instant.now();

    public Quote(UUID runId, String clinicName, int round, Outcome outcome, List<LineItem> lineItems) {
        this.runId = runId;
        this.clinicName = clinicName;
        this.round = round;
        this.outcome = outcome;
        this.lineItems = lineItems == null ? new ArrayList<>() : new ArrayList<>(lineItems);
    }

    public double total() {
        return lineItems.stream().mapToDouble(LineItem::getAmount).sum();
    }

    public boolean citable() {
        return outcome == Outcome.ITEMIZED && !lineItems.isEmpty();
    }
}
