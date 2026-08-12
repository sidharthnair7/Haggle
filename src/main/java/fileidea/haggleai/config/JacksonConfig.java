package fileidea.haggleai.config;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Supplies a Jackson 2 {@link ObjectMapper}.
 *
 * <p>Spring Boot 4 moved its own serialization to Jackson 3, whose classes live
 * under {@code tools.jackson}. The auto-configured mapper is therefore a Jackson
 * 3 type, and nothing in the context satisfies a
 * {@code com.fasterxml.jackson.databind.ObjectMapper} dependency — which is what
 * our AI clients use to parse model responses. Without this bean the application
 * context fails to start.
 *
 * <p>This mapper is only for reading LLM output, so it's deliberately lenient:
 * a model that adds an extra field should not blow up a live negotiation.
 */
@Configuration
public class JacksonConfig {

    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper()
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }
}
