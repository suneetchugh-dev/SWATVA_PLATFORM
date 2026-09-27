package in.swatva.scheme.model;

import in.swatva.common.persistence.BaseEntity;
import in.swatva.document.model.DocumentType;
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
@Entity @Table(name = "scheme_document_requirements")
public class SchemeDocumentRequirement extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "scheme_id", nullable = false) private Scheme scheme;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "document_type_id", nullable = false) private DocumentType documentType;
    @Column(nullable = false) private boolean required = true;
    @Column(columnDefinition = "text") private String notes;
}
