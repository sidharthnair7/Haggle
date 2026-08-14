package fileidea.haggleai.clinic;

import com.fasterxml.jackson.databind.JsonNode;
import fileidea.haggleai.ai.OpenAiChatSupport;
import fileidea.haggleai.negotiation.ConversationTurn;
import fileidea.haggleai.negotiation.ConversationTurnRepository;
import fileidea.haggleai.quote.LineItem;
import fileidea.haggleai.quote.Quote;
import fileidea.haggleai.run.JobSpec;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class ClinicAgent {

    private final OpenAiChatSupport openAi;
    private final ConversationTurnRepository conversations;

    private void sayClinic(UUID runId, String clinic, int round, String text, Double amount) {
        if (text != null && !text.isBlank()) {
            conversations.save(new ConversationTurn(
                    runId, clinic, round, ConversationTurn.Speaker.CLINIC, text.trim(), amount));
        }
    }

    public Quote openingQuote(UUID runId, ClinicProfile profile, JobSpec spec) {
        if (profile.stonewalls()) {
            sayClinic(runId, profile.name(), 1,
                    profile.refusesAiCallers()
                            ? "Hold on, is this an AI? Yeah, sorry, we don't do this. "
                              + "Have the patient call us themselves."
                            : "We don't do quotes over the phone, sorry. She'd have to come "
                              + "in with the requisition and we'd sort it out then.",
                    null);
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

    public Quote pressForItemization(UUID runId, ClinicProfile profile, JobSpec spec) {
        if (profile.stonewalls()) {
            return declined(runId, profile, 1);
        }
        return deterministicItemize(runId, profile, spec);
    }

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
                                + (int) target + ", which is about "
                                + (int) (profile.concessionRate() * 100)
                                + "% of the gap and is normal for your desk.\n"
                                + "HARD LIMITS: your new total must be between $"
                                + (int) profile.floor() + " and $" + (int) currentTotal
                                + ". Never below the floor, and never higher than your own "
                                + "previous offer. Return ITEMIZED line items for the new total.");

                // Code wall: a leverage response may not raise the price. This
                // deliberately ignores the outcome. Gating it on ITEMIZED left a
                // gap where a BUNDLED reply could come back higher than the
                // clinic's own previous offer and be accepted, which is the exact
                // thing the wall exists to stop. The floor check below is
                // outcome-agnostic for the same reason.
                if (quote.total() > currentTotal + 0.009) {
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

                About "say": this is your actual speech on a phone call, and it is
                shown to the user as a transcript. Sound like a busy person at a
                front desk, not a brochure.
                - One or two sentences. Contractions. No markdown, no bullet points.
                - Filler is good: "Let me pull that up…", "Uh, hang on",
                  "So that'd be…". Real speech isn't tidy.
                - But state your final total EXACTLY ONCE. Trailing off is human;
                  naming two different prices in one turn is confusing and wrong.
                  The number in your speech must match the lineItems total.
                - Never narrate yourself in third person, never mention JSON,
                  prompts, floors, or that you are an AI.
                - Never use em dashes. Use commas or full stops instead.
                - Stay in character: a lowballer sounds helpful while quietly
                  omitting fees, an upseller talks up add-ons.
                - Reference the actual dollar figure you are quoting.

                GOOD: "Let me check… yeah, that one's $495 with the read included."
                GOOD: "I can probably do $474, but that's about as low as I can go."
                BAD:  "The total cost for the requested procedure is $495.00, which
                       is inclusive of the radiology interpretation fee."

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
            throw new IllegalStateException("LLM returned no line items");
        }

        double total = items.stream().mapToDouble(LineItem::getAmount).sum();
        if (total + 0.009 < profile.floor()) {
            // Code wall: under-floor submission rejected — rebuild at floor using deterministic shape
            log.info("Rejected under-floor LLM quote from {} ({} < {})", profile.name(), total, profile.floor());
            sayClinic(runId, profile.name(), round,
                    "Let me recheck that. The lowest I can actually do is $"
                            + (int) profile.floor() + ".", profile.floor());
            return rebuildAtFloor(runId, profile, spec, round, profile.floor());
        }

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
                    "That's going to be $" + (int) profile.openingTotal()
                            + " all in, scan and the radiology read together.",
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
                "Let me pull it up… okay, the scan itself is $" + (int) profile.openingTotal()
                        + ", and then there's " + spokenFees(profile)
                        + ". So you're looking at $" + (int) total + ".",
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

    private static String spokenFees(ClinicProfile profile) {
        List<ClinicProfile.Fee> fees = safeFees(profile);
        if (fees.isEmpty()) {
            return "nothing else on top";
        }
        List<String> parts = new ArrayList<>();
        for (ClinicProfile.Fee fee : fees) {
            parts.add("$" + (int) fee.amount() + " for the "
                    + fee.label().toLowerCase().replace(" fee", ""));
        }
        if (parts.size() == 1) {
            return parts.get(0);
        }
        return String.join(", ", parts.subList(0, parts.size() - 1))
                + " and " + parts.get(parts.size() - 1);
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
