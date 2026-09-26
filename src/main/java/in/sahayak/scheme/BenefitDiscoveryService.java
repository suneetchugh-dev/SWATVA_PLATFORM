package in.sahayak.scheme;

import in.sahayak.common.exception.ResourceNotFoundException;
import in.sahayak.eligibility.EligibilityResult;
import in.sahayak.eligibility.EligibilityService;
import in.sahayak.eligibility.EligibilityStatus;
import in.sahayak.scheme.api.BenefitController.BenefitRecommendation;
import in.sahayak.scheme.api.BenefitController.RecommendedBenefitsResponse;
import in.sahayak.scheme.model.Scheme;
import in.sahayak.scheme.model.enums.GovernmentLevel;
import in.sahayak.scheme.model.enums.SchemeStatus;
import in.sahayak.scheme.repository.SchemeRepository;
import in.sahayak.user.model.User;
import in.sahayak.user.model.UserProfile;
import in.sahayak.user.repository.UserProfileRepository;
import in.sahayak.user.repository.UserRepository;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BenefitDiscoveryService {
    private static final Comparator<BenefitRecommendation> RECOMMENDATION_COMPARATOR =
            Comparator.comparing(BenefitRecommendation::matchPercentage).reversed()
                    .thenComparing(BenefitRecommendation::schemeName);

    private final UserRepository users;
    private final UserProfileRepository profiles;
    private final SchemeRepository schemes;
    private final EligibilityService eligibilityService;
    private final ChecklistService checklistService;

    public BenefitDiscoveryService(UserRepository users, UserProfileRepository profiles,
                                   SchemeRepository schemes, EligibilityService eligibilityService,
                                   ChecklistService checklistService) {
        this.users = users;
        this.profiles = profiles;
        this.schemes = schemes;
        this.eligibilityService = eligibilityService;
        this.checklistService = checklistService;
    }

    @Transactional(readOnly = true)
    public RecommendedBenefitsResponse getRecommendedBenefits(String email) {
        User user = users.findByEmail(email).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        UserProfile profile = profiles.findByUserId(user.getId()).orElse(null);

        List<BenefitRecommendation> centralBenefits = findAndEvaluate(
                schemes.findByGovernmentLevel(GovernmentLevel.CENTRAL),
                profile
        );

        String userState = profile != null && profile.getState() != null ? profile.getState().trim() : null;
        List<BenefitRecommendation> stateBenefits = (userState != null && !userState.isBlank())
                ? findAndEvaluate(schemes.findByGovernmentLevelAndStateIgnoreCase(GovernmentLevel.STATE, userState), profile)
                : List.of();

        return RecommendedBenefitsResponse.of(centralBenefits, stateBenefits);
    }

    private List<BenefitRecommendation> findAndEvaluate(List<Scheme> candidateSchemes, UserProfile profile) {
        return candidateSchemes.stream()
                .filter(scheme -> scheme.getStatus() == SchemeStatus.ACTIVE)
                .map(scheme -> {
                    EligibilityResult evaluation = eligibilityService.evaluate(scheme, profile);
                    var checklist = checklistService.generateChecklist(scheme, profile);
                    return BenefitRecommendation.from(scheme, evaluation, checklist);
                })
                .filter(recommendation -> recommendation.status() != EligibilityStatus.NOT_ELIGIBLE)
                .sorted(RECOMMENDATION_COMPARATOR)
                .toList();
    }
}
