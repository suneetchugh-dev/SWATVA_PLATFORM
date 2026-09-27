package in.swatva.document.api;

import java.time.LocalDate;
import java.util.UUID;

public record DocumentValidationRequest(
        UUID schemeId,
        String state,
        LocalDate issueDate,
        LocalDate expiryDate
) {
    public DocumentValidationRequest() {
        this(null, null, null, null);
    }
}
