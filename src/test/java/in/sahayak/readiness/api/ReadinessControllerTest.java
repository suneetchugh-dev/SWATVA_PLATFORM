package in.sahayak.readiness.api;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import in.sahayak.common.exception.GlobalExceptionHandler;
import in.sahayak.common.exception.ResourceNotFoundException;
import in.sahayak.readiness.model.enums.ReadinessTrafficLight;
import in.sahayak.readiness.service.ApplicationReadinessService;
import java.security.Principal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class ReadinessControllerTest {

    private ApplicationReadinessService readinessService;
    private MockMvc mockMvc;
    private Principal principal;

    @BeforeEach
    void setUp() {
        readinessService = mock(ApplicationReadinessService.class);
        ReadinessController controller = new ReadinessController(readinessService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        principal = new UsernamePasswordAuthenticationToken("user@example.com", null);
    }

    @Test
    void getSchemeReadinessReturnsReadinessResponseWithTrafficLight() throws Exception {
        UUID schemeId = UUID.randomUUID();
        UUID aadhaarId = UUID.randomUUID();

        ApplicationReadinessResponse response = new ApplicationReadinessResponse(
                schemeId,
                "PM-KISAN",
                75,
                ReadinessTrafficLight.YELLOW,
                4,
                3,
                1,
                0,
                0,
                List.of(ReadinessDocumentItem.complete("AADHAAR", "Aadhaar Card", true, aadhaarId, "aadhaar.pdf", LocalDate.of(2020, 1, 1), null)),
                List.of(ReadinessDocumentItem.missing("RATION_CARD", "Ration Card", true, "Ration card required")),
                List.of(),
                List.of()
        );

        when(readinessService.calculateReadiness(schemeId, "user@example.com")).thenReturn(response);

        mockMvc.perform(get("/api/readiness/scheme/" + schemeId).principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.readinessPercentage").value(75))
                .andExpect(jsonPath("$.data.status").value("YELLOW"))
                .andExpect(jsonPath("$.data.totalRequiredDocuments").value(4))
                .andExpect(jsonPath("$.data.completedDocuments").value(3))
                .andExpect(jsonPath("$.data.missingDocuments").value(1))
                .andExpect(jsonPath("$.data.invalidDocuments").value(0))
                .andExpect(jsonPath("$.data.documentsNeedingReview").value(0))
                .andExpect(jsonPath("$.data.completed[0].documentTypeCode").value("AADHAAR"))
                .andExpect(jsonPath("$.data.missing[0].documentTypeCode").value("RATION_CARD"))
                .andExpect(jsonPath("$.data.invalid").isEmpty())
                .andExpect(jsonPath("$.data.needsReview").isEmpty());
    }

    @Test
    void getSchemeReadinessReturns404WhenSchemeNotFound() throws Exception {
        UUID nonExistentId = UUID.randomUUID();

        when(readinessService.calculateReadiness(nonExistentId, "user@example.com"))
                .thenThrow(new ResourceNotFoundException("Scheme not found"));

        mockMvc.perform(get("/api/readiness/scheme/" + nonExistentId).principal(principal))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("RESOURCE_NOT_FOUND"))
                .andExpect(jsonPath("$.error.message").value("Scheme not found"));
    }
}
