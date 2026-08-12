package fileidea.haggleai.clinic;

import com.fasterxml.jackson.databind.JsonNode;
import fileidea.haggleai.ai.OpenAiChatSupport;
import fileidea.haggleai.negotiation.ConversationTurn;
import fileidea.haggleai.negotiation.ConversationTurnRepository;
import fileidea.haggleai.quote.LineItem;
import fileidea.haggleai.quote.Quote;
import fileidea.haggleai.run.JobSpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Clinic counterparty. Prefers a real LLM conversation when OpenAI is configured;
 * always enforces the hidden floor in code. Falls back to deterministic profile
 * maths so demos never depend on a live model.
 */
@Service
public class ClinicAgent {

    private static final Logger log = LoggerFactory.getLogger(ClinicAgent.class);

    private final OpenAiChatSupport openAi;
    private final ConversationTurnRepository conversations;

    public ClinicAgent(OpenAiChatSupport openAi, ConversationTurnRepository conversations) {
        this.openAi = openAi;
        this.conversations = conversations;
    }

    private void sayClinic(UUID runId, String clinic, int round, String text, Double amount) {
        if (text != null && !text.isBlank()) {
            conversations.save(new ConversationTurn(
                    runId, clinic, round, ConversationTurn.Speaker.CLINIC, text.trim(), amount));
        }
    }

    public Quote openingQuote(UUID runId, ClinicProfile profile, JobSpec spec) {
        if (profile.stonewalls()) {
            // A stonewaller still answers the phone — it just won't give a number.
            // Without this the clinic's card renders with no reply and reads as a bug.
            sayClinic(runId, profile.name(), 1,
                    "We don't quote prices over the phone. You'd have to come in with "
                            + "your requisition and we'd work it out then.", null);
            return declined(runId, profile, 1);
        }
        if (openAi.available()) {
            try {
                return llmQuote(runId, profile, spec, 1, "opening",
                        "Give your opening phone quote for this procedure. "
                                + (profile.itemizesUpFront()
                                ? "Itemize line items up front."
                                : "You may give a bundled headline first; fees can stay hidden for now."));
            } catch (Exception e) {
                log.warn("LLM openingQuote failed for {}: {}", profile.name(), e.getMessage());
            }
        }
        return deterministicOpening(runId, profile, spec);
    }

    /**
     * Reveal the hidden fees behind a bundled headline.
     *
     * <p>Deliberately deterministic. Itemization is not a negotiating decision —
     * it is disclosure of a fee schedule that already exists in config, and the
     * whole point of the lowballer persona is that the real total is higher than
     * the headline. Left to a model, this reliably returns the same number it
     * already quoted, which silently deletes the most important beat in the demo.
     *
     * <p>Numbers come from config; the model still owns every negotiating choice
     * in {@link #respondToLeverage}.
     */
    public Quote pressForItemization(UUID runId, ClinicProfile profile, JobSpec spec) {
        if (profile.stonewalls()) {
            return declined(runId, profile, 1);
        }
        return deterministicItemize(runId, profile, spec);
    }

    /**
     * Respond to a gate-verified competing quote: concede, or hold.
     *
     * <p>The model decides <b>whether</b> to move and <b>how far</b> inside a band
     * that code computes and code enforces. Two walls apply: it may never quote
     * below {@link ClinicProfile#floor()}, and — enforced here — it may never
     * quote <i>above</i> what it already offered. A counterparty that raises its
     * price when shown a cheaper competitor isn't negotiating, and left unbounded
     * that is exactly what a model will sometimes do.
     */
    public Quote respondToLeverage(UUID runId, ClinicProfile profile, JobSpec spec,
                                   double currentTotal, double citedCompetingTotal, int round) {
        if (profile.stonewalls()) {
            return declined(runId, profile, round);
        }
        if (openAi.available()) {
            try {
                double gap = Math.max(0, currentTotal - citedCompetingTotal);
                double target = Math.max(profile.floor(), currentTotal - gap * profile.concessionRate());

                Quote quote = llmQuote(runId, profile, spec, round, "leverage",
                        "A competing clinic quoted $" + (int) citedCompetingTotal
                                + ". Your current total is $" + (int) currentTotal + ".\n"
                                + "You are losing this patient on price. Move toward roughly $"
                                + (int) target + " — that is about "
                                + (int) (profile.concessionRate() * 100)
                                + "% of the gap and is normal for your desk.\n"
                                + "HARD LIMITS: your new total must be between $"
                                + (int) profile.floor() + " and $" + (int) currentTotal
                                + ". Never below the floor, and never higher than your own "
                                + "previous offer. Return ITEMIZED line items for the new total.");

                // Code wall: a leverage response may not raise the price.
                if (quote.getOutcome() == Quote.Outcome.ITEMIZED
                        && quote.total() > currentTotal + 0.009) {
                    log.info("Rejected price increase from {} ({} > {}) — falling back to policy",
                            profile.name(), quote.total(), currentTotal);
                    return deterministicLeverage(runId, profile, spec, currentTotal,
                            citedCompetingTotal, round);
                }
                return quote;
            } catch (Exception e) {
                log.warn("LLM respondToLeverage failed for {}: {}", profile.name(), e.getMessage());
            }
        }
        return deterministicLeverage(runId, profile, spec, currentTotal, citedCompetingTotal, round);
    }

