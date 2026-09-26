package in.sahayak.eligibility.api;

import in.sahayak.common.api.ApiResponse;
import in.sahayak.eligibility.EligibilityResult;
import in.sahayak.eligibility.EligibilityService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/eligibility")
public class EligibilityController {
    private final EligibilityService eligibilityService;

    public EligibilityController(EligibilityService eligibilityService) {
        this.eligibilityService = eligibilityService;
    }

    @GetMapping("/matches")
    public ResponseEntity<ApiResponse<List<EligibilityResult>>> matches(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(eligibilityService.matchesFor(authentication.getName())));
    }
}
