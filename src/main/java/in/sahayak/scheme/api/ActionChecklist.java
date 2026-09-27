package in.sahayak.scheme.api;

import in.sahayak.document.api.SchemeDocumentEvaluation;
import java.util.List;
import java.util.UUID;

public record ActionChecklist(
        UUID schemeId,
        String schemeName,
        List<ChecklistDocument> requiredDocuments,
        String whereToApply,
        String officialApplicationUrl,
        List<ChecklistStep> applicationSteps,
        List<String> importantConditions,
        List<String> missingUserInformation,
        SchemeDocumentEvaluation documentReadiness
) {
    public ActionChecklist(
            UUID schemeId,
            String schemeName,
            List<ChecklistDocument> requiredDocuments,
            String whereToApply,
            String officialApplicationUrl,
            List<ChecklistStep> applicationSteps,
            List<String> importantConditions,
            List<String> missingUserInformation
    ) {
        this(schemeId, schemeName, requiredDocuments, whereToApply, officialApplicationUrl,
                applicationSteps, importantConditions, missingUserInformation, null);
    }

    public String scheme() { return schemeName; }
    public String officialUrl() { return officialApplicationUrl; }
    public List<ChecklistDocument> documents() { return requiredDocuments; }
    public List<ChecklistStep> steps() { return applicationSteps; }
    public List<String> conditions() { return importantConditions; }
    public List<String> missingInformation() { return missingUserInformation; }

    public record ChecklistDocument(
            String code,
            String name,
            boolean required,
            String notes
    ) { }

    public record ChecklistStep(
            int stepNumber,
            String title,
            String instructions,
            String officialUrl
    ) { }
}
