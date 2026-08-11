package fileidea.haggleai.clinic;

import fileidea.haggleai.quote.LineItem;
import fileidea.haggleai.quote.Quote;
import fileidea.haggleai.run.JobSpec;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * The counterparty. Deterministic v1: behaviour comes from {@link ClinicProfile}
 * (persona, opening total, hidden floor, concession rate) — no LLM call yet.
 * When the LLM version lands, only the internals of these methods change; the
 * orchestrator contract stays identical.
 */
@Service
public class ClinicAgent {

   //round 1
    public Quote openingQuote(UUID runId, ClinicProfile profile, JobSpec spec) {
        if(profile.stonewalls()){
            return new Quote(runId,profile.name(),1, Quote.Outcome.DECLINED, List.of());
        }
        if(profile.itemizesUpFront()){
            List<LineItem> lineItems = new ArrayList<>();
            double amount = profile.openingTotal() - profile.feesTotal();
            lineItems.add(new LineItem(spec.getProcedureName()+ " scan",amount));
            for (ClinicProfile.Fee fee : profile.fees()) {
                lineItems.add(new LineItem(fee.label(), fee.amount()));
            }
            return new Quote(runId, profile.name(), 1, Quote.Outcome.ITEMIZED, lineItems);
        }
        List<LineItem> lineItems = new ArrayList<>();
        lineItems.add(new LineItem(spec.getProcedureName() + " scan", profile.openingTotal()));
        return new Quote(runId, profile.name(), 1, Quote.Outcome.BUNDLED, lineItems);

    }

    /**
     * When a bundled headline needs breaking down before it's comparable.
     *
     * <p>The hidden-fee reveal: the headline number was only the scan. Pressed
     * for itemization, the real total is headline + every fee they didn't
     * mention. This is the "red flag" moment the UI shows.
     */
    public Quote pressForItemization(UUID runId, ClinicProfile profile, JobSpec spec) {
        if (profile.stonewalls()) {
            return new Quote(runId, profile.name(), 1, Quote.Outcome.DECLINED, List.of());
        }
        List<LineItem> lineItems = new ArrayList<>();
        lineItems.add(new LineItem(spec.getProcedureName() + " scan", profile.openingTotal()));
        for (ClinicProfile.Fee fee : profile.fees()) {
            lineItems.add(new LineItem(fee.label(), fee.amount()));
        }
        return new Quote(runId, profile.name(), 1, Quote.Outcome.ITEMIZED, lineItems);
    }

    /**
     * Round 2+: the negotiator has cited a verified competing total. Concede
     * {@code concessionRate} of the gap — but never below {@link ClinicProfile#floor()}.
     * The floor is enforced here in code, not hoped for in a prompt.
     */
    public Quote respondToLeverage(UUID runId, ClinicProfile profile, JobSpec spec,
                                   double currentTotal, double citedCompetingTotal, int round) {
        if (profile.stonewalls()) {
            return new Quote(runId, profile.name(), round, Quote.Outcome.DECLINED, List.of());
        }

        double gap = currentTotal - citedCompetingTotal;
        double conceded = gap > 0 ? gap * profile.concessionRate() : 0;
        double newTotal = Math.max(profile.floor(), currentTotal - conceded);
        newTotal = Math.min(currentTotal, Math.round(newTotal)); // whole dollars, never up

        List<LineItem> lineItems = new ArrayList<>();
        double feesTotal = profile.feesTotal();
        if (newTotal > feesTotal) {
            lineItems.add(new LineItem(spec.getProcedureName() + " scan", newTotal - feesTotal));
            for (ClinicProfile.Fee fee : profile.fees()) {
                lineItems.add(new LineItem(fee.label(), fee.amount()));
            }
        } else {
            lineItems.add(new LineItem(spec.getProcedureName() + " (negotiated package)", newTotal));
        }
        return new Quote(runId, profile.name(), round, Quote.Outcome.ITEMIZED, lineItems);
    }
}
