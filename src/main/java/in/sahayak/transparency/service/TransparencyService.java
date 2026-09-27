package in.sahayak.transparency.service;

import in.sahayak.common.exception.ResourceNotFoundException;
import in.sahayak.scheme.model.Scheme;
import in.sahayak.scheme.repository.SchemeRepository;
import in.sahayak.transparency.api.CreateTransparencyReportRequest;
import in.sahayak.transparency.api.SchemeTransparencyInfo;
import in.sahayak.transparency.api.TransparencyReportResponse;
import in.sahayak.transparency.api.TransparencySummaryResponse;
import in.sahayak.transparency.api.TransparencySummaryResponse.CategoryAggregation;
import in.sahayak.transparency.api.TransparencySummaryResponse.CrowdsourcedDisclaimer;
import in.sahayak.transparency.api.TransparencySummaryResponse.DepartmentAggregation;
import in.sahayak.transparency.api.TransparencySummaryResponse.DistrictAggregation;
import in.sahayak.transparency.api.TransparencySummaryResponse.VerifiedOfficialGrievanceInfo;
import in.sahayak.transparency.model.TransparencyReport;
import in.sahayak.transparency.model.enums.ReportCategory;
import in.sahayak.transparency.repository.TransparencyReportRepository;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TransparencyService {

    private static final Logger log = LoggerFactory.getLogger(TransparencyService.class);

    private static final String CENTRAL_GRIEVANCE_URL = "https://pgportal.gov.in/";
    private static final Map<String, String> STATE_GRIEVANCE_URLS = Map.of(
            "Karnataka", "https://ipgrs.karnataka.gov.in/",
            "Maharashtra", "https://grievances.maharashtra.gov.in/",
            "Delhi", "https://pgms.delhi.gov.in/",
            "Uttar Pradesh", "https://jansunwai.up.gov.in/"
    );

    private final TransparencyReportRepository reportRepository;
    private final SchemeRepository schemeRepository;

    public TransparencyService(TransparencyReportRepository reportRepository, SchemeRepository schemeRepository) {
        this.reportRepository = reportRepository;
        this.schemeRepository = schemeRepository;
    }

    @Transactional
    public TransparencyReportResponse submitAnonymousReport(CreateTransparencyReportRequest request) {
        TransparencyReport report = new TransparencyReport();
        report.setDepartment(request.department().trim());
        report.setOfficeLocation(request.officeLocation() != null ? request.officeLocation().trim() : null);
        report.setDistrict(request.district().trim());
        report.setState(request.state().trim());
        report.setReportCategory(request.reportCategory());
        report.setDescription(request.description().trim());
        report.setReportedAt(Instant.now());

        if (request.schemeId() != null) {
            report.setSchemeId(request.schemeId());
            schemeRepository.findById(request.schemeId()).ifPresent(s -> report.setSchemeName(s.getName()));
        } else if (request.schemeName() != null && !request.schemeName().isBlank()) {
            report.setSchemeName(request.schemeName().trim());
        }

        // Strictly omit all citizen identities, IP addresses, emails, or phone numbers
        TransparencyReport saved = reportRepository.save(report);

        String grievanceUrl = resolveGrievanceUrl(request.state());
        log.info("Recorded anonymous report ID={} for district={}, department={}, category={}",
                saved.getId(), saved.getDistrict(), saved.getDepartment(), saved.getReportCategory());

        return TransparencyReportResponse.from(saved, grievanceUrl);
    }

    @Transactional(readOnly = true)
    public TransparencySummaryResponse getAnonymizedSummary(String state, String district, String department) {
        List<TransparencyReport> allReports = reportRepository.findAll();

        List<TransparencyReport> filtered = allReports.stream()
                .filter(r -> state == null || state.isBlank() || r.getState().equalsIgnoreCase(state.trim()))
                .filter(r -> district == null || district.isBlank() || r.getDistrict().equalsIgnoreCase(district.trim()))
                .filter(r -> department == null || department.isBlank() || r.getDepartment().equalsIgnoreCase(department.trim()))
                .toList();

        long total = filtered.size();

        // 1. Aggregate by District
        Map<String, List<TransparencyReport>> byDistrictMap = filtered.stream()
                .collect(Collectors.groupingBy(TransparencyReport::getDistrict));

        List<DistrictAggregation> districtAggs = byDistrictMap.entrySet().stream()
                .map(e -> {
                    String topCat = findTopCategory(e.getValue());
                    return new DistrictAggregation(e.getKey(), e.getValue().size(), topCat);
                })
                .sorted(Comparator.comparingLong(DistrictAggregation::count).reversed())
                .toList();

        // 2. Aggregate by Department
        Map<String, List<TransparencyReport>> byDeptMap = filtered.stream()
                .collect(Collectors.groupingBy(TransparencyReport::getDepartment));

        List<DepartmentAggregation> deptAggs = byDeptMap.entrySet().stream()
                .map(e -> {
                    String topCat = findTopCategory(e.getValue());
                    return new DepartmentAggregation(e.getKey(), e.getValue().size(), topCat);
                })
                .sorted(Comparator.comparingLong(DepartmentAggregation::count).reversed())
                .toList();

        // 3. Aggregate by Category
        Map<ReportCategory, Long> byCatMap = filtered.stream()
                .collect(Collectors.groupingBy(TransparencyReport::getReportCategory, Collectors.counting()));

        List<CategoryAggregation> categoryAggs = byCatMap.entrySet().stream()
                .map(e -> {
                    double pct = (total == 0) ? 0.0 : Math.round((e.getValue() * 100.0 / total) * 10.0) / 10.0;
                    return new CategoryAggregation(e.getKey().name(), e.getKey().getDisplayName(), e.getValue(), pct);
                })
                .sorted(Comparator.comparingLong(CategoryAggregation::count).reversed())
                .toList();

        VerifiedOfficialGrievanceInfo officialInfo = new VerifiedOfficialGrievanceInfo(
                true,
                CENTRAL_GRIEVANCE_URL,
                STATE_GRIEVANCE_URLS,
                "1064",
                "Official government grievance and anti-corruption portals for lodging statutory complaints."
        );

        CrowdsourcedDisclaimer disclaimer = new CrowdsourcedDisclaimer(
                false,
                "These summary statistics reflect unverified citizen-reported complaints for civic transparency. "
                        + "They represent community feedback and allegations, not verified judicial findings or official government determinations."
        );

        return new TransparencySummaryResponse(
                total,
                state,
                district,
                department,
                districtAggs,
                deptAggs,
                categoryAggs,
                officialInfo,
                disclaimer
        );
    }

    @Transactional(readOnly = true)
    public SchemeTransparencyInfo getSchemeTransparency(UUID schemeId) {
        Scheme scheme = schemeRepository.findById(schemeId)
                .orElseThrow(() -> new ResourceNotFoundException("Scheme not found with ID: " + schemeId));
        return SchemeTransparencyInfo.from(scheme);
    }

    private String findTopCategory(List<TransparencyReport> reports) {
        if (reports.isEmpty()) return "N/A";
        return reports.stream()
                .collect(Collectors.groupingBy(TransparencyReport::getReportCategory, Collectors.counting()))
                .entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(e -> e.getKey().name())
                .orElse("OTHER");
    }

    private String resolveGrievanceUrl(String state) {
        if (state != null) {
            String url = STATE_GRIEVANCE_URLS.get(state.trim());
            if (url != null) return url;
        }
        return CENTRAL_GRIEVANCE_URL;
    }
}
