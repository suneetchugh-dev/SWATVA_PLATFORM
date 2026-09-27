package in.sahayak.document.model;

import in.sahayak.common.persistence.BaseEntity;
import in.sahayak.scheme.model.Scheme;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "document_validity_rules")
public class DocumentValidityRule extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "document_type_id", nullable = false)
    private DocumentType documentType;

    @Column(length = 100)
    private String state;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scheme_id")
    private Scheme scheme;

    @Column(nullable = false, length = 100)
    private String ruleType = "STANDARD";

    @Column(columnDefinition = "text")
    private String ruleDescription;

    private Integer validityMonths;

    private Integer validityDays;

    private Integer freshnessMonths;

    private Integer freshnessDays;

    private Integer warningPeriodDays;

    @Column(nullable = false)
    private boolean active = true;

    public UUID getSchemeId() {
        return scheme != null ? scheme.getId() : null;
    }
}
