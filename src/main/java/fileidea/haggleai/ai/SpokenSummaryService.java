package fileidea.haggleai.ai;

import fileidea.haggleai.quote.Quote;
import fileidea.haggleai.quote.QuoteRepository;
import fileidea.haggleai.run.Run;
import fileidea.haggleai.run.RunRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Caller-facing spoken summary. Prefer IBM watsonx when configured (sponsor
 * prize path); otherwise a deterministic sentence so the demo never dies.
 */
@Service
public class SpokenSummaryService {

    private static final Logger log = LoggerFactory.getLogger(SpokenSummaryService.class);

    private final WatsonxClient watsonx;
    private final QuoteRepository quoteRepository;
    private final RunRepository runRepository;

    public SpokenSummaryService(WatsonxClient watsonx,
                                QuoteRepository quoteRepository,
                                RunRepository runRepository) {
        this.watsonx = watsonx;
        this.quoteRepository = quoteRepository;
        this.runRepository = runRepository;
    }

    public String summarize(UUID runId) {
        String fallback = deterministic(runId);
        if (!watsonx.available()) {
            return fallback;
        }
        try {
            Run run = runRepository.findById(runId).orElse(null);
            StringBuilder facts = new StringBuilder();
            facts.append("State: ").append(run != null ? run.getState() : "UNKNOWN").append('\n');
            if (run != null && run.getSpec() != null) {
                facts.append("Request: ").append(run.getSpec().describe()).append('\n');
            }
            Map<String, Quote> latest = latestCitable(runId);
            latest.values().stream()
                    .sorted(Comparator.comparingDouble(Quote::total))
                    .forEach(q -> facts.append("- ")
                            .append(q.getClinicName())
                            .append(": $")
                            .append((int) q.total())
                            .append(" (")
                            .append(q.getOutcome())
                            .append(")\n"));

            String prompt = """
                    You are HaggleAI, speaking to a patient on the phone.
                    Write ONE short spoken sentence (max 35 words) announcing the best clinic and price.
                    Do not invent numbers. Use only the facts below. No markdown.
                    
                    Facts:
                    %s
                    
                    Fallback if nothing usable: say you could not get a usable quote.
                    """.formatted(facts);

            String generated = watsonx.generate(prompt, 80);
            // Keep phone TTS short
            String cleaned = generated.replace('\n', ' ').trim();
            if (cleaned.length() > 280) {
                cleaned = cleaned.substring(0, 280);
            }
            return cleaned.isBlank() ? fallback : cleaned;
        } catch (Exception e) {
            log.warn("watsonx summary failed, using fallback: {}", e.getMessage());
            return fallback;
        }
    }

    public String providerLabel() {
        return watsonx.available() ? "watsonx" : "deterministic";
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
