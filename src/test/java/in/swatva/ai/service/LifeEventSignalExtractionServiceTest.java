package in.swatva.ai.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import in.swatva.ai.api.LifeEventSignals;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.model.ChatModel;

class LifeEventSignalExtractionServiceTest {

    private ChatModel chatModel;
    private ObjectMapper objectMapper;
    private LifeEventSignalExtractionService extractionService;

    @BeforeEach
    void setUp() {
        chatModel = mock(ChatModel.class);
        objectMapper = new ObjectMapper().findAndRegisterModules();
        extractionService = new LifeEventSignalExtractionService(chatModel, objectMapper);
    }

    @Test
    @DisplayName("Extracts signals via LLM when ChatModel returns valid JSON")
    void extractSignals_viaLlm_success() {
        String llmJson = """
                {
                    "eventType": "FARMING_AGRICULTURE",
                    "affectedFamilyMember": "FATHER",
                    "occupation": "FARMER",
                    "education": null,
                    "location": "Karnataka",
                    "income": 200000.0,
                    "relevantCircumstances": [
                        "Father is a farmer",
                        "Family income below 2 lakh"
                    ]
                }
                """;

        when(chatModel.call(anyString())).thenReturn(llmJson);

        LifeEventSignals signals = extractionService.extractSignals(
                "My father is a farmer and our family income is below ₹2 lakh.");

        assertThat(signals.eventType()).isEqualTo("FARMING_AGRICULTURE");
        assertThat(signals.affectedFamilyMember()).isEqualTo("FATHER");
        assertThat(signals.occupation()).isEqualTo("FARMER");
        assertThat(signals.location()).isEqualTo("Karnataka");
        assertThat(signals.income()).isEqualTo(200000.0);
        assertThat(signals.relevantCircumstances()).contains("Father is a farmer");
    }

    @Test
    @DisplayName("Deterministic fallback correctly extracts: 'My daughter has recently started college.'")
    void fallback_daughterCollege() {
        LifeEventSignalExtractionService fallbackService = new LifeEventSignalExtractionService(null, objectMapper);

        LifeEventSignals signals = fallbackService.extractSignals("My daughter has recently started college.");

        assertThat(signals.eventType()).isEqualTo("HIGHER_EDUCATION");
        assertThat(signals.affectedFamilyMember()).isEqualTo("DAUGHTER");
        assertThat(signals.education()).isEqualTo("COLLEGE");
        assertThat(signals.occupation()).isEqualTo("STUDENT");
        assertThat(signals.relevantCircumstances()).isNotEmpty();
    }

    @Test
    @DisplayName("Deterministic fallback correctly extracts: 'My father is a farmer and our family income is below ₹2 lakh.'")
    void fallback_fatherFarmer() {
        LifeEventSignalExtractionService fallbackService = new LifeEventSignalExtractionService(null, objectMapper);

        LifeEventSignals signals = fallbackService.extractSignals(
                "My father is a farmer and our family income is below ₹2 lakh in Karnataka.");

        assertThat(signals.eventType()).isEqualTo("FARMING_AGRICULTURE");
        assertThat(signals.affectedFamilyMember()).isEqualTo("FATHER");
        assertThat(signals.occupation()).isEqualTo("FARMER");
        assertThat(signals.income()).isEqualTo(200000.0);
        assertThat(signals.location()).isEqualTo("Karnataka");
    }

    @Test
    @DisplayName("Deterministic fallback correctly extracts: 'I recently lost my job.'")
    void fallback_lostJob() {
        LifeEventSignalExtractionService fallbackService = new LifeEventSignalExtractionService(null, objectMapper);

        LifeEventSignals signals = fallbackService.extractSignals("I recently lost my job.");

        assertThat(signals.eventType()).isEqualTo("JOB_LOSS_UNEMPLOYMENT");
        assertThat(signals.affectedFamilyMember()).isEqualTo("SELF");
        assertThat(signals.occupation()).isEqualTo("UNEMPLOYED");
    }

    @Test
    @DisplayName("Fallback parsing handles numeric income formats like '₹1.5 lakh' and '200000'")
    void fallback_incomeFormats() {
        LifeEventSignalExtractionService fallbackService = new LifeEventSignalExtractionService(null, objectMapper);

        LifeEventSignals s1 = fallbackService.extractSignals("Our annual family income is below ₹1.5 lakh");
        assertThat(s1.income()).isEqualTo(150000.0);

        LifeEventSignals s2 = fallbackService.extractSignals("Total family income is 180000");
        assertThat(s2.income()).isEqualTo(180000.0);
    }
}
