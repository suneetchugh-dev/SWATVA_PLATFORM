package in.swatva.scheme.api;

import in.swatva.eligibility.EligibilityStatus;
import in.swatva.scheme.model.enums.GovernmentLevel;
import java.util.UUID;

public record SchemeBenefitValue(
        UUID schemeId,
        String schemeName,
        GovernmentLevel governmentLevel,
        String state,
        String category,
        long estimatedAnnualBenefit,
        String period,
        String benefitDescription,
        String officialSourceUrl,
        EligibilityStatus eligibilityStatus
) {}
