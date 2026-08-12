package fileidea.haggleai.clinic;

import java.util.List;

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
        STRAIGHT_SHOOTER,
        LOWBALLER_HIDDEN_FEES,
        HARD_SELL_UPSELLER,
        STONEWALLER,
        REFUSES_AI_CALLERS
    }

    public record Fee(String label, double amount) {
    }

    public double feesTotal() {
        return fees == null ? 0 : fees.stream().mapToDouble(Fee::amount).sum();
    }

    public boolean stonewalls() {
        return persona == Persona.STONEWALLER || persona == Persona.REFUSES_AI_CALLERS;
    }

    public boolean refusesAiCallers() {
        return persona == Persona.REFUSES_AI_CALLERS;
    }
}
