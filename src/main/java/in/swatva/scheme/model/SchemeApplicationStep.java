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
@Entity @Table(name = "scheme_application_steps")
public class SchemeApplicationStep extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "scheme_id", nullable = false) private Scheme scheme;
    @Column(nullable = false) private Integer stepNumber;
    @Column(nullable = false, length = 200) private String title;
    @Column(columnDefinition = "text") private String instructions;
    @Column(length = 1000) private String officialUrl;
}
