package in.swatva.ai.api;

import java.time.Instant;
import java.util.UUID;

public record ChatSessionSummaryResponse(
        UUID id,
        String title,
        String language,
        UUID activeSchemeId,
        String activeSchemeName,
        int messageCount,
        Instant createdAt,
        Instant updatedAt
) {}
