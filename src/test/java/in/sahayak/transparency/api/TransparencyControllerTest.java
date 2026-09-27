package in.sahayak.transparency.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import in.sahayak.common.exception.GlobalExceptionHandler;
import in.sahayak.common.exception.ResourceNotFoundException;
import in.sahayak.transparency.api.TransparencySummaryResponse.CrowdsourcedDisclaimer;
import in.sahayak.transparency.api.TransparencySummaryResponse.VerifiedOfficialGrievanceInfo;
import in.sahayak.transparency.model.enums.ReportCategory;
import in.sahayak.transparency.service.TransparencyService;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class TransparencyControllerTest {

    private TransparencyService transparencyService;
    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        transparencyService = mock(TransparencyService.class);
        TransparencyController controller = new TransparencyController(transparencyService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        objectMapper = new ObjectMapper().findAndRegisterModules();
    }

    @Test
    @DisplayName("POST /api/transparency/reports succeeds and returns 201 Created with anonymous report details")
    void submitAnonymousReport_success() throws Exception {
        UUID reportId = UUID.randomUUID();
        TransparencyReportResponse response = new TransparencyReportResponse(
                reportId,
                "Revenue",
                "Taluk Office",
                "Bangalore Urban",
                "Karnataka",
                ReportCategory.BRIBE_DEMAND,
                Instant.now(),
                "Anonymous report logged for civic transparency aggregation.",
                "To file an official statutory complaint with legal redress, please visit the official government grievance portal.",
                "https://ipgrs.karnataka.gov.in/",
                true
        );

        when(transparencyService.submitAnonymousReport(any(CreateTransparencyReportRequest.class)))
                .thenReturn(response);

        CreateTransparencyReportRequest request = new CreateTransparencyReportRequest(
                "Revenue",
                "Taluk Office",
                "Bangalore Urban",
                "Karnataka",
                ReportCategory.BRIBE_DEMAND,
                "Middleman demanded money for processing certificate.",
                null,
                null
        );

        mockMvc.perform(post("/api/transparency/reports")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/transparency/reports/" + reportId))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.reportId").value(reportId.toString()))
                .andExpect(jsonPath("$.data.department").value("Revenue"))
                .andExpect(jsonPath("$.data.citizenAnonymousReport").value(true))
                .andExpect(jsonPath("$.data.officialGrievanceUrl").value("https://ipgrs.karnataka.gov.in/"));
    }

    @Test
    @DisplayName("POST /api/transparency/reports with missing required fields returns 400 Bad Request")
    void submitAnonymousReport_validationFailure() throws Exception {
        // Missing department and short description (< 10 chars)
        String invalidJson = """
                {
                    "department": "",
                    "district": "Bangalore Urban",
                    "state": "Karnataka",
                    "reportCategory": "BRIBE_DEMAND",
                    "description": "Short"
                }
                """;

        mockMvc.perform(post("/api/transparency/reports")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_FAILED"));
    }

    @Test
    @DisplayName("GET /api/transparency/summary returns 200 OK with aggregated data and non-accusation disclaimer")
    void getSummary_success() throws Exception {
        TransparencySummaryResponse summary = new TransparencySummaryResponse(
                12,
                "Karnataka",
                null,
                null,
                List.of(new TransparencySummaryResponse.DistrictAggregation("Bangalore Urban", 8, "BRIBE_DEMAND")),
                List.of(new TransparencySummaryResponse.DepartmentAggregation("Revenue", 8, "BRIBE_DEMAND")),
                List.of(new TransparencySummaryResponse.CategoryAggregation("BRIBE_DEMAND", "Bribe Demand", 8, 66.7)),
                new VerifiedOfficialGrievanceInfo(true, "https://pgportal.gov.in/", Map.of("Karnataka", "https://ipgrs.karnataka.gov.in/"), "1064", "Official grievance portals"),
                new CrowdsourcedDisclaimer(false, "Unverified community feedback and allegations")
        );

        when(transparencyService.getAnonymizedSummary("Karnataka", null, null)).thenReturn(summary);

        mockMvc.perform(get("/api/transparency/summary")
                        .param("state", "Karnataka"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalReports").value(12))
                .andExpect(jsonPath("$.data.byDistrict[0].district").value("Bangalore Urban"))
                .andExpect(jsonPath("$.data.byDistrict[0].count").value(8))
                .andExpect(jsonPath("$.data.officialInformation.verifiedOfficial").value(true))
                .andExpect(jsonPath("$.data.crowdsourcedNotice.verifiedOfficial").value(false));
    }

    @Test
    @DisplayName("GET /api/transparency/schemes/{schemeId} returns 200 OK with scheme transparency info")
    void getSchemeTransparency_success() throws Exception {
        UUID schemeId = UUID.randomUUID();
        SchemeTransparencyInfo info = new SchemeTransparencyInfo(
                schemeId,
                "PM-KISAN",
                false,
                0.0,
                "Official Portal / CSC",
                "https://pmkisan.gov.in/",
                "This scheme is free to apply for \u2014 if anyone asks for money, it is illegal.",
                "https://pgportal.gov.in/",
                true,
                "Verified official information"
        );

        when(transparencyService.getSchemeTransparency(schemeId)).thenReturn(info);

        mockMvc.perform(get("/api/transparency/schemes/{schemeId}", schemeId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.schemeName").value("PM-KISAN"))
                .andExpect(jsonPath("$.data.officialApplicationFeeExists").value(false))
                .andExpect(jsonPath("$.data.transparencyWarning").value("This scheme is free to apply for \u2014 if anyone asks for money, it is illegal."))
                .andExpect(jsonPath("$.data.verifiedOfficialInformation").value(true));
    }

    @Test
    @DisplayName("GET /api/transparency/schemes/{schemeId} returns 404 when scheme not found")
    void getSchemeTransparency_notFound() throws Exception {
        UUID schemeId = UUID.randomUUID();
        when(transparencyService.getSchemeTransparency(schemeId))
                .thenThrow(new ResourceNotFoundException("Scheme not found with ID: " + schemeId));

        mockMvc.perform(get("/api/transparency/schemes/{schemeId}", schemeId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("RESOURCE_NOT_FOUND"));
    }
}
