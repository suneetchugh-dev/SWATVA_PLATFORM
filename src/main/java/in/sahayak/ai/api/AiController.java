package in.sahayak.ai.api;

import in.sahayak.ai.service.SchemeRagService;
import in.sahayak.ai.service.SchemeVectorIndexingService;
import in.sahayak.common.api.ApiResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final SchemeRagService ragService;
    private final SchemeVectorIndexingService indexingService;

    public AiController(SchemeRagService ragService, SchemeVectorIndexingService indexingService) {
        this.ragService = ragService;
        this.indexingService = indexingService;
    }

    @PostMapping("/scheme-query")
    public ResponseEntity<ApiResponse<SchemeQueryResponse>> querySchemes(@Valid @RequestBody SchemeQueryRequest request) {
        SchemeQueryResponse response = ragService.askQuestion(request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/scheme/{id}/explanation")
    public ResponseEntity<ApiResponse<SchemeExplanationResponse>> explainSchemeMatch(
            @PathVariable UUID id,
            Authentication authentication) {
        String userEmail = authentication != null ? authentication.getName() : null;
        SchemeExplanationResponse response = ragService.explainSchemeMatch(id, userEmail);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/index")
    public ResponseEntity<ApiResponse<IndexResult>> indexAllSchemes() {
        IndexResult result = indexingService.indexAllSchemes();
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
