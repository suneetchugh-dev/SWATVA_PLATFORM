package in.sahayak.ai.api;

import java.util.UUID;

public record SchemeCitation(
        UUID schemeId,
        String schemeName,
        String sourceUrl,
        String documentType
) {}
