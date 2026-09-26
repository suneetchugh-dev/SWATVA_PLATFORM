package in.sahayak.readiness.model;

import in.sahayak.common.persistence.BaseEntity;
import in.sahayak.eligibility.model.UserSchemeMatch;
import in.sahayak.readiness.model.enums.ApplicationStatus;
import in.sahayak.scheme.model.Scheme;
import in.sahayak.user.model.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter @NoArgsConstructor
@Entity @Table(name = "applications")
public class Application extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id", nullable = false) private User user;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "scheme_id", nullable = false) private Scheme scheme;
    @OneToOne(fetch = FetchType.LAZY) @JoinColumn(name = "match_id", unique = true) private UserSchemeMatch match;
    @Column(unique = true, length = 100) private String referenceNumber;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30) private ApplicationStatus status = ApplicationStatus.DRAFT;
    private Instant submittedAt;
    private Integer currentStepNumber;
    @Column(columnDefinition = "text") private String notes;
}
