package in.sahayak.document.api;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record SchemeDocumentEvaluation(
        UUID schemeId,
        String schemeName,
        List<DocumentItem> availableDocuments,
        List<DocumentItem> missingDocuments,
        List<DocumentItem> potentiallyExpiredDocuments,
        boolean fullyReady
) {
    public record DocumentItem(
            String documentTypeCode,
            String documentTypeName,
            boolean required,
            UUID userDocumentId,
            String filename,
            LocalDate expiryDate,
            String statusReason
    ) {
        public static DocumentItem available(String code, String name, boolean required, UUID docId, String filename, LocalDate expiryDate) {
            return new DocumentItem(code, name, required, docId, filename, expiryDate, "Valid document available in locker");
        }

        public static DocumentItem missing(String code, String name, boolean required, String notes) {
            String reason = (notes != null && !notes.isBlank()) ? notes : "Document not found in Document Locker";
            return new DocumentItem(code, name, required, null, null, null, reason);
        }

        public static DocumentItem potentiallyExpired(String code, String name, boolean required, UUID docId, String filename, LocalDate expiryDate, String reason) {
            return new DocumentItem(code, name, required, docId, filename, expiryDate, reason);
        }
    }
}