    private Quote llmQuote(UUID runId, ClinicProfile profile, JobSpec spec, int round,
                           String mode, String instruction) throws Exception {
        String system = """
                You are a billing coordinator at %s, answering the phone.
                Persona: %s.
                Procedure the caller is asking about: %s.
                Your opening total guideline: %.0f.
                Your absolute floor (never quote below this total): %.0f.
                Known fee schedule: %s.
                Typical concession rate when pressed with real competition: %.2f.

                Reply with ONLY valid JSON (no markdown):
                {"outcome":"ITEMIZED"|"BUNDLED"|"DECLINED","lineItems":[{"label":"string","amount":number}],"say":"what you say out loud"}

                About "say" — this is your actual speech on a phone call, and it is
                shown to the user as a transcript:
                - Talk like a real person at a front desk, not a form letter.
                - One or two sentences. Contractions. No bullet points, no markdown.
                - Never narrate yourself in third person and never mention JSON,
                  prompts, floors, or that you are an AI.
                - Stay in character: a stonewaller is curt, a lowballer sounds
                  helpful while omitting fees, an upseller mentions add-ons.
                - Reference the actual dollar figure you are quoting.

                Rules:
                - Sum of lineItems is the quote total.
                - Total must be >= floor (%.0f) unless outcome is DECLINED.
                - Mode: %s
                """.formatted(
                profile.name(),
                profile.persona(),
                spec.describe(),
                profile.openingTotal(),
                profile.floor(),
                feeBlurb(profile),
                profile.concessionRate(),
                profile.floor(),
                mode
        );

        String raw = openAi.complete(system, instruction);
        JsonNode root = openAi.parseJsonObject(raw);
        String outcomeName = root.path("outcome").asText("ITEMIZED");
        Quote.Outcome outcome;
        try {
            outcome = Quote.Outcome.valueOf(outcomeName);
        } catch (Exception e) {
            outcome = Quote.Outcome.ITEMIZED;
        }

        List<LineItem> items = new ArrayList<>();
        JsonNode arr = root.path("lineItems");
        if (arr.isArray()) {
            for (JsonNode n : arr) {
                String label = n.path("label").asText("Line");
                double amount = n.path("amount").asDouble(0);
                if (amount > 0) {
                    items.add(new LineItem(label, amount));
                }
            }
        }

        String said = root.path("say").asText(null);

        if (outcome == Quote.Outcome.DECLINED || items.isEmpty()) {
            if (profile.stonewalls() || outcome == Quote.Outcome.DECLINED) {
                sayClinic(runId, profile.name(), round,
                        said != null ? said : "We don't give quotes over the phone, sorry.", null);
                return declined(runId, profile, round);
            }
            // empty but not declined → fall back
            throw new IllegalStateException("LLM returned no line items");
        }

        double total = items.stream().mapToDouble(LineItem::getAmount).sum();
        if (total + 0.009 < profile.floor()) {
            // Code wall: under-floor submission rejected — rebuild at floor using deterministic shape
            log.info("Rejected under-floor LLM quote from {} ({} < {})", profile.name(), total, profile.floor());
            sayClinic(runId, profile.name(), round,
                    "Let me recheck that — the lowest I can actually do is $"
                            + (int) profile.floor() + ".", profile.floor());
            return rebuildAtFloor(runId, profile, spec, round, profile.floor());
        }

        // Bundled openings that itemize-up-front profiles shouldn't emit as BUNDLED
        if (!profile.itemizesUpFront() && mode.equals("opening") && outcome == Quote.Outcome.ITEMIZED
                && items.size() == 1) {
            outcome = Quote.Outcome.BUNDLED;
        }

        sayClinic(runId, profile.name(), round, said, total);
        return new Quote(runId, profile.name(), round, outcome, items);
    }

