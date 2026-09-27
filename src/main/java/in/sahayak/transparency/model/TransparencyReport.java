package in.sahayak.transparency.model;

import in.sahayak.common.persistence.BaseEntity;
import in.sahayak.transparency.model.enums.ReportCategory;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Persists anonymous citizen reports regarding irregularities, unauthorized fees, or bribe demands.
 * Strictly avoids storing citizen identifiers, IP addresses, or contact information.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "transparency_reports")
public class TransparencyReport extends BaseEntity {

    @Column(nullable = false, length = 150)
    private String department;

    @Column(name = "office_location", length = 200)
    private String officeLocation;

    @Column(nullable = false, length = 100)
    private String district;

    @Column(nullable = false, length = 100)
    private String state;

    @Enumerated(EnumType.STRING)
    @Column(name = "report_category", nullable = false, length = 50)
    private ReportCategory reportCategory;

    @Column(nullable = false, columnDefinition = "text")
    private String description;

    @Column(name = "reported_at", nullable = false)
    private Instant reportedAt = Instant.now();

    @Column(name = "scheme_id")
    private UUID schemeId;

    @Column(name = "scheme_name", length = 200)
    private String schemeName;
}
