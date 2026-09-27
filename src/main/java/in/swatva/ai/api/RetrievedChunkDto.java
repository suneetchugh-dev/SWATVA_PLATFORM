package in.swatva.ai.api;

import java.util.UUID;

public record RetrievedChunkDto(
        UUID chunkId,
        UUID schemeId,
        String schemeName,
        String documentType,
        String content,
        String sourceUrl,
        Double score
) {}
