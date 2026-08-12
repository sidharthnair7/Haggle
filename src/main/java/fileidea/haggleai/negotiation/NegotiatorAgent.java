package fileidea.haggleai.negotiation;

import com.fasterxml.jackson.databind.JsonNode;
import fileidea.haggleai.ai.OpenAiChatSupport;
import fileidea.haggleai.clinic.ClinicProfile;
import fileidea.haggleai.quote.LeverageGate;
import fileidea.haggleai.quote.Quote;
import fileidea.haggleai.quote.QuoteRepository;
import fileidea.haggleai.run.JobSpec;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Buyer-side agent. May use an LLM to pick which competing figure to press with,
 * but every figure still passes through {@link LeverageGate} — the wall is code,
 * not a prompt instruction.
 */
@Service
@RequiredArgsConstructor
public class NegotiatorAgent {

    private static final Logger log = LoggerFactory.getLogger(NegotiatorAgent.class);

    private final QuoteRepository quoteRepository;
    private final LeverageGate leverageGate;
    private final NegotiationEventRepository negotiationEventRepository;
    private final OpenAiChatSupport openAi;

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
                You are HaggleAI's buyer negotiator.
                You must only cite a competing total that appears in the catalog.
                Never invent a price. If you invent one, verification will refuse it.
                
                Reply with ONLY JSON:
                {"citeAmount":number,"pitch":"one short sentence to the clinic"}
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
            return Optional.of(claimed);
        }

        // Refused. Return empty and let negotiate() run the deterministic fallback
        // exactly once — calling it here as well would re-run the gate over every
        // candidate and emit a duplicate REFUSED event for each one.
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
                return Optional.of(candidate);
            }
        }
        return Optional.empty();
    }
}
