package in.sahayak.scheme.api;

import in.sahayak.common.api.ApiResponse;
import in.sahayak.eligibility.EligibilityResult;
import in.sahayak.eligibility.EligibilityStatus;
import in.sahayak.scheme.BenefitDiscoveryService;
import in.sahayak.scheme.model.Scheme;
import in.sahayak.scheme.model.enums.GovernmentLevel;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/benefits")
public class BenefitController {
    private final BenefitDiscoveryService benefitDiscoveryService;

    public BenefitController(BenefitDiscoveryService benefitDiscoveryService) {
        this.benefitDiscoveryService = benefitDiscoveryService;
    }

    @GetMapping("/recommended")
    public ResponseEntity<ApiResponse<RecommendedBenefitsResponse>> recommended(Authentication authentication) {
        RecommendedBenefitsResponse response = benefitDiscoveryService.getRecommendedBenefits(authentication.getName());
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
            Map<String, Object> explanationData
    ) {
        public static BenefitRecommendation from(Scheme scheme, EligibilityResult result) {
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
                    result.explanationData()
            );
        }

        public String scheme() { return schemeName; }
        public EligibilityStatus eligibilityStatus() { return status; }
        public List<String> satisfied() { return satisfiedConditions; }
        public List<String> failed() { return failedConditions; }
        public List<String> missing() { return missingInformation; }
    }
}
