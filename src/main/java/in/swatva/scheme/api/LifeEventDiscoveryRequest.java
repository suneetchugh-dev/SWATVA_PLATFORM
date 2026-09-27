package in.swatva.scheme.api;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LifeEventDiscoveryRequest(
        @NotBlank(message = "Description of the life event is required")
        @Size(min = 5, max = 2000, message = "Life event description must be between 5 and 2000 characters")
        @JsonAlias({"lifeEventDescription", "query", "situation"})
        String description,

        String state
) {
    public String getEffectiveState() {
        return (state != null && !state.isBlank()) ? state.trim() : null;
    }
}
