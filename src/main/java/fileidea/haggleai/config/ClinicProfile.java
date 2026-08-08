package fileidea.haggleai.config;

import java.util.List;

/**
 * A counterparty's hidden hand, loaded from {@code clinics.yaml}.
 *
 * <p>This object is <b>never</b> serialized to the negotiator, never logged to
 * the web view, and never placed in the negotiator's prompt. It goes into the
 * clinic agent's system prompt and into the tool-level floor check. That
 * asymmetry is what makes the negotiation real rather than theatre.
 */
public record ClinicProfile(
        String name,
        Persona persona,
        double openingTotal,
        double floor,
        double concessionRate,
        List<Fee> fees,
        boolean itemizesUpFront
) {

    public enum Persona {
        /** Quotes fair, itemizes willingly, concedes moderately. */
        STRAIGHT_SHOOTER,
        /** Attractive headline number that hides fees until pressed. */
        LOWBALLER_HIDDEN_FEES,
        /** Opens high, pads with add-ons, but has real room to move. */
        HARD_SELL_UPSELLER,
        /** Won't quote by phone at all. Documented, not punished. */
        STONEWALLER
    }

    public record Fee(String label, double amount) {
    }

    public double feesTotal() {
        return fees == null ? 0 : fees.stream().mapToDouble(Fee::amount).sum();
    }

    /** True when this clinic will never produce a citable number. */
    public boolean stonewalls() {
        return persona == Persona.STONEWALLER;
    }
}
