package in.swatva.scheme;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import in.swatva.common.exception.ResourceNotFoundException;
import in.swatva.eligibility.EligibilityResult;
import in.swatva.eligibility.EligibilityService;
import in.swatva.eligibility.EligibilityStatus;
import in.swatva.scheme.api.BenefitController.BenefitRecommendation;
import in.swatva.scheme.api.BenefitController.RecommendedBenefitsResponse;
import in.swatva.scheme.model.Scheme;
import in.swatva.scheme.model.enums.GovernmentLevel;
import in.swatva.scheme.model.enums.SchemeStatus;
import in.swatva.scheme.repository.SchemeRepository;
import in.swatva.user.model.User;
import in.swatva.user.model.UserProfile;
import in.swatva.user.repository.UserProfileRepository;
import in.swatva.user.repository.UserRepository;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class BenefitDiscoveryServiceTest {
    private UserRepository users;
    private UserProfileRepository profiles;
    private SchemeRepository schemes;
    private EligibilityService eligibilityService;
    private ChecklistService checklistService;
    private BenefitDiscoveryService benefitDiscoveryService;

    @BeforeEach
    void setUp() {
        users = mock(UserRepository.class);
        profiles = mock(UserProfileRepository.class);
        schemes = mock(SchemeRepository.class);
        eligibilityService = mock(EligibilityService.class);
        checklistService = new ChecklistService(schemes, users, profiles, new in.swatva.eligibility.EligibilityRuleEvaluator());
        benefitDiscoveryService = new BenefitDiscoveryService(users, profiles, schemes, eligibilityService, checklistService);
    }

    @Test
    void throwsWhenUserNotFound() {
        when(users.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> benefitDiscoveryService.getRecommendedBenefits("unknown@example.com"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("User not found");
    }

    @Test
    void separatesCentralAndStateBenefitsUsingProfileStateAndFiltersIneligible() {
        String email = "karnataka.user@example.com";
        User user = new User();
        user.setEmail(email);
        UUID userId = UUID.randomUUID();
        user.setId(userId);

        UserProfile profile = new UserProfile();
        profile.setUser(user);
        profile.setState("Karnataka");

        when(users.findByEmail(email)).thenReturn(Optional.of(user));
        when(profiles.findByUserId(userId)).thenReturn(Optional.of(profile));

        // Central schemes
        Scheme central1 = createScheme("PM-KISAN", GovernmentLevel.CENTRAL, null, SchemeStatus.ACTIVE);
        Scheme central2 = createScheme("Ineligible Scheme", GovernmentLevel.CENTRAL, null, SchemeStatus.ACTIVE);
        when(schemes.findByGovernmentLevel(GovernmentLevel.CENTRAL)).thenReturn(List.of(central1, central2));

        // State schemes
        Scheme state1 = createScheme("Gruha Jyothi", GovernmentLevel.STATE, "Karnataka", SchemeStatus.ACTIVE);
        when(schemes.findByGovernmentLevelAndStateIgnoreCase(GovernmentLevel.STATE, "Karnataka"))
                .thenReturn(List.of(state1));

        // Evaluations
        when(eligibilityService.evaluate(central1, profile)).thenReturn(new EligibilityResult(
                central1.getId(), central1.getName(), EligibilityStatus.ELIGIBLE, 100,
                List.of("Occupation requirement satisfied"), List.of(), List.of(), Map.of()
        ));
        when(eligibilityService.evaluate(central2, profile)).thenReturn(new EligibilityResult(
                central2.getId(), central2.getName(), EligibilityStatus.NOT_ELIGIBLE, 0,
                List.of(), List.of("Age requirement not satisfied"), List.of(), Map.of()
        ));
        when(eligibilityService.evaluate(state1, profile)).thenReturn(new EligibilityResult(
                state1.getId(), state1.getName(), EligibilityStatus.POTENTIALLY_ELIGIBLE, 80,
                List.of("State requirement satisfied"), List.of(), List.of("Income is missing"), Map.of()
        ));

        RecommendedBenefitsResponse response = benefitDiscoveryService.getRecommendedBenefits(email);

        assertThat(response.centralBenefits()).hasSize(1);
        BenefitRecommendation centralRec = response.centralBenefits().get(0);
        assertThat(centralRec.schemeName()).isEqualTo("PM-KISAN");
        assertThat(centralRec.matchPercentage()).isEqualTo(100);
        assertThat(centralRec.status()).isEqualTo(EligibilityStatus.ELIGIBLE);
        assertThat(centralRec.checklist()).isNotNull();
        assertThat(centralRec.checklist().schemeName()).isEqualTo("PM-KISAN");

        assertThat(response.stateBenefits()).hasSize(1);
        BenefitRecommendation stateRec = response.stateBenefits().get(0);
        assertThat(stateRec.schemeName()).isEqualTo("Gruha Jyothi");
        assertThat(stateRec.matchPercentage()).isEqualTo(80);
        assertThat(stateRec.status()).isEqualTo(EligibilityStatus.POTENTIALLY_ELIGIBLE);
        assertThat(stateRec.missingInformation()).containsExactly("Income is missing");
        assertThat(stateRec.checklist()).isNotNull();
        assertThat(stateRec.checklist().schemeName()).isEqualTo("Gruha Jyothi");

        assertThat(response.totalPotentialBenefits()).isEqualTo(2);
    }

    @Test
    void returnsEmptyStateBenefitsWhenUserHasNoStateRecorded() {
        String email = "nostate@example.com";
        User user = new User();
        user.setEmail(email);
        UUID userId = UUID.randomUUID();
        user.setId(userId);

        UserProfile profile = new UserProfile();
        profile.setUser(user);
        profile.setState(null); // No state

        when(users.findByEmail(email)).thenReturn(Optional.of(user));
        when(profiles.findByUserId(userId)).thenReturn(Optional.of(profile));

        Scheme central = createScheme("PMJJBY", GovernmentLevel.CENTRAL, null, SchemeStatus.ACTIVE);
        when(schemes.findByGovernmentLevel(GovernmentLevel.CENTRAL)).thenReturn(List.of(central));
        when(eligibilityService.evaluate(central, profile)).thenReturn(new EligibilityResult(
                central.getId(), central.getName(), EligibilityStatus.ELIGIBLE, 100,
                List.of("Age requirement satisfied"), List.of(), List.of(), Map.of()
        ));

        RecommendedBenefitsResponse response = benefitDiscoveryService.getRecommendedBenefits(email);

        assertThat(response.centralBenefits()).hasSize(1);
        assertThat(response.stateBenefits()).isEmpty();
        assertThat(response.totalPotentialBenefits()).isEqualTo(1);
    }

    @Test
    void handlesUserWithNoProfileRecordAtAll() {
        String email = "noprofile@example.com";
        User user = new User();
        user.setEmail(email);
        UUID userId = UUID.randomUUID();
        user.setId(userId);

        when(users.findByEmail(email)).thenReturn(Optional.of(user));
        when(profiles.findByUserId(userId)).thenReturn(Optional.empty());

        Scheme central = createScheme("PMSBY", GovernmentLevel.CENTRAL, null, SchemeStatus.ACTIVE);
        when(schemes.findByGovernmentLevel(GovernmentLevel.CENTRAL)).thenReturn(List.of(central));
        when(eligibilityService.evaluate(central, null)).thenReturn(new EligibilityResult(
                central.getId(), central.getName(), EligibilityStatus.NEEDS_INFORMATION, 0,
                List.of(), List.of(), List.of("Age is missing"), Map.of()
        ));

        RecommendedBenefitsResponse response = benefitDiscoveryService.getRecommendedBenefits(email);

        assertThat(response.centralBenefits()).hasSize(1);
        assertThat(response.centralBenefits().get(0).status()).isEqualTo(EligibilityStatus.NEEDS_INFORMATION);
        assertThat(response.stateBenefits()).isEmpty();
        assertThat(response.totalPotentialBenefits()).isEqualTo(1);
    }

    private Scheme createScheme(String name, GovernmentLevel level, String state, SchemeStatus status) {
        Scheme scheme = new Scheme();
        scheme.setId(UUID.randomUUID());
        scheme.setName(name);
        scheme.setCategory("General");
        scheme.setGovernmentLevel(level);
        scheme.setState(state);
        scheme.setBenefitInformation("Benefit details for " + name);
        scheme.setIssuingAuthority("Authority for " + name);
        scheme.setOfficialSourceUrl("https://gov.in/" + name);
        scheme.setStatus(status);
        return scheme;
    }
}
