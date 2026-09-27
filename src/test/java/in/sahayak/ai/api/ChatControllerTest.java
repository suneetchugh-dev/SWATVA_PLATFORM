package in.sahayak.ai.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import in.sahayak.ai.api.ChatResponse.ChatBenefitSummary;
import in.sahayak.ai.service.ChatService;
import in.sahayak.common.exception.GlobalExceptionHandler;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class ChatControllerTest {

    private ChatService chatService;
    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        chatService = mock(ChatService.class);
        ChatController controller = new ChatController(chatService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        objectMapper = new ObjectMapper().findAndRegisterModules();
    }

    @Test
    @DisplayName("POST /api/chat with Hindi message returns 200 OK with grounded reply")
    void postChat_hindi() throws Exception {
        UUID sessionId = UUID.randomUUID();
        UUID kisanId = UUID.randomUUID();

        ChatResponse response = new ChatResponse(
                sessionId,
                "नमस्ते! आपके लिए केंद्रीय योजना PM-KISAN और राज्य योजना Gruha Lakshmi उपलब्ध हैं।",
                "hi",
                true,
                kisanId,
                "PM-KISAN",
                List.of(new ChatBenefitSummary(kisanId, "PM-KISAN", "CENTRAL", "Agriculture", "₹6,000/year", "https://pmkisan.gov.in", "ELIGIBLE", 100)),
                null,
                null,
                List.of("https://pmkisan.gov.in")
        );

        when(chatService.processChat(any(ChatRequest.class), any())).thenReturn(response);

        String json = """
                {
                    "message": "मेरे लिए कौन सी सरकारी योजनाएं हैं?"
                }
                """;

        mockMvc.perform(post("/api/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.sessionId").value(sessionId.toString()))
                .andExpect(jsonPath("$.data.language").value("hi"))
                .andExpect(jsonPath("$.data.grounded").value(true))
                .andExpect(jsonPath("$.data.activeSchemeName").value("PM-KISAN"))
                .andExpect(jsonPath("$.data.reply").value(org.hamcrest.Matchers.containsString("PM-KISAN")));
    }

    @Test
    @DisplayName("POST /api/chat with blank message returns 400 Bad Request")
    void postChat_validationFailure() throws Exception {
        String json = """
                {
                    "message": ""
                }
                """;

        mockMvc.perform(post("/api/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_FAILED"));
    }
}
