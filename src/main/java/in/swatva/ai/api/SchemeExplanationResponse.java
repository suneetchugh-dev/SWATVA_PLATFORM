package in.swatva.ai.api;

import in.swatva.eligibility.EligibilityStatus;
import java.util.List;
import java.util.UUID;

public record SchemeExplanationResponse(
        UUID schemeId,
        String schemeName,
        String officialSourceUrl,
        EligibilityStatus eligibilityStatus,
        int matchPercentage,
        String explanation,
        List<String> satisfiedConditions,
        List<String> failedConditions,
        List<String> missingConditions,
        List<SchemeCitation> citations
) {}
