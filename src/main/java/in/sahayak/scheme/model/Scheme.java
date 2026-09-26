package in.sahayak.scheme.model;

import in.sahayak.common.persistence.BaseEntity;
import in.sahayak.scheme.model.enums.GovernmentLevel;
import in.sahayak.scheme.model.enums.SchemeStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "schemes")
public class Scheme extends BaseEntity {
    @Column(nullable = false, length = 200) private String name;
    @Column(nullable = false, length = 80) private String category;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private GovernmentLevel governmentLevel;
    @Column(length = 100) private String state;
    @Column(nullable = false, length = 200) private String issuingAuthority;
    @Column(columnDefinition = "text") private String benefitInformation;
    @Column(nullable = false, length = 1000) private String officialSourceUrl;
    private Instant lastVerifiedAt;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private SchemeStatus status = SchemeStatus.ACTIVE;
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition = "jsonb") private java.util.Map<String, Object> eligibilityData;
    @Column(columnDefinition = "text") private String rawSchemeTextReference;

    @OneToMany(mappedBy = "scheme", orphanRemoval = true) private List<SchemeEligibilityRule> eligibilityRules = new ArrayList<>();
    @OneToMany(mappedBy = "scheme", orphanRemoval = true) private List<SchemeDocumentRequirement> documentRequirements = new ArrayList<>();
    @OneToMany(mappedBy = "scheme", orphanRemoval = true) private List<SchemeApplicationStep> applicationSteps = new ArrayList<>();
}
