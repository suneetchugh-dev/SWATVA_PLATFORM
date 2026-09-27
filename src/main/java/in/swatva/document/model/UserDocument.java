package in.swatva.document.model;

import in.swatva.common.persistence.BaseEntity;
import in.swatva.document.model.enums.DocumentStatus;
import in.swatva.document.model.enums.DocumentVerificationStatus;
import in.swatva.user.model.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "user_documents")
public class UserDocument extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "document_type_id", nullable = false)
    private DocumentType documentType;

    @Column(length = 255)
    private String filename;

    @Column(name = "storage_key", length = 1000)
    private String storageKey;

    @Column(name = "storage_reference", length = 1000)
    private String storageReference;

    @Column(length = 100)
    private String documentNumber;

    @Column
    private Instant uploadDate;

    @Column
    private LocalDate issueDate;

    private LocalDate issuedOn;

    @Column
    private LocalDate expiryDate;

    private LocalDate expiresOn;

    @Column(length = 200)
    private String issuingAuthority;

    @Column(length = 100)
    private String contentType;

    @Column
    private Long fileSize;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> extractedMetadata = new HashMap<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private DocumentStatus status = DocumentStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DocumentVerificationStatus verificationStatus = DocumentVerificationStatus.PENDING;

    @PrePersist
    @PreUpdate
    void syncFields() {
        if (uploadDate == null) {
            uploadDate = getCreatedAt() != null ? getCreatedAt() : Instant.now();
        }
        if (storageKey == null && storageReference != null) {
            storageKey = storageReference;
        } else if (storageReference == null && storageKey != null) {
            storageReference = storageKey;
        }
        if (issueDate == null && issuedOn != null) {
            issueDate = issuedOn;
        } else if (issuedOn == null && issueDate != null) {
            issuedOn = issueDate;
        }
        if (expiryDate == null && expiresOn != null) {
            expiryDate = expiresOn;
        } else if (expiresOn == null && expiryDate != null) {
            expiresOn = expiryDate;
        }
    }

    public String getStorageKey() {
        return storageKey != null ? storageKey : storageReference;
    }

    public void setStorageKey(String key) {
        this.storageKey = key;
        if (this.storageReference == null) {
            this.storageReference = key;
        }
    }

    public void setStorageReference(String ref) {
        this.storageReference = ref;
        if (this.storageKey == null) {
            this.storageKey = ref;
        }
    }

    public LocalDate getIssueDate() {
        return issueDate != null ? issueDate : issuedOn;
    }

    public void setIssueDate(LocalDate date) {
        this.issueDate = date;
        this.issuedOn = date;
    }

    public LocalDate getExpiryDate() {
        return expiryDate != null ? expiryDate : expiresOn;
    }

    public void setExpiryDate(LocalDate date) {
        this.expiryDate = date;
        this.expiresOn = date;
    }

    public Instant getUploadDate() {
        return uploadDate != null ? uploadDate : getCreatedAt();
    }
}
