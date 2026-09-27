package in.swatva.document.api;

import in.swatva.document.model.enums.DocumentStatus;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.util.Map;

public record DocumentRegistrationRequest(
        @NotBlank(message = "documentType is required")
        String documentType,
        String filename,
        String storageKey,
        LocalDate issueDate,
        LocalDate expiryDate,
        String issuingAuthority,
        Map<String, Object> extractedMetadata,
        DocumentStatus status
) {
}
