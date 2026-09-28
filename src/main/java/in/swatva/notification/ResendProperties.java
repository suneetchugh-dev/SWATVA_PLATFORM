package in.swatva.notification;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.resend")
public class ResendProperties {
    private String apiKey = "";
    private String fromEmail = "Swatva AI <onboarding@resend.dev>";
    private String apiUrl = "https://api.resend.com/emails";

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = (apiKey != null) ? apiKey.trim() : "";
    }

    public String getFromEmail() {
        return fromEmail;
    }

    public void setFromEmail(String fromEmail) {
        this.fromEmail = (fromEmail != null && !fromEmail.isBlank()) ? fromEmail.trim() : "Swatva AI <onboarding@resend.dev>";
    }

    public String getApiUrl() {
        return apiUrl;
    }

    public void setApiUrl(String apiUrl) {
        this.apiUrl = (apiUrl != null && !apiUrl.isBlank()) ? apiUrl.trim() : "https://api.resend.com/emails";
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }
}
