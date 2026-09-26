package in.sahayak.scheme.api;

import in.sahayak.eligibility.EligibilityStatus;
import in.sahayak.scheme.model.enums.GovernmentLevel;
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
