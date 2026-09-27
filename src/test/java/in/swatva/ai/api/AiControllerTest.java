package in.swatva.ai.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import in.swatva.ai.service.SchemeRagService;
import in.swatva.ai.service.SchemeVectorIndexingService;
import in.swatva.common.exception.GlobalExceptionHandler;
import in.swatva.eligibility.EligibilityStatus;
import java.security.Principal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AiControllerTest {

    @Mock
    private SchemeRagService ragService;

    @Mock
    private SchemeVectorIndexingService indexingService;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        AiController controller = new AiController(ragService, indexingService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void querySchemes_returnsGroundedAnswer() throws Exception {
        UUID schemeId = UUID.randomUUID();
        SchemeQueryResponse queryResponse = new SchemeQueryResponse(
                "How much benefit under PM-KISAN?",
                "PM-KISAN provides ₹6,000 per year.",
                true,
                List.of(new SchemeCitation(schemeId, "PM-KISAN", "https://pmkisan.gov.in/", "BENEFITS")),
                List.of(new RetrievedChunkDto(UUID.randomUUID(), schemeId, "PM-KISAN", "BENEFITS", "₹6,000 per year", "https://pmkisan.gov.in/", 0.9))
        );

        when(ragService.askQuestion(any(SchemeQueryRequest.class))).thenReturn(queryResponse);

        SchemeQueryRequest request = new SchemeQueryRequest("How much benefit under PM-KISAN?", null, null);

        mockMvc.perform(post("/api/ai/scheme-query")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.query").value("How much benefit under PM-KISAN?"))
                .andExpect(jsonPath("$.data.answer").value("PM-KISAN provides ₹6,000 per year."))
                .andExpect(jsonPath("$.data.grounded").value(true))
                .andExpect(jsonPath("$.data.citations[0].schemeName").value("PM-KISAN"))
                .andExpect(jsonPath("$.data.citations[0].sourceUrl").value("https://pmkisan.gov.in/"));
    }

    @Test
    void querySchemes_withBlankQuery_returnsValidationError() throws Exception {
        SchemeQueryRequest invalidRequest = new SchemeQueryRequest("", null, null);

        mockMvc.perform(post("/api/ai/scheme-query")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_FAILED"));
    }

    @Test
    void explainSchemeMatch_returnsDeterministicExplanation() throws Exception {
        UUID schemeId = UUID.randomUUID();
        String email = "citizen@example.com";
        Principal principal = new UsernamePasswordAuthenticationToken(email, null);

        SchemeExplanationResponse explanationResponse = new SchemeExplanationResponse(
                schemeId,
                "Gruha Jyothi",
                "https://karnataka.gov.in/gruha-jyothi",
                EligibilityStatus.ELIGIBLE,
                100,
                "You are eligible for Gruha Jyothi because your profile indicates residence in Karnataka.",
                List.of("Resident of Karnataka"),
                List.of(),
                List.of(),
                List.of(new SchemeCitation(schemeId, "Gruha Jyothi", "https://karnataka.gov.in/gruha-jyothi", "ELIGIBILITY_EXPLANATION"))
        );

        when(ragService.explainSchemeMatch(eq(schemeId), eq(email))).thenReturn(explanationResponse);

        mockMvc.perform(post("/api/ai/scheme/" + schemeId + "/explanation")
                        .principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.schemeId").value(schemeId.toString()))
                .andExpect(jsonPath("$.data.schemeName").value("Gruha Jyothi"))
                .andExpect(jsonPath("$.data.eligibilityStatus").value("ELIGIBLE"))
                .andExpect(jsonPath("$.data.matchPercentage").value(100))
                .andExpect(jsonPath("$.data.satisfiedConditions[0]").value("Resident of Karnataka"))
                .andExpect(jsonPath("$.data.explanation").value(explanationResponse.explanation()));
    }

    @Test
    void indexAllSchemes_returnsSuccessResult() throws Exception {
        IndexResult indexResult = new IndexResult(16, 96, "Indexed 16 schemes with 96 document chunks.");
        when(indexingService.indexAllSchemes()).thenReturn(indexResult);

        mockMvc.perform(post("/api/ai/index"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.schemesIndexed").value(16))
                .andExpect(jsonPath("$.data.chunksIndexed").value(96));
    }
}
