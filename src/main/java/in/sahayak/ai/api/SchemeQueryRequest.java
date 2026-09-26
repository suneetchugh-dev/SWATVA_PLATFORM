package in.sahayak.ai.api;

import jakarta.validation.constraints.NotBlank;

public record SchemeQueryRequest(
        @NotBlank(message = "Query cannot be blank")
        String query,
        String state,
        String category
) {}
