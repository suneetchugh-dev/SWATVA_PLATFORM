package in.swatva.eligibility;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import in.swatva.common.exception.ResourceNotFoundException;
import in.swatva.scheme.model.Scheme;
import in.swatva.scheme.model.SchemeEligibilityRule;
import in.swatva.scheme.model.enums.GovernmentLevel;
import in.swatva.scheme.model.enums.SchemeStatus;
import in.swatva.scheme.repository.SchemeRepository;
import in.swatva.user.model.User;
import in.swatva.user.model.UserProfile;
import in.swatva.user.repository.UserProfileRepository;
import in.swatva.user.repository.UserRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class EligibilityServiceTest {
    private UserRepository users;
    private UserProfileRepository profiles;
    private SchemeRepository schemes;
    private EligibilityRuleEvaluator evaluator;
    private EligibilityService service;

    @BeforeEach
    void setUp() {
        users = mock(UserRepository.class);
        profiles = mock(UserProfileRepository.class);
        schemes = mock(SchemeRepository.class);
        evaluator = new EligibilityRuleEvaluator();
        service = new EligibilityService(users, profiles, schemes, evaluator);
    }

    @Test
    void throwsWhenUserNotFound() {
        when(users.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.matchesFor("unknown@example.com"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("User not found");
    }

    @Test
    void evaluatesCentralAndStateSchemesForUserState() {
        String email = "citizen@example.com";
        User user = new User();
        user.setEmail(email);
        UUID userId = UUID.randomUUID();
        user.setId(userId);

        UserProfile profile = new UserProfile();
        profile.setUser(user);
        profile.setState("Karnataka");
        profile.setAge(25);
        profile.setAnnualIncome(new BigDecimal("180000"));

        when(users.findByEmail(email)).thenReturn(Optional.of(user));
        when(profiles.findByUserId(userId)).thenReturn(Optional.of(profile));

        Scheme centralScheme = createScheme("PM-KISAN", GovernmentLevel.CENTRAL, null, SchemeStatus.ACTIVE);
        SchemeEligibilityRule centralRule = createRule("MIN_AGE", "18");
        centralScheme.setEligibilityRules(List.of(centralRule));

        Scheme stateScheme = createScheme("Yuva Nidhi", GovernmentLevel.STATE, "Karnataka", SchemeStatus.ACTIVE);
        SchemeEligibilityRule stateRule = createRule("MAX_AGE", "21"); // fails since user age is 25
        stateScheme.setEligibilityRules(List.of(stateRule));

        when(schemes.findByGovernmentLevel(GovernmentLevel.CENTRAL)).thenReturn(List.of(centralScheme));
        when(schemes.findByGovernmentLevelAndStateIgnoreCase(GovernmentLevel.STATE, "Karnataka"))
                .thenReturn(List.of(stateScheme));

        List<EligibilityResult> results = service.matchesFor(email);

        assertThat(results).hasSize(2);

        EligibilityResult pmKisan = results.stream().filter(r -> r.scheme().equals("PM-KISAN")).findFirst().orElseThrow();
        assertThat(pmKisan.status()).isEqualTo(EligibilityStatus.ELIGIBLE);
        assertThat(pmKisan.matchPercentage()).isEqualTo(100);
        assertThat(pmKisan.satisfiedConditions()).containsExactly("Minimum age of 18 satisfied");
        assertThat(pmKisan.failedConditions()).isEmpty();
        assertThat(pmKisan.missingInformation()).isEmpty();

        EligibilityResult yuvaNidhi = results.stream().filter(r -> r.scheme().equals("Yuva Nidhi")).findFirst().orElseThrow();
        assertThat(yuvaNidhi.status()).isEqualTo(EligibilityStatus.NOT_ELIGIBLE);
        assertThat(yuvaNidhi.matchPercentage()).isZero();
        assertThat(yuvaNidhi.failedConditions()).containsExactly("Maximum age of 21 not satisfied");
    }

    @Test
    void reportsNeedsInformationWhenRequiredProfileDataIsMissing() {
        String email = "newuser@example.com";
        User user = new User();
        user.setEmail(email);
        UUID userId = UUID.randomUUID();
        user.setId(userId);

        when(users.findByEmail(email)).thenReturn(Optional.of(user));
        when(profiles.findByUserId(userId)).thenReturn(Optional.empty()); // profile not created yet

        Scheme centralScheme = createScheme("AB-PMJAY", GovernmentLevel.CENTRAL, null, SchemeStatus.ACTIVE);
        SchemeEligibilityRule rule1 = createRule("MIN_AGE", "18");
        SchemeEligibilityRule rule2 = createRule("MAX_INCOME", "200000");
        centralScheme.setEligibilityRules(List.of(rule1, rule2));

        when(schemes.findByGovernmentLevel(GovernmentLevel.CENTRAL)).thenReturn(List.of(centralScheme));

        List<EligibilityResult> results = service.matchesFor(email);

        assertThat(results).hasSize(1);
        EligibilityResult result = results.get(0);
        assertThat(result.status()).isEqualTo(EligibilityStatus.NEEDS_INFORMATION);
        assertThat(result.matchPercentage()).isZero();
        assertThat(result.failedConditions()).isEmpty();
        assertThat(result.missingInformation()).hasSize(2);
    }

    @Test
    void reportsPotentiallyEligibleWhenSomeConditionsSatisfiedAndOthersMissing() {
        String email = "partial@example.com";
        User user = new User();
        user.setEmail(email);
        UUID userId = UUID.randomUUID();
        user.setId(userId);

        UserProfile profile = new UserProfile();
        profile.setUser(user);
        profile.setAge(25);
        profile.setAnnualIncome(null); // missing income

        when(users.findByEmail(email)).thenReturn(Optional.of(user));
        when(profiles.findByUserId(userId)).thenReturn(Optional.of(profile));

        Scheme centralScheme = createScheme("Income Support", GovernmentLevel.CENTRAL, null, SchemeStatus.ACTIVE);
        SchemeEligibilityRule rule1 = createRule("MIN_AGE", "18"); // satisfied
        SchemeEligibilityRule rule2 = createRule("MAX_INCOME", "200000"); // missing
        centralScheme.setEligibilityRules(List.of(rule1, rule2));

        when(schemes.findByGovernmentLevel(GovernmentLevel.CENTRAL)).thenReturn(List.of(centralScheme));

        List<EligibilityResult> results = service.matchesFor(email);

        assertThat(results).hasSize(1);
        EligibilityResult result = results.get(0);
        assertThat(result.status()).isEqualTo(EligibilityStatus.POTENTIALLY_ELIGIBLE);
        assertThat(result.matchPercentage()).isEqualTo(50);
        assertThat(result.satisfiedConditions()).containsExactly("Minimum age of 18 satisfied");
        assertThat(result.missingInformation()).containsExactly("Income is missing (maximum income 200000)");
        assertThat(result.failedConditions()).isEmpty();
    }

    private Scheme createScheme(String name, GovernmentLevel level, String state, SchemeStatus status) {
        Scheme scheme = new Scheme();
        scheme.setId(UUID.randomUUID());
        scheme.setName(name);
        scheme.setGovernmentLevel(level);
        scheme.setState(state);
        scheme.setStatus(status);
        return scheme;
    }

    private SchemeEligibilityRule createRule(String ruleType, String ruleValue) {
        SchemeEligibilityRule rule = new SchemeEligibilityRule();
        rule.setId(UUID.randomUUID());
        rule.setRuleType(ruleType);
        rule.setRuleValue(ruleValue);
        rule.setRuleDescription("Rule for " + ruleType);
        return rule;
    }
}
