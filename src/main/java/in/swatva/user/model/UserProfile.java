package in.swatva.user.model;

import in.swatva.common.persistence.BaseEntity;
import in.swatva.user.model.enums.DisabilityStatus;
import in.swatva.user.model.enums.Gender;
import in.swatva.user.model.enums.SocialCategory;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "user_profiles")
public class UserProfile extends BaseEntity {
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    private Integer age;
    @Column(length = 100) private String state;
    @Column(length = 100) private String district;
    @Column(precision = 14, scale = 2) private BigDecimal annualIncome;
    @Column(length = 120) private String occupation;
    @Column(length = 120) private String education;
    @Enumerated(EnumType.STRING) @Column(length = 30) private SocialCategory category;
    @Enumerated(EnumType.STRING) @Column(length = 30) private Gender gender;
    @Enumerated(EnumType.STRING) @Column(length = 30) private DisabilityStatus disabilityStatus;
    private Integer householdSize;

    @OneToMany(mappedBy = "profile", orphanRemoval = true)
    private List<FamilyMember> familyMembers = new ArrayList<>();
}
