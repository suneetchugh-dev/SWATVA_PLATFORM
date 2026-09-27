package in.sahayak.scheme.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import in.sahayak.eligibility.EligibilityStatus;
import in.sahayak.scheme.BenefitDiscoveryService;
import in.sahayak.scheme.api.BenefitController.BenefitRecommendation;
import in.sahayak.scheme.api.BenefitController.RecommendedBenefitsResponse;
import in.sahayak.scheme.model.enums.GovernmentLevel;
import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class BenefitControllerTest {
    private BenefitDiscoveryService service;
    private in.sahayak.scheme.MissedBenefitsService missedBenefitsService;
    private in.sahayak.scheme.LifeEventBenefitDiscoveryService lifeEventService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        service = mock(BenefitDiscoveryService.class);
        missedBenefitsService = mock(in.sahayak.scheme.MissedBenefitsService.class);
        lifeEventService = mock(in.sahayak.scheme.LifeEventBenefitDiscoveryService.class);
        BenefitController controller = new BenefitController(service, missedBenefitsService, lifeEventService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new in.sahayak.common.exception.GlobalExceptionHandler())
                .build();
    }

    @Test
    void getRecommendedBenefitsReturnsExpectedStructure() throws Exception {
        String email = "test@example.com";
        Principal principal = new UsernamePasswordAuthenticationToken(email, null);
        UUID centralId = UUID.randomUUID();
        UUID stateId = UUID.randomUUID();

        ActionChecklist centralChecklist = new ActionChecklist(
                centralId, "PM-KISAN", List.of(), "Ministry of Agriculture", "https://pmkisan.gov.in",
                List.of(), List.of("Farmer requirement"), List.of()
        );

        ActionChecklist stateChecklist = new ActionChecklist(
                stateId, "Gruha Jyothi", List.of(), "Energy Dept", "https://karnataka.gov.in",
                List.of(), List.of("Karnataka resident"), List.of("Income missing")
        );

        BenefitRecommendation central = new BenefitRecommendation(
                centralId, "PM-KISAN", "Agriculture", GovernmentLevel.CENTRAL, null,
                "Income support", "Ministry of Agriculture", "https://pmkisan.gov.in",
                EligibilityStatus.ELIGIBLE, 100, List.of("Occupation satisfied"), List.of(), List.of(), Map.of(),
                centralChecklist
        );

        BenefitRecommendation state = new BenefitRecommendation(
                stateId, "Gruha Jyothi", "Utilities", GovernmentLevel.STATE, "Karnataka",
                "Free electricity", "Energy Dept", "https://karnataka.gov.in",
                EligibilityStatus.POTENTIALLY_ELIGIBLE, 75, List.of("State satisfied"), List.of(), List.of("Income missing"), Map.of(),
                stateChecklist
        );

        RecommendedBenefitsResponse response = RecommendedBenefitsResponse.of(List.of(central), List.of(state));
        when(service.getRecommendedBenefits(email)).thenReturn(response);

        mockMvc.perform(get("/api/benefits/recommended").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalPotentialBenefits").value(2))
                .andExpect(jsonPath("$.data.centralBenefits[0].schemeName").value("PM-KISAN"))
                .andExpect(jsonPath("$.data.centralBenefits[0].status").value("ELIGIBLE"))
                .andExpect(jsonPath("$.data.centralBenefits[0].matchPercentage").value(100))
                .andExpect(jsonPath("$.data.centralBenefits[0].satisfiedConditions[0]").value("Occupation satisfied"))
                .andExpect(jsonPath("$.data.centralBenefits[0].checklist.whereToApply").value("Ministry of Agriculture"))
                .andExpect(jsonPath("$.data.stateBenefits[0].schemeName").value("Gruha Jyothi"))
                .andExpect(jsonPath("$.data.stateBenefits[0].status").value("POTENTIALLY_ELIGIBLE"))
                .andExpect(jsonPath("$.data.stateBenefits[0].missingInformation[0]").value("Income missing"))
                .andExpect(jsonPath("$.data.stateBenefits[0].checklist.whereToApply").value("Energy Dept"));
    }

    @Test
    void getMissedBenefitsValueReturnsExpectedStructure() throws Exception {
        String email = "citizen@example.com";
        Principal principal = new UsernamePasswordAuthenticationToken(email, null);
        UUID centralId = UUID.randomUUID();
        UUID stateId = UUID.randomUUID();

        SchemeBenefitValue centralVal = new SchemeBenefitValue(
                centralId, "PM-KISAN", GovernmentLevel.CENTRAL, null, "Agriculture",
                25000L, "ANNUAL", "Income support", "https://pmkisan.gov.in", EligibilityStatus.ELIGIBLE
        );

        SchemeBenefitValue stateVal = new SchemeBenefitValue(
                stateId, "Gruha Lakshmi", GovernmentLevel.STATE, "Karnataka", "Women",
                17000L, "MONTHLY", "Financial assistance", "https://karnataka.gov.in", EligibilityStatus.POTENTIALLY_ELIGIBLE
        );

        MissedBenefitsResponse response = MissedBenefitsResponse.of(25000L, 17000L, List.of(centralVal, stateVal));
        when(missedBenefitsService.getMissedBenefits(email)).thenReturn(response);

        mockMvc.perform(get("/api/benefits/missed-value").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalEstimatedAnnualBenefit").value(42000))
                .andExpect(jsonPath("$.data.central").value(25000))
                .andExpect(jsonPath("$.data.state").value(17000))
                .andExpect(jsonPath("$.data.totalMissedBenefits").value(2))
                .andExpect(jsonPath("$.data.headlineMessage").value("You may be missing benefits worth approximately ₹42,000/year."))
                .andExpect(jsonPath("$.data.disclaimer").isNotEmpty())
                .andExpect(jsonPath("$.data.breakdown[0].schemeName").value("PM-KISAN"))
                .andExpect(jsonPath("$.data.breakdown[0].estimatedAnnualBenefit").value(25000))
                .andExpect(jsonPath("$.data.breakdown[1].schemeName").value("Gruha Lakshmi"))
                .andExpect(jsonPath("$.data.breakdown[1].estimatedAnnualBenefit").value(17000));
    }

    @Test
    void postLifeEventReturnsStructuredDiscoveryResponse() throws Exception {
        UUID centralId = UUID.randomUUID();
        in.sahayak.ai.api.LifeEventSignals signals = in.sahayak.ai.api.LifeEventSignals.of(
                "FARMING_AGRICULTURE", "FATHER", "FARMER", null, "Karnataka", 200000.0,
                List.of("Father is a farmer", "Family income below \u20B92 lakh")
        );

        LifeEventSchemeMatch match = new LifeEventSchemeMatch(
                centralId, "PM-KISAN", "Agriculture", GovernmentLevel.CENTRAL, null,
                "Income support of \u20B96,000/year", "Ministry of Agriculture", "https://pmkisan.gov.in",
                EligibilityStatus.ELIGIBLE, 100,
                "Satisfied scheme criteria: Applicant occupation must be farmer. Matched farming occupation.",
                List.of("Applicant occupation must be farmer."),
                List.of(),
                List.of(),
                List.of("PM-KISAN income support of \u20B96,000 per year")
        );

        LifeEventDiscoveryResponse response = LifeEventDiscoveryResponse.of(
                "My father is a farmer and our family income is below \u20B92 lakh.",
                signals,
                List.of(match),
                List.of()
        );

        when(lifeEventService.discoverBenefits(any(LifeEventDiscoveryRequest.class), any())).thenReturn(response);

        String json = """
                {
                    "description": "My father is a farmer and our family income is below ₹2 lakh."
                }
                """;

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/benefits/life-event")
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.lifeEventDescription").value("My father is a farmer and our family income is below ₹2 lakh."))
                .andExpect(jsonPath("$.data.extractedSignals.eventType").value("FARMING_AGRICULTURE"))
                .andExpect(jsonPath("$.data.extractedSignals.affectedFamilyMember").value("FATHER"))
                .andExpect(jsonPath("$.data.extractedSignals.occupation").value("FARMER"))
                .andExpect(jsonPath("$.data.extractedSignals.income").value(200000.0))
                .andExpect(jsonPath("$.data.totalSurfacedSchemes").value(1))
                .andExpect(jsonPath("$.data.centralSchemes[0].schemeName").value("PM-KISAN"))
                .andExpect(jsonPath("$.data.centralSchemes[0].eligibilityStatus").value("ELIGIBLE"))
                .andExpect(jsonPath("$.data.centralSchemes[0].matchPercentage").value(100))
                .andExpect(jsonPath("$.data.centralSchemes[0].whySurfaced").isNotEmpty());
    }

    @Test
    void postLifeEventWithEmptyDescriptionReturnsBadRequest() throws Exception {
        String json = """
                {
                    "description": ""
                }
                """;

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/benefits/life-event")
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_FAILED"));
    }
}