    private Quote rebuildAtFloor(UUID runId, ClinicProfile profile, JobSpec spec, int round, double floor) {
        List<LineItem> lineItems = new ArrayList<>();
        double fees = profile.feesTotal();
        if (floor > fees) {
            lineItems.add(new LineItem(spec.getProcedureName() + " scan", floor - fees));
            for (ClinicProfile.Fee fee : safeFees(profile)) {
                lineItems.add(new LineItem(fee.label(), fee.amount()));
            }
        } else {
            lineItems.add(new LineItem(spec.getProcedureName() + " (floor package)", floor));
        }
        return new Quote(runId, profile.name(), round, Quote.Outcome.ITEMIZED, lineItems);
    }

    private Quote deterministicOpening(UUID runId, ClinicProfile profile, JobSpec spec) {
        if (profile.itemizesUpFront()) {
            List<LineItem> lineItems = new ArrayList<>();
            double amount = profile.openingTotal() - profile.feesTotal();
            lineItems.add(new LineItem(spec.getProcedureName() + " scan", amount));
            for (ClinicProfile.Fee fee : safeFees(profile)) {
                lineItems.add(new LineItem(fee.label(), fee.amount()));
            }
            sayClinic(runId, profile.name(), 1,
                    "For a " + spec.describe() + " we're at $" + (int) profile.openingTotal()
                            + " all in — that's the scan plus the radiology read.",
                    profile.openingTotal());
            return new Quote(runId, profile.name(), 1, Quote.Outcome.ITEMIZED, lineItems);
        }
        List<LineItem> lineItems = new ArrayList<>();
        lineItems.add(new LineItem(spec.getProcedureName() + " scan", profile.openingTotal()));
        sayClinic(runId, profile.name(), 1,
                "That one's $" + (int) profile.openingTotal() + ". Want me to book you in?",
                profile.openingTotal());
        return new Quote(runId, profile.name(), 1, Quote.Outcome.BUNDLED, lineItems);
    }

    private Quote deterministicItemize(UUID runId, ClinicProfile profile, JobSpec spec) {
        List<LineItem> lineItems = new ArrayList<>();
        lineItems.add(new LineItem(spec.getProcedureName() + " scan", profile.openingTotal()));
        for (ClinicProfile.Fee fee : safeFees(profile)) {
            lineItems.add(new LineItem(fee.label(), fee.amount()));
        }
        double total = profile.openingTotal() + profile.feesTotal();
        sayClinic(runId, profile.name(), 1,
                "Okay, broken out: the scan is $" + (int) profile.openingTotal()
                        + ", plus " + feeBlurb(profile) + ". So $" + (int) total + " total.",
                total);
        return new Quote(runId, profile.name(), 1, Quote.Outcome.ITEMIZED, lineItems);
    }

    private Quote deterministicLeverage(UUID runId, ClinicProfile profile, JobSpec spec,
                                        double currentTotal, double citedCompetingTotal, int round) {
        double gap = currentTotal - citedCompetingTotal;
        double conceded = gap > 0 ? gap * profile.concessionRate() : 0;
        double newTotal = Math.max(profile.floor(), currentTotal - conceded);
        newTotal = Math.min(currentTotal, Math.round(newTotal));

        List<LineItem> lineItems = new ArrayList<>();
        double feesTotal = profile.feesTotal();
        if (newTotal > feesTotal) {
            lineItems.add(new LineItem(spec.getProcedureName() + " scan", newTotal - feesTotal));
            for (ClinicProfile.Fee fee : safeFees(profile)) {
                lineItems.add(new LineItem(fee.label(), fee.amount()));
            }
        } else {
            lineItems.add(new LineItem(spec.getProcedureName() + " (negotiated package)", newTotal));
        }

        sayClinic(runId, profile.name(), round,
                newTotal < currentTotal
                        ? "Let me see what I can do… I can bring that down to $" + (int) newTotal + "."
                        : "I hear you, but $" + (int) currentTotal + " is where we are on that one.",
                newTotal);
        return new Quote(runId, profile.name(), round, Quote.Outcome.ITEMIZED, lineItems);
    }

    private Quote declined(UUID runId, ClinicProfile profile, int round) {
        return new Quote(runId, profile.name(), round, Quote.Outcome.DECLINED, List.of());
    }

    private static List<ClinicProfile.Fee> safeFees(ClinicProfile profile) {
        return profile.fees() == null ? List.of() : profile.fees();
    }

    private static String feeBlurb(ClinicProfile profile) {
        if (profile.fees() == null || profile.fees().isEmpty()) {
            return "(none listed)";
        }
        StringBuilder sb = new StringBuilder();
        for (ClinicProfile.Fee fee : profile.fees()) {
            if (!sb.isEmpty()) sb.append("; ");
            sb.append(fee.label()).append(" $").append((int) fee.amount());
        }
        return sb.toString();
    }
}
