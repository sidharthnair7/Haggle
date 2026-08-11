package fileidea.haggleai.quote;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * A price a clinic agent committed to, at a point in time.
 *
 * <p>Quotes are <b>append-only</b>. A renegotiated price is a new row, never an
 * update — which is what makes the provenance claim checkable after the fact:
 * every figure the negotiator ever cited is still on disk with its timestamp.
 */
@Entity
@Table(name = "quotes")
public class Quote {

    public enum Outcome {
        /** A real, itemized, comparable number. Only these are citable as leverage. */
        ITEMIZED,
        /** A bundled headline with no breakdown — not comparable, not citable. */
        BUNDLED,
        /** Refused to quote by phone. Documented, not held against them. */
        DECLINED
    }

    @Id
    private UUID id = UUID.randomUUID();

    @Column(nullable = false)
    private UUID runId;

    @Column(nullable = false)
    private String clinicName;

    /** Which round produced this quote. Round 1 is the opening market. */
    private int round;

    @Enumerated(EnumType.STRING)
    private Outcome outcome;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "quote_line_items", joinColumns = @JoinColumn(name = "quote_id"))
    private List<LineItem> lineItems = new ArrayList<>();

    private Instant capturedAt = Instant.now();

    protected Quote() {
    }

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

    /** Only itemized quotes are comparable, and only comparable quotes are leverage. */
    public boolean citable() {
        return outcome == Outcome.ITEMIZED && !lineItems.isEmpty();
    }

    public UUID getId() {
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

    public Outcome getOutcome() {
        return outcome;
    }

    public List<LineItem> getLineItems() {
        return lineItems;
    }

    public Instant getCapturedAt() {
        return capturedAt;
    }
}
