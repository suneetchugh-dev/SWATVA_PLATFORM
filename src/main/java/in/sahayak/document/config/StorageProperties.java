package in.sahayak.document.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "app.storage.s3")
public class StorageProperties {
    private String endpoint = "http://localhost:9000";
    private String bucket = "sahayak-documents";
    private String region = "us-east-1";
    private String accessKey = "minioadmin";
    private String secretKey = "minioadmin";
    private boolean pathStyleAccess = true;
}
