package fileidea.haggleai.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;

@Component
public class OpenAiChatSupport {

    private final AiSettings settings;
    private final ObjectMapper mapper;
    private final ChatClient chatClient;

    public OpenAiChatSupport(AiSettings settings,
                             ObjectMapper mapper,
                             ObjectProvider<ChatModel> chatModel) {
        this.settings = settings;
        this.mapper = mapper;
        ChatModel model = chatModel.getIfAvailable();
        this.chatClient = model != null ? ChatClient.create(model) : null;
    }

    public boolean available() {
        return settings.openAiReady() && chatClient != null;
    }

    public String complete(String system, String user) {
        if (!available()) {
            throw new IllegalStateException("OpenAI is not available");
        }
        return chatClient.prompt()
                .system(system)
                .user(user)
                .call()
                .content();
    }

    public JsonNode parseJsonObject(String raw) throws Exception {
        String text = raw == null ? "" : raw.trim();
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start >= 0 && end > start) {
            text = text.substring(start, end + 1);
        }
        return mapper.readTree(text);
    }

    public ObjectMapper mapper() {
        return mapper;
    }
}
