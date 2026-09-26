package in.sahayak.scheme;

import in.sahayak.common.exception.ResourceNotFoundException;
import in.sahayak.eligibility.EligibilityRuleEvaluator;
import in.sahayak.eligibility.EligibilityRuleEvaluator.Outcome;
import in.sahayak.scheme.api.ActionChecklist;
import in.sahayak.scheme.api.ActionChecklist.ChecklistDocument;
import in.sahayak.scheme.api.ActionChecklist.ChecklistStep;
import in.sahayak.scheme.model.Scheme;
import in.sahayak.scheme.model.SchemeApplicationStep;
import in.sahayak.scheme.model.SchemeEligibilityRule;
import in.sahayak.scheme.repository.SchemeRepository;
import in.sahayak.user.model.User;
import in.sahayak.user.model.UserProfile;
import in.sahayak.user.repository.UserProfileRepository;
import in.sahayak.user.repository.UserRepository;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ChecklistService {
    private final SchemeRepository schemes;
    private final UserRepository users;
    private final UserProfileRepository profiles;
    private final EligibilityRuleEvaluator evaluator;

    public ChecklistService(SchemeRepository schemes, UserRepository users,
                            UserProfileRepository profiles, EligibilityRuleEvaluator evaluator) {
        this.schemes = schemes;
        this.users = users;
        this.profiles = profiles;
        this.evaluator = evaluator;
    }

    @Transactional(readOnly = true)
    public ActionChecklist getChecklist(UUID schemeId, String userEmail) {
        Scheme scheme = schemes.findById(schemeId)
                .orElseThrow(() -> new ResourceNotFoundException("Scheme not found"));

        UserProfile profile = null;
        if (userEmail != null && !userEmail.isBlank()) {
            User user = users.findByEmail(userEmail).orElse(null);
            if (user != null) {
                profile = profiles.findByUserId(user.getId()).orElse(null);
            }
        }

        return generateChecklist(scheme, profile);
    }

    @Transactional(readOnly = true)
    public ActionChecklist generateChecklist(Scheme scheme, UserProfile profile) {
        List<ChecklistDocument> requiredDocuments = scheme.getDocumentRequirements().stream()
                .map(req -> new ChecklistDocument(
                        req.getDocumentType() != null ? req.getDocumentType().getCode() : "DOCUMENT",
                        req.getDocumentType() != null ? req.getDocumentType().getName() : "Required Document",
                        req.isRequired(),
                        req.getNotes()
                ))
                .toList();

        String whereToApply = determineWhereToApply(scheme);

        List<ChecklistStep> steps = scheme.getApplicationSteps().stream()
                .sorted(Comparator.comparing(SchemeApplicationStep::getStepNumber, Comparator.nullsLast(Integer::compareTo)))
                .map(step -> new ChecklistStep(
                        step.getStepNumber() != null ? step.getStepNumber() : 1,
                        step.getTitle(),
                        step.getInstructions(),
                        step.getOfficialUrl() != null ? step.getOfficialUrl() : scheme.getOfficialSourceUrl()
                ))
                .toList();

        List<String> importantConditions = scheme.getEligibilityRules().stream()
                .map(SchemeEligibilityRule::getRuleDescription)
                .filter(desc -> desc != null && !desc.isBlank())
                .distinct()
                .toList();

        List<String> missingInfo = evaluator.evaluate(scheme.getEligibilityRules(), profile)
                .messages(Outcome.MISSING);

        return new ActionChecklist(
                scheme.getId(),
                scheme.getName(),
                requiredDocuments,
                whereToApply,
                scheme.getOfficialSourceUrl(),
                steps,
                importantConditions,
                missingInfo
        );
    }

    private String determineWhereToApply(Scheme scheme) {
        String authority = scheme.getIssuingAuthority();
        if (authority != null && !authority.isBlank()) {
            return authority;
        }
        return "Official Scheme Portal";
    }
}
