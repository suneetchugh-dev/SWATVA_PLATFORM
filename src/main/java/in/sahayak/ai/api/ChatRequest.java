package in.sahayak.ai.api;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record ChatRequest(
        @NotBlank(message = "Message cannot be empty")
        @Size(min = 1, max = 2000, message = "Message must be between 1 and 2000 characters")
        @JsonAlias({"query", "prompt", "text"})
        String message,

        UUID sessionId,

        String language
) {
    public String normalizedLanguage() {
        if (language == null || language.isBlank()) {
            return null;
        }
        String lower = language.trim().toLowerCase();
        if (lower.startsWith("hi") || lower.contains("hindi")) return "hi";
        if (lower.startsWith("kn") || lower.contains("kannada")) return "kn";
        return "en";
    }
}
