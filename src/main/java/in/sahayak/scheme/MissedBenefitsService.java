package in.sahayak.scheme;

import in.sahayak.common.exception.ResourceNotFoundException;
import in.sahayak.eligibility.EligibilityResult;
import in.sahayak.eligibility.EligibilityService;
import in.sahayak.eligibility.EligibilityStatus;
import in.sahayak.scheme.MonetaryBenefitEstimator.EstimatedBenefit;
import in.sahayak.scheme.api.MissedBenefitsResponse;
import in.sahayak.scheme.api.SchemeBenefitValue;
import in.sahayak.scheme.model.Scheme;
import in.sahayak.scheme.model.enums.GovernmentLevel;
import in.sahayak.scheme.model.enums.SchemeStatus;
import in.sahayak.scheme.repository.SchemeRepository;
import in.sahayak.user.model.User;
import in.sahayak.user.model.UserProfile;
import in.sahayak.user.repository.UserProfileRepository;
import in.sahayak.user.repository.UserRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MissedBenefitsService {

    private static final Comparator<SchemeBenefitValue> VALUE_COMPARATOR =
            Comparator.comparing(SchemeBenefitValue::estimatedAnnualBenefit).reversed()
                    .thenComparing(SchemeBenefitValue::schemeName);

    private final UserRepository users;
    private final UserProfileRepository profiles;
    private final SchemeRepository schemes;
    private final EligibilityService eligibilityService;
    private final MonetaryBenefitEstimator benefitEstimator;

    public MissedBenefitsService(UserRepository users,
                                 UserProfileRepository profiles,
                                 SchemeRepository schemes,
                                 EligibilityService eligibilityService,
                                 MonetaryBenefitEstimator benefitEstimator) {
        this.users = users;
        this.profiles = profiles;
        this.schemes = schemes;
        this.eligibilityService = eligibilityService;
        this.benefitEstimator = benefitEstimator;
    }

    @Transactional(readOnly = true)
    public MissedBenefitsResponse getMissedBenefits(String email) {
        User user = users.findByEmail(email).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        UserProfile profile = profiles.findByUserId(user.getId()).orElse(null);

        List<Scheme> centralSchemes = schemes.findByGovernmentLevel(GovernmentLevel.CENTRAL);
        List<SchemeBenefitValue> centralBreakdown = evaluateAndFilter(centralSchemes, profile);

        String userState = profile != null && profile.getState() != null ? profile.getState().trim() : null;
        List<Scheme> stateSchemes = (userState != null && !userState.isBlank())
                ? schemes.findByGovernmentLevelAndStateIgnoreCase(GovernmentLevel.STATE, userState)
                : List.of();
        List<SchemeBenefitValue> stateBreakdown = evaluateAndFilter(stateSchemes, profile);

        long centralTotal = centralBreakdown.stream().mapToLong(SchemeBenefitValue::estimatedAnnualBenefit).sum();
        long stateTotal = stateBreakdown.stream().mapToLong(SchemeBenefitValue::estimatedAnnualBenefit).sum();

        List<SchemeBenefitValue> combinedBreakdown = new ArrayList<>();
        combinedBreakdown.addAll(centralBreakdown);
        combinedBreakdown.addAll(stateBreakdown);
        combinedBreakdown.sort(VALUE_COMPARATOR);

        return MissedBenefitsResponse.of(centralTotal, stateTotal, combinedBreakdown);
    }

    private List<SchemeBenefitValue> evaluateAndFilter(List<Scheme> candidateSchemes, UserProfile profile) {
        List<SchemeBenefitValue> list = new ArrayList<>();
        for (Scheme scheme : candidateSchemes) {
            if (scheme.getStatus() != SchemeStatus.ACTIVE) {
                continue;
            }

            EligibilityResult evaluation = eligibilityService.evaluate(scheme, profile);
            if (evaluation.status() == EligibilityStatus.NOT_ELIGIBLE) {
                continue;
            }

            Optional<EstimatedBenefit> optEstimated = benefitEstimator.estimateBenefit(scheme, profile);
            if (optEstimated.isEmpty() || optEstimated.get().annualAmount() <= 0) {
                continue;
            }

            EstimatedBenefit benefit = optEstimated.get();
            list.add(new SchemeBenefitValue(
                    scheme.getId(),
                    scheme.getName(),
                    scheme.getGovernmentLevel(),
                    scheme.getState(),
                    scheme.getCategory(),
                    benefit.annualAmount(),
                    benefit.period(),
                    scheme.getBenefitInformation(),
                    scheme.getOfficialSourceUrl(),
                    evaluation.status()
            ));
        }
        return list;
    }
}
