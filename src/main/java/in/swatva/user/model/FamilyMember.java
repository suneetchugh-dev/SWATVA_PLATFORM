package in.swatva.user.model;

import in.swatva.common.persistence.BaseEntity;
import in.swatva.user.model.enums.FamilyRelationship;
import in.swatva.user.model.enums.Gender;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "family_members")
public class FamilyMember extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "profile_id", nullable = false)
    private UserProfile profile;

    @Column(nullable = false, length = 100) private String fullName;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30) private FamilyRelationship relationship;
    private Integer age;
    @Enumerated(EnumType.STRING) @Column(length = 30) private Gender gender;
    @Column(precision = 14, scale = 2) private BigDecimal annualIncome;
    @Column(length = 120) private String occupation;
}
