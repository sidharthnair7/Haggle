package fileidea.haggleai.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class AiSettings {

    private final String openAiKey;
    private final boolean useLlm;
    private final String watsonxApiKey;
    private final String watsonxProjectId;
    private final String watsonxUrl;
    private final String watsonxModelId;

    public AiSettings(
            @Value("${spring.ai.openai.api-key:placeholder}") String openAiKey,
            @Value("${haggle.ai.use-llm:true}") boolean useLlm,
            @Value("${haggle.watsonx.api-key:}") String watsonxApiKey,
            @Value("${haggle.watsonx.project-id:}") String watsonxProjectId,
            @Value("${haggle.watsonx.url:https://us-south.ml.cloud.ibm.com}") String watsonxUrl,
            @Value("${haggle.watsonx.model-id:ibm/granite-3-8b-instruct}") String watsonxModelId
    ) {
        this.openAiKey = openAiKey;
        this.useLlm = useLlm;
        this.watsonxApiKey = watsonxApiKey;
        this.watsonxProjectId = watsonxProjectId;
        this.watsonxUrl = watsonxUrl;
        this.watsonxModelId = watsonxModelId;
    }

    public boolean openAiReady() {
        if (!useLlm) {
            return false;
        }
        if (openAiKey == null || openAiKey.isBlank()) {
            return false;
        }
        String k = openAiKey.trim().toLowerCase();
        return !(k.equals("placeholder") || k.equals("changeme") || k.equals("your-key-here"));
    }

    public boolean watsonxReady() {
        return watsonxApiKey != null && !watsonxApiKey.isBlank()
                && watsonxProjectId != null && !watsonxProjectId.isBlank();
    }

    public String watsonxApiKey() {
        return watsonxApiKey;
    }

    public String watsonxProjectId() {
        return watsonxProjectId;
    }

    public String watsonxUrl() {
        return watsonxUrl.endsWith("/") ? watsonxUrl.substring(0, watsonxUrl.length() - 1) : watsonxUrl;
    }

    public String watsonxModelId() {
        return watsonxModelId;
    }
}
