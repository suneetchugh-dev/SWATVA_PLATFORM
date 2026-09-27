package in.sahayak.scheme.api;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import in.sahayak.scheme.ChecklistService;
import in.sahayak.scheme.api.ActionChecklist.ChecklistDocument;
import in.sahayak.scheme.api.ActionChecklist.ChecklistStep;
import in.sahayak.scheme.repository.SchemeRepository;
import java.security.Principal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class SchemeControllerChecklistTest {
    private SchemeRepository schemeRepository;
    private ChecklistService checklistService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        schemeRepository = mock(SchemeRepository.class);
        checklistService = mock(ChecklistService.class);
        SchemeController controller = new SchemeController(schemeRepository, checklistService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void getChecklistReturnsStructuredActionChecklist() throws Exception {
        UUID schemeId = UUID.randomUUID();
        String email = "citizen@example.com";
        Principal principal = new UsernamePasswordAuthenticationToken(email, null);

        ActionChecklist checklist = new ActionChecklist(
                schemeId,
                "Gruha Jyothi",
                List.of(new ChecklistDocument("AADHAAR", "Aadhaar Card", true, "Proof of ID")),
                "Energy Department, Government of Karnataka",
                "https://karnataka.gov.in/gruha-jyothi",
                List.of(new ChecklistStep(1, "Register on Seva Sindhu", "Open the portal and submit connection details", "https://sevasindhu.karnataka.gov.in")),
                List.of("Applicant must be a Karnataka resident"),
                List.of("State information is missing")
        );

        when(checklistService.getChecklist(eq(schemeId), eq(email))).thenReturn(checklist);

        mockMvc.perform(get("/api/schemes/" + schemeId + "/checklist").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.schemeId").value(schemeId.toString()))
                .andExpect(jsonPath("$.data.schemeName").value("Gruha Jyothi"))
                .andExpect(jsonPath("$.data.whereToApply").value("Energy Department, Government of Karnataka"))
                .andExpect(jsonPath("$.data.officialApplicationUrl").value("https://karnataka.gov.in/gruha-jyothi"))
                .andExpect(jsonPath("$.data.requiredDocuments[0].code").value("AADHAAR"))
                .andExpect(jsonPath("$.data.requiredDocuments[0].name").value("Aadhaar Card"))
                .andExpect(jsonPath("$.data.requiredDocuments[0].required").value(true))
                .andExpect(jsonPath("$.data.applicationSteps[0].stepNumber").value(1))
                .andExpect(jsonPath("$.data.applicationSteps[0].title").value("Register on Seva Sindhu"))
                .andExpect(jsonPath("$.data.importantConditions[0]").value("Applicant must be a Karnataka resident"))
                .andExpect(jsonPath("$.data.missingUserInformation[0]").value("State information is missing"));
    }

    @Test
    void getChecklistWorksForUnauthenticatedCallers() throws Exception {
        UUID schemeId = UUID.randomUUID();

        ActionChecklist checklist = new ActionChecklist(
                schemeId,
                "PM-KISAN",
                List.of(new ChecklistDocument("BANK_ACCOUNT", "Bank Details", true, "Passbook")),
                "Ministry of Agriculture",
                "https://pmkisan.gov.in/",
                List.of(new ChecklistStep(1, "Apply Online", "Submit details", "https://pmkisan.gov.in")),
                List.of("Farmer occupation required"),
                List.of("Occupation information is missing")
        );

        when(checklistService.getChecklist(eq(schemeId), eq(null))).thenReturn(checklist);

        mockMvc.perform(get("/api/schemes/" + schemeId + "/checklist"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.schemeName").value("PM-KISAN"))
                .andExpect(jsonPath("$.data.requiredDocuments[0].code").value("BANK_ACCOUNT"))
                .andExpect(jsonPath("$.data.missingUserInformation[0]").value("Occupation information is missing"));
    }

    @Test
    void getTransparencyReturnsSchemeTransparencyInfo() throws Exception {
        UUID schemeId = UUID.randomUUID();
        in.sahayak.scheme.model.Scheme scheme = new in.sahayak.scheme.model.Scheme();
        scheme.setId(schemeId);
        scheme.setName("Gruha Jyothi");
        scheme.setGovernmentLevel(in.sahayak.scheme.model.enums.GovernmentLevel.STATE);
        scheme.setState("Karnataka");
        scheme.setOfficialApplicationFeeExists(false);
        scheme.setOfficialFeeAmount(0.0);
        scheme.setOfficialSourceUrl("https://karnataka.gov.in/gruha-jyothi");

        when(schemeRepository.findById(schemeId)).thenReturn(java.util.Optional.of(scheme));

        mockMvc.perform(get("/api/schemes/" + schemeId + "/transparency"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.schemeId").value(schemeId.toString()))
                .andExpect(jsonPath("$.data.schemeName").value("Gruha Jyothi"))
                .andExpect(jsonPath("$.data.officialApplicationFeeExists").value(false))
                .andExpect(jsonPath("$.data.transparencyWarning").value("This scheme is free to apply for \u2014 if anyone asks for money, it is illegal."))
                .andExpect(jsonPath("$.data.officialGrievanceUrl").value("https://ipgrs.karnataka.gov.in/"))
                .andExpect(jsonPath("$.data.verifiedOfficialInformation").value(true));
    }

    @Test
    void getSchemeDetailIncludesTransparencyInfo() throws Exception {
        UUID schemeId = UUID.randomUUID();
        in.sahayak.scheme.model.Scheme scheme = new in.sahayak.scheme.model.Scheme();
        scheme.setId(schemeId);
        scheme.setName("PMJJBY");
        scheme.setCategory("Insurance");
        scheme.setGovernmentLevel(in.sahayak.scheme.model.enums.GovernmentLevel.CENTRAL);
        scheme.setIssuingAuthority("Ministry of Finance");
        scheme.setOfficialApplicationFeeExists(true);
        scheme.setOfficialFeeAmount(436.0);
        scheme.setOfficialSourceUrl("https://beta.eshram.gov.in");

        when(schemeRepository.findById(schemeId)).thenReturn(java.util.Optional.of(scheme));

        mockMvc.perform(get("/api/schemes/" + schemeId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.scheme.name").value("PMJJBY"))
                .andExpect(jsonPath("$.data.transparency.officialApplicationFeeExists").value(true))
                .andExpect(jsonPath("$.data.transparency.officialFeeAmount").value(436.0))
                .andExpect(jsonPath("$.data.transparency.transparencyWarning").value(org.hamcrest.Matchers.containsString("Official processing fee of \u20B9436")));
    }
}

