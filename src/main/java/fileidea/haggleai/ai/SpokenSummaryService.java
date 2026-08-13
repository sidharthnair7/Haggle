package fileidea.haggleai.ai;

import fileidea.haggleai.quote.Quote;
import fileidea.haggleai.quote.QuoteRepository;
import fileidea.haggleai.run.Run;
import fileidea.haggleai.run.RunRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Writes the one sentence the caller actually hears.
 *
 * <p>Three tiers, each falling through to the next: watsonx if configured,
 * otherwise OpenAI, otherwise a deterministic template. The spoken line is on
 * the demo's critical path, so it can degrade but must never fail.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class SpokenSummaryService {

    private static final String PROMPT = """
            You are HaggleAI, speaking to a patient on the phone.
            Write ONE short spoken sentence (max 35 words) announcing the best clinic and price.
            Sound like a person, not a receipt. Do not invent numbers — use only the facts
            below. No markdown.

            Facts:
            %s

            If nothing usable is listed, say you couldn't get a quote this time.
            """;

    private final WatsonxClient watsonx;
    private final OpenAiChatSupport openAi;
    private final QuoteRepository quoteRepository;
    private final RunRepository runRepository;

    public String summarize(UUID runId) {
        String fallback = deterministic(runId);
        String prompt = PROMPT.formatted(facts(runId));

        if (watsonx.available()) {
            try {
                return clean(watsonx.generate(prompt, 80), fallback);
            } catch (Exception e) {
                log.warn("watsonx summary failed, trying OpenAI: {}", e.getMessage());
            }
        }

        if (openAi.available()) {
            try {
                return clean(openAi.complete(
                        "You write short spoken lines for a phone assistant. Reply with the "
                                + "sentence only — no quotes, no preamble.", prompt), fallback);
            } catch (Exception e) {
                log.warn("OpenAI summary failed, using template: {}", e.getMessage());
            }
        }

        return fallback;
    }

    public String providerLabel() {
        if (watsonx.available()) {
            return "watsonx";
        }
        return openAi.available() ? "openai" : "deterministic";
    }

    private String clean(String generated, String fallback) {
        if (generated == null) {
            return fallback;
        }
        String cleaned = generated.replace('\n', ' ').replace("\"", "").trim();
        if (cleaned.length() > 280) {
            cleaned = cleaned.substring(0, 280);
        }
        return cleaned.isBlank() ? fallback : cleaned;
    }

    private String facts(UUID runId) {
        Run run = runRepository.findById(runId).orElse(null);
        StringBuilder facts = new StringBuilder();
        facts.append("State: ").append(run != null ? run.getState() : "UNKNOWN").append('\n');
        if (run != null && run.getSpec() != null) {
            facts.append("Request: ").append(run.getSpec().describe()).append('\n');
        }
        latestCitable(runId).values().stream()
                .sorted(Comparator.comparingDouble(Quote::total))
                .forEach(q -> facts.append("- ")
                        .append(q.getClinicName())
                        .append(": $")
                        .append((int) q.total())
                        .append(" (")
                        .append(q.getOutcome())
                        .append(")\n"));
        return facts.toString();
    }

    private String deterministic(UUID runId) {
        Map<String, Quote> latest = latestCitable(runId);
        if (latest.isEmpty()) {
            return "I couldn't get a usable quote this time. Check the web app for details.";
        }
        Quote best = latest.values().stream()
                .min(Comparator.comparingDouble(Quote::total))
                .orElseThrow();
        return "Best option is " + best.getClinicName()
                + " at " + ((int) best.total()) + " dollars. Full breakdown is in your web app.";
    }

    private Map<String, Quote> latestCitable(UUID runId) {
        Map<String, Quote> latest = new LinkedHashMap<>();
        quoteRepository.findByRunIdOrderByCapturedAtAsc(runId).stream()
                .filter(Quote::citable)
                .forEach(q -> latest.put(q.getClinicName(), q));
        return latest;
    }
}
