package in.swatva.transparency.api;

import java.util.List;
import java.util.Map;

public record TransparencySummaryResponse(
        long totalReports,
        String filterState,
        String filterDistrict,
        String filterDepartment,
        List<DistrictAggregation> byDistrict,
        List<DepartmentAggregation> byDepartment,
        List<CategoryAggregation> byCategory,
        VerifiedOfficialGrievanceInfo officialInformation,
        CrowdsourcedDisclaimer crowdsourcedNotice
) {
    public record DistrictAggregation(
            String district,
            long count,
            String topCategory
    ) {}

    public record DepartmentAggregation(
            String department,
            long count,
            String topCategory
    ) {}

    public record CategoryAggregation(
            String category,
            String displayName,
            long count,
            double percentage
    ) {}

    public record VerifiedOfficialGrievanceInfo(
            boolean verifiedOfficial,
            String centralGrievancePortal,
            Map<String, String> stateGrievancePortals,
            String antiCorruptionHelpline,
            String notice
    ) {}

    public record CrowdsourcedDisclaimer(
            boolean verifiedOfficial,
            String notice
    ) {}
}
