package in.sahayak.ai.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "app.qdrant")
public class QdrantProperties {
    private String host = "localhost";
    private int port = 6334;
    private String apiKey = "";
    private String collectionName = "sahayak_schemes";
    private boolean useTls = false;
    private boolean initializeSchema = false;
}
