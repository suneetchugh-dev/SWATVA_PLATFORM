package in.sahayak.document.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ExtractedDocumentMetadata(
        ExtractedField<String> documentType,
        ExtractedField<String> holderName,
        ExtractedField<LocalDate> issueDate,
        ExtractedField<LocalDate> expiryDate,
        ExtractedField<String> issuingAuthority,
        ExtractedField<String> certificateNumber,
        ExtractedField<Double> annualIncome,
        ExtractedField<String> category,
        ExtractedField<String> state,
        ExtractedField<String> district,
        Double overallConfidence,
        String extractionStatus,
        boolean officialVerificationClaimed,
        String disclaimer,
        Map<String, Object> additionalFields
) {
    public static final String DISCLAIMER_TEXT =
            "AI-assisted extraction for information discovery only. Not an official government verification or endorsement.";

    public static ExtractedDocumentMetadata needsReview(String reason) {
        return new ExtractedDocumentMetadata(
                ExtractedField.notFound(),
                ExtractedField.notFound(),
                ExtractedField.notFound(),
                ExtractedField.notFound(),
                ExtractedField.notFound(),
                ExtractedField.notFound(),
                ExtractedField.notFound(),
                ExtractedField.notFound(),
                ExtractedField.notFound(),
                ExtractedField.notFound(),
                0.0,
                "NEEDS_REVIEW",
                false,
                DISCLAIMER_TEXT,
                Map.of("error", reason)
        );
    }

    public Map<String, Object> toMap() {
        Map<String, Object> map = new HashMap<>();
        if (documentType != null && documentType.value() != null) {
            map.put("documentType", fieldToMap(documentType));
        }
        if (holderName != null && holderName.value() != null) {
            map.put("holderName", fieldToMap(holderName));
        }
        if (issueDate != null && issueDate.value() != null) {
            map.put("issueDate", fieldToMap(issueDate));
        }
        if (expiryDate != null && expiryDate.value() != null) {
            map.put("expiryDate", fieldToMap(expiryDate));
        }
        if (issuingAuthority != null && issuingAuthority.value() != null) {
            map.put("issuingAuthority", fieldToMap(issuingAuthority));
        }
        if (certificateNumber != null && certificateNumber.value() != null) {
            map.put("certificateNumber", fieldToMap(certificateNumber));
        }
        if (annualIncome != null && annualIncome.value() != null) {
            map.put("annualIncome", fieldToMap(annualIncome));
        }
        if (category != null && category.value() != null) {
            map.put("category", fieldToMap(category));
        }
        if (state != null && state.value() != null) {
            map.put("state", fieldToMap(state));
        }
        if (district != null && district.value() != null) {
            map.put("district", fieldToMap(district));
        }
        map.put("overallConfidence", overallConfidence != null ? overallConfidence : 0.0);
        map.put("extractionStatus", extractionStatus != null ? extractionStatus : "NEEDS_REVIEW");
        map.put("officialVerificationClaimed", false);
        map.put("disclaimer", DISCLAIMER_TEXT);
        if (additionalFields != null && !additionalFields.isEmpty()) {
            map.put("additionalFields", additionalFields);
        }
        return map;
    }

    private <T> Map<String, Object> fieldToMap(ExtractedField<T> field) {
        Map<String, Object> fMap = new HashMap<>();
        fMap.put("value", field.value() != null ? field.value().toString() : null);
        fMap.put("confidence", field.confidence());
        fMap.put("reviewStatus", field.reviewStatus());
        return fMap;
    }
}
