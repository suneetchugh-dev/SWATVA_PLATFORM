package in.sahayak.transparency;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import in.sahayak.common.exception.ResourceNotFoundException;
import in.sahayak.scheme.model.Scheme;
import in.sahayak.scheme.model.enums.GovernmentLevel;
import in.sahayak.scheme.repository.SchemeRepository;
import in.sahayak.transparency.api.CreateTransparencyReportRequest;
import in.sahayak.transparency.api.SchemeTransparencyInfo;
import in.sahayak.transparency.api.TransparencyReportResponse;
import in.sahayak.transparency.api.TransparencySummaryResponse;
import in.sahayak.transparency.model.TransparencyReport;
import in.sahayak.transparency.model.enums.ReportCategory;
import in.sahayak.transparency.repository.TransparencyReportRepository;
import in.sahayak.transparency.service.TransparencyService;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class TransparencyServiceTest {

    private TransparencyReportRepository reportRepository;
    private SchemeRepository schemeRepository;
    private TransparencyService transparencyService;

    @BeforeEach
    void setUp() {
        reportRepository = mock(TransparencyReportRepository.class);
        schemeRepository = mock(SchemeRepository.class);
        transparencyService = new TransparencyService(reportRepository, schemeRepository);
    }

    @Test
    @DisplayName("Submit anonymous report stores report without citizen identity and provides state grievance portal")
    void submitAnonymousReport_success_karnataka() {
        UUID schemeId = UUID.randomUUID();
        Scheme scheme = new Scheme();
        scheme.setId(schemeId);
        scheme.setName("Gruha Lakshmi");

        when(schemeRepository.findById(schemeId)).thenReturn(Optional.of(scheme));
        when(reportRepository.save(any(TransparencyReport.class))).thenAnswer(invocation -> {
            TransparencyReport r = invocation.getArgument(0);
            r.setId(UUID.randomUUID());
            return r;
        });

        CreateTransparencyReportRequest request = new CreateTransparencyReportRequest(
                "Revenue Department",
                "Bangalore South Taluk Office",
                "Bangalore Urban",
                "Karnataka",
                ReportCategory.BRIBE_DEMAND,
                "Middleman demanded ₹500 for processing application at the counter.",
                schemeId,
                null
        );

        TransparencyReportResponse response = transparencyService.submitAnonymousReport(request);

        assertThat(response).isNotNull();
        assertThat(response.citizenAnonymousReport()).isTrue();
        assertThat(response.department()).isEqualTo("Revenue Department");
        assertThat(response.district()).isEqualTo("Bangalore Urban");
        assertThat(response.state()).isEqualTo("Karnataka");
        assertThat(response.reportCategory()).isEqualTo(ReportCategory.BRIBE_DEMAND);
        assertThat(response.officialGrievanceUrl()).isEqualTo("https://ipgrs.karnataka.gov.in/");

        ArgumentCaptor<TransparencyReport> captor = ArgumentCaptor.forClass(TransparencyReport.class);
        verify(reportRepository).save(captor.capture());
        TransparencyReport saved = captor.getValue();

        assertThat(saved.getDepartment()).isEqualTo("Revenue Department");
        assertThat(saved.getDistrict()).isEqualTo("Bangalore Urban");
        assertThat(saved.getState()).isEqualTo("Karnataka");
        assertThat(saved.getReportCategory()).isEqualTo(ReportCategory.BRIBE_DEMAND);
        assertThat(saved.getSchemeName()).isEqualTo("Gruha Lakshmi");
        assertThat(saved.getReportedAt()).isNotNull();
    }

    @Test
    @DisplayName("Submit report for non-Karnataka state returns Central CPGRAMS portal")
    void submitAnonymousReport_centralFallbackPortal() {
        when(reportRepository.save(any(TransparencyReport.class))).thenAnswer(invocation -> {
            TransparencyReport r = invocation.getArgument(0);
            r.setId(UUID.randomUUID());
            return r;
        });

        CreateTransparencyReportRequest request = new CreateTransparencyReportRequest(
                "Agriculture Department",
                "Block Office",
                "Patna",
                "Bihar",
                ReportCategory.UNAUTHORIZED_FEE,
                "Operator demanded unauthorized fee for uploading certificate.",
                null,
                "PM-KISAN"
        );

        TransparencyReportResponse response = transparencyService.submitAnonymousReport(request);

        assertThat(response.officialGrievanceUrl()).isEqualTo("https://pgportal.gov.in/");
    }

    @Test
    @DisplayName("Anonymized summary aggregates by district, department, and category with non-accusation guarantee")
    void getAnonymizedSummary_aggregatesProperly() {
        TransparencyReport r1 = createReport("Bangalore Urban", "Karnataka", "Revenue", ReportCategory.BRIBE_DEMAND);
        TransparencyReport r2 = createReport("Bangalore Urban", "Karnataka", "Revenue", ReportCategory.BRIBE_DEMAND);
        TransparencyReport r3 = createReport("Bangalore Urban", "Karnataka", "Food & Civil Supplies", ReportCategory.APPLICATION_DELAY);
        TransparencyReport r4 = createReport("Mysore", "Karnataka", "Revenue", ReportCategory.MIDDLEMAN_EXPLOITATION);

        when(reportRepository.findAll()).thenReturn(List.of(r1, r2, r3, r4));

        TransparencySummaryResponse summary = transparencyService.getAnonymizedSummary(null, null, null);

        assertThat(summary.totalReports()).isEqualTo(4);

        // Districts aggregation
        assertThat(summary.byDistrict()).hasSize(2);
        assertThat(summary.byDistrict().get(0).district()).isEqualTo("Bangalore Urban");
        assertThat(summary.byDistrict().get(0).count()).isEqualTo(3);
        assertThat(summary.byDistrict().get(0).topCategory()).isEqualTo("BRIBE_DEMAND");
        assertThat(summary.byDistrict().get(1).district()).isEqualTo("Mysore");
        assertThat(summary.byDistrict().get(1).count()).isEqualTo(1);

        // Departments aggregation
        assertThat(summary.byDepartment()).hasSize(2);
        assertThat(summary.byDepartment().get(0).department()).isEqualTo("Revenue");
        assertThat(summary.byDepartment().get(0).count()).isEqualTo(3);
        assertThat(summary.byDepartment().get(1).department()).isEqualTo("Food & Civil Supplies");
        assertThat(summary.byDepartment().get(1).count()).isEqualTo(1);

        // Categories aggregation
        assertThat(summary.byCategory()).hasSize(3);
        var bribeCat = summary.byCategory().stream().filter(c -> c.category().equals("BRIBE_DEMAND")).findFirst().orElseThrow();
        assertThat(bribeCat.count()).isEqualTo(2);
        assertThat(bribeCat.percentage()).isEqualTo(50.0);

        // Epistemic distinction: verified official vs unverified crowdsourced notice
        assertThat(summary.officialInformation().verifiedOfficial()).isTrue();
        assertThat(summary.officialInformation().centralGrievancePortal()).isEqualTo("https://pgportal.gov.in/");
        assertThat(summary.officialInformation().antiCorruptionHelpline()).isEqualTo("1064");

        assertThat(summary.crowdsourcedNotice().verifiedOfficial()).isFalse();
        assertThat(summary.crowdsourcedNotice().notice()).contains("unverified citizen-reported complaints");
        assertThat(summary.crowdsourcedNotice().notice()).contains("allegations, not verified judicial findings");
    }

    @Test
    @DisplayName("Anonymized summary applies state, district, and department filters")
    void getAnonymizedSummary_withFilters() {
        TransparencyReport r1 = createReport("Bangalore Urban", "Karnataka", "Revenue", ReportCategory.BRIBE_DEMAND);
        TransparencyReport r2 = createReport("Mysore", "Karnataka", "Revenue", ReportCategory.BRIBE_DEMAND);
        TransparencyReport r3 = createReport("Pune", "Maharashtra", "Revenue", ReportCategory.APPLICATION_DELAY);

        when(reportRepository.findAll()).thenReturn(List.of(r1, r2, r3));

        TransparencySummaryResponse summary = transparencyService.getAnonymizedSummary("Karnataka", "Bangalore Urban", null);

        assertThat(summary.totalReports()).isEqualTo(1);
        assertThat(summary.byDistrict().get(0).district()).isEqualTo("Bangalore Urban");
        assertThat(summary.filterState()).isEqualTo("Karnataka");
        assertThat(summary.filterDistrict()).isEqualTo("Bangalore Urban");
    }

    @Test
    @DisplayName("Free scheme returns exact warning: This scheme is free to apply for — if anyone asks for money, it is illegal.")
    void getSchemeTransparency_freeScheme() {
        UUID schemeId = UUID.randomUUID();
        Scheme scheme = new Scheme();
        scheme.setId(schemeId);
        scheme.setName("PM-KISAN");
        scheme.setGovernmentLevel(GovernmentLevel.CENTRAL);
        scheme.setOfficialApplicationFeeExists(false);
        scheme.setOfficialFeeAmount(0.0);
        scheme.setOfficialSourceUrl("https://pmkisan.gov.in/");
        scheme.setOfficialApplicationChannel("Official PM-KISAN Portal / CSC");
        scheme.setOfficialGrievanceUrl("https://pgportal.gov.in/");

        when(schemeRepository.findById(schemeId)).thenReturn(Optional.of(scheme));

        SchemeTransparencyInfo info = transparencyService.getSchemeTransparency(schemeId);

        assertThat(info.officialApplicationFeeExists()).isFalse();
        assertThat(info.officialFeeAmount()).isEqualTo(0.0);
        assertThat(info.transparencyWarning())
                .isEqualTo("This scheme is free to apply for \u2014 if anyone asks for money, it is illegal.");
        assertThat(info.verifiedOfficialInformation()).isTrue();
        assertThat(info.officialGrievanceUrl()).isEqualTo("https://pgportal.gov.in/");
    }

    @Test
    @DisplayName("Paid scheme displays official processing fee and middleman bribe warning")
    void getSchemeTransparency_paidScheme() {
        UUID schemeId = UUID.randomUUID();
        Scheme scheme = new Scheme();
        scheme.setId(schemeId);
        scheme.setName("Pradhan Mantri Jeevan Jyoti Bima Yojana (PMJJBY)");
        scheme.setGovernmentLevel(GovernmentLevel.CENTRAL);
        scheme.setOfficialApplicationFeeExists(true);
        scheme.setOfficialFeeAmount(436.0);
        scheme.setOfficialSourceUrl("https://www.beta.eshram.gov.in/");
        scheme.setOfficialApplicationChannel("Participating Banks / Post Offices");
        scheme.setOfficialGrievanceUrl("https://pgportal.gov.in/");

        when(schemeRepository.findById(schemeId)).thenReturn(Optional.of(scheme));

        SchemeTransparencyInfo info = transparencyService.getSchemeTransparency(schemeId);

        assertThat(info.officialApplicationFeeExists()).isTrue();
        assertThat(info.officialFeeAmount()).isEqualTo(436.0);
        assertThat(info.transparencyWarning()).contains("Official processing fee of \u20B9436");
        assertThat(info.transparencyWarning()).contains("middlemen is illegal");
        assertThat(info.verifiedOfficialInformation()).isTrue();
    }

    @Test
    @DisplayName("Get scheme transparency throws ResourceNotFoundException if scheme not found")
    void getSchemeTransparency_notFound() {
        UUID schemeId = UUID.randomUUID();
        when(schemeRepository.findById(schemeId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> transparencyService.getSchemeTransparency(schemeId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining(schemeId.toString());
    }

    private TransparencyReport createReport(String district, String state, String department, ReportCategory category) {
        TransparencyReport r = new TransparencyReport();
        r.setId(UUID.randomUUID());
        r.setDistrict(district);
        r.setState(state);
        r.setDepartment(department);
        r.setReportCategory(category);
        r.setDescription("Citizen complaint description");
        r.setReportedAt(Instant.now());
        return r;
    }
}
