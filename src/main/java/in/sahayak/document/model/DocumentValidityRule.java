package in.sahayak.document.model;

import in.sahayak.common.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter @NoArgsConstructor
@Entity @Table(name = "document_validity_rules")
public class DocumentValidityRule extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "document_type_id", nullable = false) private DocumentType documentType;
    @Column(nullable = false, length = 100) private String ruleType;
    @Column(nullable = false, columnDefinition = "text") private String ruleDescription;
    private Integer validityMonths;
}
