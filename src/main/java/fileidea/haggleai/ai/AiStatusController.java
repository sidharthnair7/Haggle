package fileidea.haggleai.ai;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Lets you confirm which AI backends will activate once keys are in {@code .env}.
 */
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiStatusController {

    private final AiSettings settings;
    private final OpenAiChatSupport openAi;
    private final WatsonxClient watsonx;

    @GetMapping("/status")
    public Map<String, Object> status() {
        return Map.of(
                "openaiReady", openAi.available(),
                "watsonxReady", watsonx.available(),
                "clinicAgents", openAi.available() ? "llm+floor-guard" : "deterministic-fallback",
                "negotiator", openAi.available() ? "llm+leverage-gate" : "deterministic+leverage-gate",
                "spokenSummary", watsonx.available() ? "watsonx" : "deterministic-fallback",
                "hint", "Set OPENAI_API_KEY and/or WATSONX_API_KEY + WATSONX_PROJECT_ID in .env, then restart."
        );
    }
}
