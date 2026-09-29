package in.swatva.ai.api;

import java.time.LocalDateTime;
import java.util.UUID;

public record ChatMessageResponse(
        UUID id,
        String role,
        String content,
        String language,
        UUID activeSchemeId,
        boolean grounded,
        LocalDateTime createdAt
) {}
