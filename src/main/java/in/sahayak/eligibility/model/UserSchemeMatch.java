package in.sahayak.eligibility.model;

import in.sahayak.common.persistence.BaseEntity;
import in.sahayak.eligibility.model.enums.MatchStatus;
import in.sahayak.scheme.model.Scheme;
import in.sahayak.user.model.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter @NoArgsConstructor
@Entity @Table(name = "user_scheme_matches")
public class UserSchemeMatch extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id", nullable = false) private User user;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "scheme_id", nullable = false) private Scheme scheme;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30) private MatchStatus status = MatchStatus.PENDING;
    private Integer matchScore;
    @Column(columnDefinition = "text") private String notes;
}
