package in.swatva.document.api;

import in.swatva.document.model.UserDocument;
import in.swatva.document.model.enums.DocumentStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

public record UserDocumentDto(
        UUID id,
        String documentType,
        String documentTypeName,
        String filename,
        String storageKey,
        Instant uploadDate,
        LocalDate issueDate,
        LocalDate expiryDate,
        String issuingAuthority,
        Map<String, Object> extractedMetadata,
        DocumentStatus status
) {
    public static UserDocumentDto from(UserDocument entity) {
        String docTypeCode = entity.getDocumentType() != null ? entity.getDocumentType().getCode() : null;
        String docTypeName = entity.getDocumentType() != null ? entity.getDocumentType().getName() : null;
        return new UserDocumentDto(
                entity.getId(),
                docTypeCode,
                docTypeName,
                entity.getFilename(),
                entity.getStorageKey(),
                entity.getUploadDate(),
                entity.getIssueDate(),
                entity.getExpiryDate(),
                entity.getIssuingAuthority(),
                entity.getExtractedMetadata(),
                entity.getStatus()
        );
    }
}
