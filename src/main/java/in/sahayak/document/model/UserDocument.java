package in.sahayak.document.model;

import in.sahayak.common.persistence.BaseEntity;
import in.sahayak.document.model.enums.DocumentVerificationStatus;
import in.sahayak.user.model.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter @NoArgsConstructor
@Entity @Table(name = "user_documents")
public class UserDocument extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id", nullable = false) private User user;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "document_type_id", nullable = false) private DocumentType documentType;
    @Column(nullable = false, length = 1000) private String storageReference;
    @Column(length = 100) private String documentNumber;
    private LocalDate issuedOn;
    private LocalDate expiresOn;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private DocumentVerificationStatus verificationStatus = DocumentVerificationStatus.PENDING;
}
