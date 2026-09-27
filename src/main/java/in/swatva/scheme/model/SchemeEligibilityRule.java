package in.swatva.scheme.model;

import in.swatva.common.persistence.BaseEntity;
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
@Entity @Table(name = "scheme_eligibility_rules")
public class SchemeEligibilityRule extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "scheme_id", nullable = false) private Scheme scheme;
    @Column(nullable = false, length = 100) private String ruleType;
    @Column(nullable = false, columnDefinition = "text") private String ruleDescription;
    @Column(columnDefinition = "text") private String ruleValue;
    private Integer displayOrder;
}
