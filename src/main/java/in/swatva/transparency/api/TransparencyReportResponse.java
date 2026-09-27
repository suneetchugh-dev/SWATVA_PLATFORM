package in.swatva.transparency.api;

import in.swatva.transparency.model.TransparencyReport;
import in.swatva.transparency.model.enums.ReportCategory;
import java.time.Instant;
import java.util.UUID;

public record TransparencyReportResponse(
        UUID reportId,
        String department,
        String officeLocation,
        String district,
        String state,
        ReportCategory reportCategory,
        Instant timestamp,
        String statusMessage,
        String officialGrievanceNotice,
        String officialGrievanceUrl,
        boolean citizenAnonymousReport
) {
    public static TransparencyReportResponse from(TransparencyReport report, String grievanceUrl) {
        return new TransparencyReportResponse(
                report.getId(),
                report.getDepartment(),
                report.getOfficeLocation(),
                report.getDistrict(),
                report.getState(),
                report.getReportCategory(),
                report.getReportedAt(),
                "Anonymous report logged for civic transparency aggregation.",
                "To file an official statutory complaint with legal redress, please visit the official government grievance portal.",
                grievanceUrl,
                true
        );
    }
}
