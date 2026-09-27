package in.swatva.eligibility;

import in.swatva.common.exception.ResourceNotFoundException;
import in.swatva.eligibility.EligibilityRuleEvaluator.Outcome;
import in.swatva.scheme.model.Scheme;
import in.swatva.scheme.model.enums.GovernmentLevel;
import in.swatva.scheme.model.enums.SchemeStatus;
import in.swatva.scheme.repository.SchemeRepository;
import in.swatva.user.model.User;
import in.swatva.user.model.UserProfile;
import in.swatva.user.repository.UserProfileRepository;
import in.swatva.user.repository.UserRepository;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EligibilityService {
    private final UserRepository users;
    private final UserProfileRepository profiles;
    private final SchemeRepository schemes;
    private final EligibilityRuleEvaluator evaluator;

    public EligibilityService(UserRepository users, UserProfileRepository profiles, SchemeRepository schemes,
                              EligibilityRuleEvaluator evaluator) {
        this.users = users;
        this.profiles = profiles;
        this.schemes = schemes;
        this.evaluator = evaluator;
    }

    @Transactional(readOnly = true)
    public List<EligibilityResult> matchesFor(String email) {
        User user = users.findByEmail(email).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        UserProfile profile = profiles.findByUserId(user.getId()).orElse(null);
        Stream<Scheme> catalogue = schemes.findByGovernmentLevel(GovernmentLevel.CENTRAL).stream();
        if (profile != null && profile.getState() != null && !profile.getState().isBlank()) {
            catalogue = Stream.concat(catalogue, schemes.findByGovernmentLevelAndStateIgnoreCase(GovernmentLevel.STATE, profile.getState().trim()).stream());
        }
        return catalogue.filter(scheme -> scheme.getStatus() == SchemeStatus.ACTIVE)
                .map(scheme -> evaluate(scheme, profile))
                .sorted(Comparator.comparing(EligibilityResult::scheme))
                .toList();
    }

    public EligibilityResult evaluate(Scheme scheme, UserProfile profile) {
        EligibilityRuleEvaluator.Evaluation evaluation = evaluator.evaluate(scheme.getEligibilityRules(), profile);
        int total = evaluation.total();
        int satisfied = evaluation.count(Outcome.SATISFIED);
        int failed = evaluation.count(Outcome.FAILED);
        int missing = evaluation.count(Outcome.MISSING);
        EligibilityStatus status = failed > 0 ? EligibilityStatus.NOT_ELIGIBLE
                : (satisfied > 0 && missing == 0) ? EligibilityStatus.ELIGIBLE
                : satisfied > 0 ? EligibilityStatus.POTENTIALLY_ELIGIBLE : EligibilityStatus.NEEDS_INFORMATION;
        int percentage = total == 0 ? 0 : Math.round((satisfied * 100.0f) / total);
        return new EligibilityResult(scheme.getId(), scheme.getName(), status, percentage,
                evaluation.messages(Outcome.SATISFIED), evaluation.messages(Outcome.FAILED), evaluation.messages(Outcome.MISSING),
                Map.of("evaluatedRuleCount", total, "satisfiedCount", satisfied, "failedCount", failed, "missingCount", missing,
                        "decisionType", "DETERMINISTIC_RULE_EVALUATION"));
    }
}
