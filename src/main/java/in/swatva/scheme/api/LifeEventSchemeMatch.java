package in.swatva.scheme.api;

import in.swatva.eligibility.EligibilityStatus;
import in.swatva.scheme.model.enums.GovernmentLevel;
import java.util.List;
import java.util.UUID;

public record LifeEventSchemeMatch(
        UUID schemeId,
        String schemeName,
        String category,
        GovernmentLevel governmentLevel,
        String state,
        String benefitInformation,
        String issuingAuthority,
        String officialSourceUrl,
        EligibilityStatus eligibilityStatus,
        int matchPercentage,
        String whySurfaced,
        List<String> satisfiedConditions,
        List<String> failedConditions,
        List<String> missingInformation,
        List<String> relevantRetrievedSnippets
) {
}
