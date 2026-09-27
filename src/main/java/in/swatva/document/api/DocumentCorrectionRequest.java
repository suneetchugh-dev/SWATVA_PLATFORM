package in.swatva.document.api;

import in.swatva.document.model.enums.DocumentStatus;
import java.time.LocalDate;
import java.util.Map;

public record DocumentCorrectionRequest(
        String documentType,
        LocalDate issueDate,
        LocalDate expiryDate,
        String issuingAuthority,
        String documentNumber,
        DocumentStatus status,
        Map<String, Object> extractedMetadata
) {
}
