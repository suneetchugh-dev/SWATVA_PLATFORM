package in.swatva.ai.api;

import java.util.UUID;

public record SchemeCitation(
        UUID schemeId,
        String schemeName,
        String sourceUrl,
        String documentType
) {}
