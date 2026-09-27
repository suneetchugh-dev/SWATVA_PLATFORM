package in.swatva.document.api;

import com.fasterxml.jackson.annotation.JsonFormat;
import in.swatva.document.model.enums.DocumentValidityStatus;
import java.time.LocalDate;
import java.util.UUID;

public record DocumentValidationResponse(
        UUID documentId,
        String documentType,
        String documentTypeName,
        DocumentValidityStatus status,
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
        LocalDate issueDate,
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
        LocalDate expiryDate,
        String matchedRuleDescription,
        String message,
        Long daysUntilExpiry
) {
}
