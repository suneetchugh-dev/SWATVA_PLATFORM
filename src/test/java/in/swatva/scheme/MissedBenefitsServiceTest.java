package in.swatva.scheme;

import in.swatva.common.exception.ResourceNotFoundException;
import in.swatva.eligibility.EligibilityResult;
import in.swatva.eligibility.EligibilityService;
import in.swatva.eligibility.EligibilityStatus;
import in.swatva.scheme.MonetaryBenefitEstimator.EstimatedBenefit;
import in.swatva.scheme.api.MissedBenefitsResponse;
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
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MissedBenefitsServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserProfileRepository profileRepository;

    @Mock
    private SchemeRepository schemeRepository;

    @Mock
    private EligibilityService eligibilityService;

    @Mock
    private MonetaryBenefitEstimator benefitEstimator;

    private MissedBenefitsService service;

    @BeforeEach
    void setUp() {
        service = new MissedBenefitsService(
                userRepository,
                profileRepository,
                schemeRepository,
                eligibilityService,
                benefitEstimator
        );
    }

    @Test
    void getMissedBenefits_userNotFound_throwsResourceNotFoundException() {
        when(userRepository.findByEmail("nonexistent@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getMissedBenefits("nonexistent@example.com"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("User not found");
    }

    @Test
    void getMissedBenefits_calculatesTotalsAndBreakdownAccurately() {
        String email = "citizen@example.com";
        UUID userId = UUID.randomUUID();

        User user = new User();
        user.setId(userId);
        user.setEmail(email);

        UserProfile profile = new UserProfile();
        profile.setState("Karnataka");

        Scheme pmKisan = new Scheme();
        pmKisan.setId(UUID.randomUUID());
        pmKisan.setName("PM-KISAN");
        pmKisan.setGovernmentLevel(GovernmentLevel.CENTRAL);
        pmKisan.setStatus(SchemeStatus.ACTIVE);
        pmKisan.setBenefitInformation("₹6,000 per year");

        Scheme gruhaLakshmi = new Scheme();
        gruhaLakshmi.setId(UUID.randomUUID());
        gruhaLakshmi.setName("Gruha Lakshmi");
        gruhaLakshmi.setGovernmentLevel(GovernmentLevel.STATE);
        gruhaLakshmi.setState("Karnataka");
        gruhaLakshmi.setStatus(SchemeStatus.ACTIVE);
        gruhaLakshmi.setBenefitInformation("₹2,000 per month");

        Scheme gruhaJyothi = new Scheme();
        gruhaJyothi.setId(UUID.randomUUID());
        gruhaJyothi.setName("Gruha Jyothi");
        gruhaJyothi.setGovernmentLevel(GovernmentLevel.STATE);
        gruhaJyothi.setState("Karnataka");
        gruhaJyothi.setStatus(SchemeStatus.ACTIVE);
        gruhaJyothi.setBenefitInformation("Free 200 units electricity");

        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));
        when(profileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));

        when(schemeRepository.findByGovernmentLevel(GovernmentLevel.CENTRAL))
                .thenReturn(List.of(pmKisan));
        when(schemeRepository.findByGovernmentLevelAndStateIgnoreCase(GovernmentLevel.STATE, "Karnataka"))
                .thenReturn(List.of(gruhaLakshmi, gruhaJyothi));

        when(eligibilityService.evaluate(pmKisan, profile))
                .thenReturn(new EligibilityResult(pmKisan.getId(), pmKisan.getName(), EligibilityStatus.ELIGIBLE, 100, List.of(), List.of(), List.of(), Map.of()));
        when(eligibilityService.evaluate(gruhaLakshmi, profile))
                .thenReturn(new EligibilityResult(gruhaLakshmi.getId(), gruhaLakshmi.getName(), EligibilityStatus.POTENTIALLY_ELIGIBLE, 80, List.of(), List.of(), List.of(), Map.of()));
        when(eligibilityService.evaluate(gruhaJyothi, profile))
                .thenReturn(new EligibilityResult(gruhaJyothi.getId(), gruhaJyothi.getName(), EligibilityStatus.ELIGIBLE, 100, List.of(), List.of(), List.of(), Map.of()));

        when(benefitEstimator.estimateBenefit(pmKisan, profile))
                .thenReturn(Optional.of(new EstimatedBenefit(6000L, "ANNUAL", "₹6,000 per year")));
        when(benefitEstimator.estimateBenefit(gruhaLakshmi, profile))
                .thenReturn(Optional.of(new EstimatedBenefit(24000L, "MONTHLY", "₹24,000 per year")));
        // Non-monetary: returns empty
        when(benefitEstimator.estimateBenefit(gruhaJyothi, profile))
                .thenReturn(Optional.empty());

        MissedBenefitsResponse response = service.getMissedBenefits(email);

        assertThat(response.central()).isEqualTo(6000L);
        assertThat(response.state()).isEqualTo(24000L);
        assertThat(response.totalEstimatedAnnualBenefit()).isEqualTo(30000L);
        assertThat(response.totalMissedBenefits()).isEqualTo(2);
        assertThat(response.headlineMessage()).isEqualTo("You may be missing benefits worth approximately ₹30,000/year.");
        assertThat(response.disclaimer()).contains("This is an estimate, NOT a guaranteed payout.");
        assertThat(response.breakdown()).hasSize(2);
        assertThat(response.breakdown().get(0).schemeName()).isEqualTo("Gruha Lakshmi");
        assertThat(response.breakdown().get(0).estimatedAnnualBenefit()).isEqualTo(24000L);
        assertThat(response.breakdown().get(1).schemeName()).isEqualTo("PM-KISAN");
        assertThat(response.breakdown().get(1).estimatedAnnualBenefit()).isEqualTo(6000L);
    }
}
