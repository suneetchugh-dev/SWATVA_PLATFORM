package in.swatva.ai.api;

import in.swatva.ai.service.ChatService;
import in.swatva.common.api.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ChatResponse>> chat(
            @Valid @RequestBody ChatRequest request,
            Authentication authentication) {
        String email = authentication != null ? authentication.getName() : null;
        ChatResponse response = chatService.processChat(request, email);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/sessions")
    public ResponseEntity<ApiResponse<List<ChatSessionSummaryResponse>>> getSessions(
            Authentication authentication) {
        String email = authentication != null ? authentication.getName() : null;
        List<ChatSessionSummaryResponse> sessions = chatService.getUserSessions(email);
        return ResponseEntity.ok(ApiResponse.success(sessions));
    }

    @GetMapping("/sessions/{sessionId}")
    public ResponseEntity<ApiResponse<ChatSessionDetailsResponse>> getSessionDetails(
            @PathVariable UUID sessionId,
            Authentication authentication) {
        String email = authentication != null ? authentication.getName() : null;
        return chatService.getSessionDetails(sessionId, email)
                .map(details -> ResponseEntity.ok(ApiResponse.success(details)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> deleteSession(
            @PathVariable UUID sessionId,
            Authentication authentication) {
        String email = authentication != null ? authentication.getName() : null;
        boolean deleted = chatService.deleteSession(sessionId, email);
        return ResponseEntity.ok(ApiResponse.success(Map.of("deleted", deleted, "sessionId", sessionId)));
    }

    @DeleteMapping("/sessions")
    public ResponseEntity<ApiResponse<Map<String, Object>>> deleteAllSessions(
            Authentication authentication) {
        String email = authentication != null ? authentication.getName() : null;
        chatService.deleteAllSessions(email);
        return ResponseEntity.ok(ApiResponse.success(Map.of("deletedAll", true)));
    }
}

