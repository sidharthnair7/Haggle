package fileidea.haggleai.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Thin watsonx.ai REST client: IAM token + text generation.
 * Used for the caller-facing spoken summary (IBM sponsor path).
 */
@Component
public class WatsonxClient {

    private static final Logger log = LoggerFactory.getLogger(WatsonxClient.class);

    private final AiSettings settings;
    private final ObjectMapper mapper;
    private final RestClient http = RestClient.create();

    private final AtomicReference<CachedToken> token = new AtomicReference<>();

    public WatsonxClient(AiSettings settings, ObjectMapper mapper) {
        this.settings = settings;
        this.mapper = mapper;
    }

    public boolean available() {
        return settings.watsonxReady();
    }

    public String generate(String prompt, int maxTokens) {
        if (!available()) {
            throw new IllegalStateException("watsonx is not configured");
        }
        String iam = iamToken();
        String url = settings.watsonxUrl() + "/ml/v1/text/generation?version=2024-05-31";

        Map<String, Object> body = Map.of(
                "input", prompt,
                "model_id", settings.watsonxModelId(),
                "project_id", settings.watsonxProjectId(),
                "parameters", Map.of(
                        "max_new_tokens", maxTokens,
                        "temperature", 0.3,
                        "decoding_method", "greedy"
                )
        );

        String raw = http.post()
                .uri(url)
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + iam)
                .accept(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(String.class);

        try {
            JsonNode root = mapper.readTree(raw);
            JsonNode results = root.path("results");
            if (results.isArray() && !results.isEmpty()) {
                String text = results.get(0).path("generated_text").asText("").trim();
                if (!text.isBlank()) {
                    return text;
                }
            }
            throw new IllegalStateException("watsonx returned empty generation");
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("Failed to parse watsonx response", e);
        }
    }

    private String iamToken() {
        CachedToken cached = token.get();
        if (cached != null && cached.expiresAt().isAfter(Instant.now().plusSeconds(60))) {
            return cached.value();
        }
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "urn:ibm:params:oauth:grant-type:apikey");
        form.add("apikey", settings.watsonxApiKey());

        String raw = http.post()
                .uri("https://iam.cloud.ibm.com/identity/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .accept(MediaType.APPLICATION_JSON)
                .body(form)
                .retrieve()
                .body(String.class);

        try {
            JsonNode root = mapper.readTree(raw);
            String access = root.path("access_token").asText(null);
            int expiresIn = root.path("expires_in").asInt(3600);
            if (access == null || access.isBlank()) {
                throw new IllegalStateException("IAM token missing");
            }
            CachedToken next = new CachedToken(access, Instant.now().plusSeconds(expiresIn));
            token.set(next);
            return access;
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            log.warn("watsonx IAM token failed: {}", e.getMessage());
            throw new IllegalStateException("Failed to obtain IAM token", e);
        }
    }

    private record CachedToken(String value, Instant expiresAt) {
    }
}
