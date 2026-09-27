package in.sahayak.readiness.api;

import java.time.LocalDate;
import java.util.UUID;

public record ReadinessDocumentItem(
        String documentTypeCode,
        String documentTypeName,
        boolean required,
        UUID userDocumentId,
        String filename,
        LocalDate issueDate,
        LocalDate expiryDate,
        String reason
) {
    public static ReadinessDocumentItem complete(String code, String name, boolean required, UUID docId, String filename, LocalDate issueDate, LocalDate expiryDate) {
        return new ReadinessDocumentItem(code, name, required, docId, filename, issueDate, expiryDate, "Available and valid document");
    }

    public static ReadinessDocumentItem missing(String code, String name, boolean required, String notes) {
        String reason = (notes != null && !notes.isBlank()) ? notes : "Document is missing from Document Locker";
        return new ReadinessDocumentItem(code, name, required, null, null, null, null, reason);
    }

    public static ReadinessDocumentItem invalid(String code, String name, boolean required, UUID docId, String filename, LocalDate issueDate, LocalDate expiryDate, String reason) {
        return new ReadinessDocumentItem(code, name, required, docId, filename, issueDate, expiryDate, reason);
    }

    public static ReadinessDocumentItem needsReview(String code, String name, boolean required, UUID docId, String filename, LocalDate issueDate, LocalDate expiryDate, String reason) {
        return new ReadinessDocumentItem(code, name, required, docId, filename, issueDate, expiryDate, reason);
    }
}
