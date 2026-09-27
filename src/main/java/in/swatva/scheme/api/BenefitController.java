package in.swatva.scheme.api;

import in.swatva.common.api.ApiResponse;
import in.swatva.eligibility.EligibilityResult;
import in.swatva.eligibility.EligibilityStatus;
import in.swatva.scheme.BenefitDiscoveryService;
import in.swatva.scheme.MissedBenefitsService;
import in.swatva.scheme.model.Scheme;
import in.swatva.scheme.model.enums.GovernmentLevel;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import in.swatva.scheme.LifeEventBenefitDiscoveryService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/benefits")
public class BenefitController {
    private final BenefitDiscoveryService benefitDiscoveryService;
    private final MissedBenefitsService missedBenefitsService;
    private final LifeEventBenefitDiscoveryService lifeEventBenefitDiscoveryService;

    public BenefitController(BenefitDiscoveryService benefitDiscoveryService,
                             MissedBenefitsService missedBenefitsService,
                             LifeEventBenefitDiscoveryService lifeEventBenefitDiscoveryService) {
        this.benefitDiscoveryService = benefitDiscoveryService;
        this.missedBenefitsService = missedBenefitsService;
        this.lifeEventBenefitDiscoveryService = lifeEventBenefitDiscoveryService;
    }

    @GetMapping("/recommended")
    public ResponseEntity<ApiResponse<RecommendedBenefitsResponse>> recommended(Authentication authentication) {
        RecommendedBenefitsResponse response = benefitDiscoveryService.getRecommendedBenefits(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/missed-value")
    public ResponseEntity<ApiResponse<MissedBenefitsResponse>> missedValue(Authentication authentication) {
        MissedBenefitsResponse response = missedBenefitsService.getMissedBenefits(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/life-event")
    public ResponseEntity<ApiResponse<LifeEventDiscoveryResponse>> discoverFromLifeEvent(
            @Valid @RequestBody LifeEventDiscoveryRequest request,
            Authentication authentication) {
        String email = authentication != null ? authentication.getName() : null;
        LifeEventDiscoveryResponse response = lifeEventBenefitDiscoveryService.discoverBenefits(request, email);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    public record RecommendedBenefitsResponse(
            List<BenefitRecommendation> centralBenefits,
            List<BenefitRecommendation> stateBenefits,
            int totalPotentialBenefits
    ) {
        public static RecommendedBenefitsResponse of(
                List<BenefitRecommendation> central,
                List<BenefitRecommendation> state) {
            List<BenefitRecommendation> c = central == null ? List.of() : central;
            List<BenefitRecommendation> s = state == null ? List.of() : state;
            return new RecommendedBenefitsResponse(c, s, c.size() + s.size());
        }
    }

    public record BenefitRecommendation(
            UUID schemeId,
            String schemeName,
            String category,
            GovernmentLevel governmentLevel,
            String state,
            String benefitInformation,
            String issuingAuthority,
            String officialSourceUrl,
            EligibilityStatus status,
            int matchPercentage,
            List<String> satisfiedConditions,
            List<String> failedConditions,
            List<String> missingInformation,
            Map<String, Object> explanationData,
            ActionChecklist checklist
    ) {
        public static BenefitRecommendation from(Scheme scheme, EligibilityResult result, ActionChecklist checklist) {
            return new BenefitRecommendation(
                    scheme.getId(),
                    scheme.getName(),
                    scheme.getCategory(),
                    scheme.getGovernmentLevel(),
                    scheme.getState(),
                    scheme.getBenefitInformation(),
                    scheme.getIssuingAuthority(),
                    scheme.getOfficialSourceUrl(),
                    result.status(),
                    result.matchPercentage(),
                    result.satisfiedConditions(),
                    result.failedConditions(),
                    result.missingInformation(),
                    result.explanationData(),
                    checklist
            );
        }

        public String scheme() { return schemeName; }
        public EligibilityStatus eligibilityStatus() { return status; }
        public List<String> satisfied() { return satisfiedConditions; }
        public List<String> failed() { return failedConditions; }
        public List<String> missing() { return missingInformation; }
    }
}
