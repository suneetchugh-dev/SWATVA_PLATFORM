package in.sahayak.ai.api;

import in.sahayak.scheme.api.ActionChecklist;
import java.util.List;
import java.util.UUID;

public record ChatResponse(
        UUID sessionId,
        String reply,
        String language,
        boolean grounded,
        UUID activeSchemeId,
        String activeSchemeName,
        List<ChatBenefitSummary> surfacedBenefits,
        ActionChecklist checklist,
        ChatReadinessSummary readinessScore,
        List<String> citations
) {
    public record ChatBenefitSummary(
            UUID schemeId,
            String schemeName,
            String governmentLevel,
            String category,
            String benefitInformation,
            String officialSourceUrl,
            String matchStatus,
            int matchPercentage
    ) {}

    public record ChatReadinessSummary(
            int readinessPercentage,
            String trafficLight,
            int completedDocuments,
            int missingDocuments,
            int totalRequired
    ) {}
}
