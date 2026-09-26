package in.sahayak.document.model;

import in.sahayak.common.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter @NoArgsConstructor
@Entity @Table(name = "document_types")
public class DocumentType extends BaseEntity {
    @Column(nullable = false, unique = true, length = 80) private String code;
    @Column(nullable = false, length = 150) private String name;
    @Column(columnDefinition = "text") private String description;
    @Column(nullable = false) private boolean active = true;
    @OneToMany(mappedBy = "documentType", orphanRemoval = true) private List<DocumentValidityRule> validityRules = new ArrayList<>();
}
