package in.sahayak.scheme.api;

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
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        service = mock(BenefitDiscoveryService.class);
        BenefitController controller = new BenefitController(service);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
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
}
