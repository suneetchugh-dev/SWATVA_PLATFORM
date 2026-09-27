package in.sahayak.readiness.api;

import in.sahayak.readiness.model.enums.ReadinessTrafficLight;
import java.util.List;
import java.util.UUID;

public record ApplicationReadinessResponse(
        UUID schemeId,
        String schemeName,
        int readinessPercentage,
        ReadinessTrafficLight status,
        int totalRequiredDocuments,
        int completedDocuments,
        int missingDocuments,
        int invalidDocuments,
        int documentsNeedingReview,
        List<ReadinessDocumentItem> completed,
        List<ReadinessDocumentItem> missing,
        List<ReadinessDocumentItem> invalid,
        List<ReadinessDocumentItem> needsReview
) {
}
