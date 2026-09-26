package in.sahayak.eligibility;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public record EligibilityResult(
        UUID schemeId,
        String scheme,
        EligibilityStatus status,
        int matchPercentage,
        List<String> satisfiedConditions,
        List<String> failedConditions,
        List<String> missingInformation,
        Map<String, Object> explanationData
) { }
