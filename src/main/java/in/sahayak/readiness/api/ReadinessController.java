package in.sahayak.readiness.api;

import in.sahayak.common.api.ApiResponse;
import in.sahayak.readiness.service.ApplicationReadinessService;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/readiness")
public class ReadinessController {

    private final ApplicationReadinessService readinessService;

    public ReadinessController(ApplicationReadinessService readinessService) {
        this.readinessService = readinessService;
    }

    @GetMapping("/scheme/{schemeId}")
    public ResponseEntity<ApiResponse<ApplicationReadinessResponse>> getSchemeReadiness(
            Authentication authentication,
            @PathVariable("schemeId") UUID schemeId
    ) {
        ApplicationReadinessResponse response = readinessService.calculateReadiness(schemeId, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
