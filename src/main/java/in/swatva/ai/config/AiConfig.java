package in.swatva.ai.config;

import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.OpenAiEmbeddingModel;
import org.springframework.ai.openai.OpenAiEmbeddingOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.util.StringUtils;

@Configuration
@EnableConfigurationProperties(QdrantProperties.class)
public class AiConfig {

    @Bean
    @Primary
    public ChatModel chatModel(
            @Value("${spring.ai.openai.chat.base-url:${spring.ai.openai.base-url:https://api.groq.com/openai}}") String baseUrl,
            @Value("${spring.ai.openai.chat.api-key:${spring.ai.openai.api-key:}}") String apiKey,
            @Value("${spring.ai.openai.chat.options.model:openai/gpt-oss-120b}") String model,
            @Value("${spring.ai.openai.chat.options.temperature:0.7}") Double temperature,
            @Value("${spring.ai.openai.chat.options.max-completion-tokens:4096}") Integer maxTokens) {

        if (!StringUtils.hasText(apiKey)) {
            return null;
        }

        OpenAiApi openAiApi = OpenAiApi.builder()
                .baseUrl(baseUrl)
                .apiKey(apiKey)
                .build();

        OpenAiChatOptions options = OpenAiChatOptions.builder()
                .model(model)
                .temperature(temperature)
                .maxCompletionTokens(maxTokens)
                .build();

        return OpenAiChatModel.builder()
                .openAiApi(openAiApi)
                .defaultOptions(options)
                .build();
    }

    @Bean
    @Primary
    public EmbeddingModel embeddingModel(
            @Value("${spring.ai.openai.embedding.base-url:${spring.ai.openai.base-url:https://openrouter.ai/api}}") String baseUrl,
            @Value("${spring.ai.openai.embedding.api-key:${spring.ai.openai.api-key:}}") String apiKey,
            @Value("${spring.ai.openai.embedding.options.model:openai/text-embedding-3-large}") String model,
            @Value("${spring.ai.openai.embedding.options.dimensions:3072}") Integer dimensions) {

        if (!StringUtils.hasText(apiKey)) {
            return null;
        }

        OpenAiApi openAiApi = OpenAiApi.builder()
                .baseUrl(baseUrl)
                .apiKey(apiKey)
                .build();

        OpenAiEmbeddingOptions options = OpenAiEmbeddingOptions.builder()
                .model(model)
                .dimensions(dimensions)
                .build();

        return new OpenAiEmbeddingModel(openAiApi, org.springframework.ai.document.MetadataMode.EMBED, options);
    }
}
