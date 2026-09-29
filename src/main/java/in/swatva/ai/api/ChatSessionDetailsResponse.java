package in.swatva.ai.api;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record ChatSessionDetailsResponse(
        UUID id,
        String title,
        String language,
        UUID activeSchemeId,
        String activeSchemeName,
        List<ChatMessageResponse> messages,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
