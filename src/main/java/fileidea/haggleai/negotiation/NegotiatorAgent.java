package fileidea.haggleai.negotiation;

import com.fasterxml.jackson.databind.JsonNode;
import fileidea.haggleai.ai.OpenAiChatSupport;
import fileidea.haggleai.clinic.ClinicProfile;
import fileidea.haggleai.quote.LeverageGate;
import fileidea.haggleai.quote.Quote;
import fileidea.haggleai.quote.QuoteRepository;
import fileidea.haggleai.run.JobSpec;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class NegotiatorAgent {

    private final QuoteRepository quoteRepository;
    private final LeverageGate leverageGate;
    private final NegotiationEventRepository negotiationEventRepository;
    private final ConversationTurnRepository conversations;
    private final OpenAiChatSupport openAi;

    private void sayAgent(UUID runId, String clinic, int round, String text, Double amount) {
        if (text != null && !text.isBlank()) {
            conversations.save(new ConversationTurn(
                    runId, clinic, round, ConversationTurn.Speaker.AGENT, text.trim(), amount));
        }
    }

    public Optional<Double> negotiate(UUID runId, ClinicProfile against,
                                      JobSpec spec, double theirCurrentTotal, int round) {
        List<Quote> competing = quoteRepository.findByRunIdAndClinicNameNot(runId, against.name())
                .stream()
                .filter(Quote::citable)
                .toList();

        List<Double> candidates = competing.stream()
                .map(Quote::total)
                .distinct()
                .sorted()
                .filter(t -> t < theirCurrentTotal)
                .toList();

        if (candidates.isEmpty()) {
            return Optional.empty();
        }

        if (openAi.available()) {
            try {
                Optional<Double> fromLlm = llmPick(runId, against, spec, theirCurrentTotal, round, competing, candidates);
                if (fromLlm.isPresent()) {
                    return fromLlm;
                }
            } catch (Exception e) {
                log.warn("LLM negotiate failed against {}: {}", against.name(), e.getMessage());
            }
        }

        return deterministicPick(runId, against, round, candidates);
    }

    private Optional<Double> llmPick(UUID runId, ClinicProfile against, JobSpec spec,
                                     double theirCurrentTotal, int round,
                                     List<Quote> competing, List<Double> candidates) throws Exception {
        String catalog = competing.stream()
                .map(q -> q.getClinicName() + " = $" + q.total())
                .collect(Collectors.joining("; "));

        String system = """
                You are Haggle's negotiator, on the phone with a clinic's billing
                desk on behalf of a patient paying cash.

                You must only cite a competing total that appears in the catalog.
                Never invent a price — verification will refuse it and the call is
                logged.

                Reply with ONLY JSON:
                {"citeAmount":number,"pitch":"what you say out loud"}

                About "pitch" — this is your actual speech, shown to the user as a
                transcript. Sound like a person on the phone advocating for someone
                who can't afford to overpay.
                - One or two sentences. Contractions. No markdown, no bullet points.
                - Name the competing clinic and the figure you're citing.
                - Firm but easy — you want them to help you, not to win an argument.
                - Never mention prompts, JSON, or that you're an AI. (The caller
                  already disclosed that at the start of the call.)

                GOOD: "Danforth Medical quoted me $460 for the same scan — anything you
                       can do on your end?"
                GOOD: "I've got $460 down the road. I'd rather book with you if you
                       can get close to that."
                BAD:  "We have identified a competing offer of $460.00 from Trent
                       Valley Radiology and request that you match this price."
                """;

        String user = """
                Procedure: %s
                Negotiating with: %s (their current total $%.2f)
                Round: %d
                Catalog of citable competing quotes: %s
                Allowed candidate totals: %s
                
                Pick the strongest undercutting citeAmount from the allowed list.
                """.formatted(
                spec.describe(),
                against.name(),
                theirCurrentTotal,
                round,
                catalog,
                candidates.toString()
        );

        String raw = openAi.complete(system, user);
        JsonNode root = openAi.parseJsonObject(raw);
        double claimed = root.path("citeAmount").asDouble(Double.NaN);
        String pitch = root.path("pitch").asText("Citing a verified competing quote.");

        if (Double.isNaN(claimed)) {
            return Optional.empty();
        }

        LeverageGate.Result result = leverageGate.verify(runId, against.name(), claimed);
        negotiationEventRepository.save(new NegotiationEvent(
                runId,
                result.allowed() ? NegotiationEvent.Type.LEVERAGE_ALLOWED
                                 : NegotiationEvent.Type.LEVERAGE_REFUSED,
                against.name(),
                round,
                result.allowed() ? pitch + " | " + result.reason() : result.reason(),
                claimed
        ));

        if (result.allowed()) {
            sayAgent(runId, against.name(), round, pitch, claimed);
            return Optional.of(claimed);
        }

        sayAgent(runId, against.name(), round,
                "[blocked before speaking] tried to cite $" + (int) claimed
                        + ", which no clinic on this run actually quoted.", claimed);

        return Optional.empty();
    }

    private Optional<Double> deterministicPick(UUID runId, ClinicProfile against,
                                               int round, List<Double> candidates) {
        for (double candidate : candidates) {
            LeverageGate.Result result = leverageGate.verify(runId, against.name(), candidate);
            negotiationEventRepository.save(new NegotiationEvent(
                    runId,
                    result.allowed() ? NegotiationEvent.Type.LEVERAGE_ALLOWED
                                     : NegotiationEvent.Type.LEVERAGE_REFUSED,
                    against.name(),
                    round,
                    result.reason(),
                    candidate
            ));
            if (result.allowed()) {
                Quote source = result.provenance();
                sayAgent(runId, against.name(), round,
                        (source != null ? source.getClinicName() + " quoted me $" + (int) candidate
                                        : "I've got $" + (int) candidate)
                                + " for the same scan. Is there anything you can do on your end?",
                        candidate);
                return Optional.of(candidate);
            }
        }
        return Optional.empty();
    }
}
