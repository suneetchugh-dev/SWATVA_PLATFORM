package in.swatva.scheme;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import in.swatva.ai.api.LifeEventSignals;
import in.swatva.ai.api.RetrievedChunkDto;
import in.swatva.ai.service.LifeEventSignalExtractionService;
import in.swatva.ai.service.SchemeRetrievalService;
import in.swatva.eligibility.EligibilityResult;
import in.swatva.eligibility.EligibilityRuleEvaluator;
import in.swatva.eligibility.EligibilityService;
import in.swatva.eligibility.EligibilityStatus;
import in.swatva.scheme.api.LifeEventDiscoveryRequest;
import in.swatva.scheme.api.LifeEventDiscoveryResponse;
import in.swatva.scheme.model.Scheme;
import in.swatva.scheme.model.SchemeEligibilityRule;
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
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class LifeEventBenefitDiscoveryServiceTest {

    private LifeEventSignalExtractionService signalExtractor;
    private SchemeRetrievalService retrievalService;
    private EligibilityService eligibilityService;
    private SchemeRepository schemeRepository;
    private UserRepository userRepository;
    private UserProfileRepository userProfileRepository;
    private LifeEventBenefitDiscoveryService discoveryService;

    @BeforeEach
    void setUp() {
        signalExtractor = mock(LifeEventSignalExtractionService.class);
        retrievalService = mock(SchemeRetrievalService.class);
        eligibilityService = new EligibilityService(null, null, null, new EligibilityRuleEvaluator());
        schemeRepository = mock(SchemeRepository.class);
        userRepository = mock(UserRepository.class);
        userProfileRepository = mock(UserProfileRepository.class);

        discoveryService = new LifeEventBenefitDiscoveryService(
                signalExtractor,
                retrievalService,
                eligibilityService,
                schemeRepository,
                userRepository,
                userProfileRepository
        );
    }

    @Test
    @DisplayName("Farmer life event surfaces PM-KISAN under centralSchemes and excludes ineligible artisan scheme")
    void discoverBenefits_farmerScenario() {
        // Setup central schemes
        Scheme pmKisan = createScheme(UUID.randomUUID(), "PM-KISAN", "Agriculture", GovernmentLevel.CENTRAL, null);
        addRule(pmKisan, "OCCUPATION", "FARMER", "Applicant occupation must be farmer.");

        Scheme vishwakarma = createScheme(UUID.randomUUID(), "PM Vishwakarma", "Livelihood", GovernmentLevel.CENTRAL, null);
        addRule(vishwakarma, "OCCUPATION", "ARTISAN|CRAFTSPERSON", "Applicant must be an artisan or craftsperson.");

        when(schemeRepository.findByGovernmentLevel(GovernmentLevel.CENTRAL))
                .thenReturn(List.of(pmKisan, vishwakarma));

        LifeEventSignals signals = LifeEventSignals.of(
                "FARMING_AGRICULTURE", "FATHER", "FARMER", null, null, 200000.0,
                List.of("Father is a farmer", "Family income is below ₹2 lakh")
        );
        when(signalExtractor.extractSignals(anyString())).thenReturn(signals);

        RetrievedChunkDto chunk = new RetrievedChunkDto(
                UUID.randomUUID(), pmKisan.getId(), "PM-KISAN", "BENEFIT",
                "Income support of ₹6,000 per year in three equal instalments.",
                "https://pmkisan.gov.in/", 0.95
        );
        when(retrievalService.retrieveRelevantChunks(anyString(), any(), any(), anyInt()))
                .thenReturn(List.of(chunk));

        LifeEventDiscoveryRequest request = new LifeEventDiscoveryRequest(
                "My father is a farmer and our family income is below ₹2 lakh.", null);

        LifeEventDiscoveryResponse response = discoveryService.discoverBenefits(request, null);

        assertThat(response).isNotNull();
        assertThat(response.extractedSignals().occupation()).isEqualTo("FARMER");
        assertThat(response.extractedSignals().income()).isEqualTo(200000.0);

        // PM-KISAN should be surfaced under central schemes
        assertThat(response.centralSchemes()).hasSize(1);
        var kisanMatch = response.centralSchemes().get(0);
        assertThat(kisanMatch.schemeName()).isEqualTo("PM-KISAN");
        assertThat(kisanMatch.eligibilityStatus()).isEqualTo(EligibilityStatus.ELIGIBLE);
        assertThat(kisanMatch.whySurfaced()).contains("Occupation requirement satisfied");
        assertThat(kisanMatch.whySurfaced()).contains("farming occupation");
        assertThat(kisanMatch.satisfiedConditions()).contains("Occupation requirement satisfied");
        assertThat(kisanMatch.failedConditions()).isEmpty();

        // PM Vishwakarma must NOT be surfaced because artisan rule deterministically failed
        boolean vishwakarmaPresent = response.centralSchemes().stream()
                .anyMatch(s -> s.schemeName().equals("PM Vishwakarma"));
        assertThat(vishwakarmaPresent).isFalse();
    }

    @Test
    @DisplayName("Separates Central and State schemes and surfaces Karnataka state schemes when location is Karnataka")
    void discoverBenefits_separatesCentralAndState() {
        Scheme pmKisan = createScheme(UUID.randomUUID(), "PM-KISAN", "Agriculture", GovernmentLevel.CENTRAL, null);
        addRule(pmKisan, "OCCUPATION", "FARMER", "Applicant occupation must be farmer.");

        Scheme gruhaJyothi = createScheme(UUID.randomUUID(), "Gruha Jyothi", "Utilities", GovernmentLevel.STATE, "Karnataka");
        addRule(gruhaJyothi, "STATE", "Karnataka", "Applicant must be a Karnataka resident.");

        when(schemeRepository.findByGovernmentLevel(GovernmentLevel.CENTRAL)).thenReturn(List.of(pmKisan));
        when(schemeRepository.findByGovernmentLevelAndStateIgnoreCase(GovernmentLevel.STATE, "Karnataka"))
                .thenReturn(List.of(gruhaJyothi));

        LifeEventSignals signals = LifeEventSignals.of(
                "FARMING_AGRICULTURE", "FATHER", "FARMER", null, "Karnataka", 200000.0,
                List.of("Father is a farmer", "Living in Karnataka")
        );
        when(signalExtractor.extractSignals(anyString())).thenReturn(signals);
        when(retrievalService.retrieveRelevantChunks(anyString(), any(), any(), anyInt()))
                .thenReturn(List.of());

        LifeEventDiscoveryRequest request = new LifeEventDiscoveryRequest(
                "My father is a farmer in Karnataka", "Karnataka");

        LifeEventDiscoveryResponse response = discoveryService.discoverBenefits(request, null);

        assertThat(response.centralSchemes()).hasSize(1);
        assertThat(response.centralSchemes().get(0).schemeName()).isEqualTo("PM-KISAN");

        assertThat(response.stateSchemes()).hasSize(1);
        assertThat(response.stateSchemes().get(0).schemeName()).isEqualTo("Gruha Jyothi");
        assertThat(response.stateSchemes().get(0).satisfiedConditions()).contains("State requirement satisfied");
        assertThat(response.totalSurfacedSchemes()).isEqualTo(2);
    }

    @Test
    @DisplayName("Unemployment life event surfaces Yuva Nidhi with satisfied occupation and missing education")
    void discoverBenefits_unemploymentScenario() {
        Scheme yuvaNidhi = createScheme(UUID.randomUUID(), "Yuva Nidhi", "Employment", GovernmentLevel.STATE, "Karnataka");
        addRule(yuvaNidhi, "STATE", "Karnataka", "Applicant must be a Karnataka resident.");
        addRule(yuvaNidhi, "OCCUPATION", "UNEMPLOYED", "Applicant must be unemployed.");
        addRule(yuvaNidhi, "EDUCATION", "GRADUATE|DIPLOMA", "Applicant must be a graduate or diploma holder.");

        when(schemeRepository.findByGovernmentLevel(GovernmentLevel.CENTRAL)).thenReturn(List.of());
        when(schemeRepository.findByGovernmentLevelAndStateIgnoreCase(GovernmentLevel.STATE, "Karnataka"))
                .thenReturn(List.of(yuvaNidhi));

        LifeEventSignals signals = LifeEventSignals.of(
                "JOB_LOSS_UNEMPLOYMENT", "SELF", "UNEMPLOYED", null, "Karnataka", null,
                List.of("Recently lost job")
        );
        when(signalExtractor.extractSignals(anyString())).thenReturn(signals);
        when(retrievalService.retrieveRelevantChunks(anyString(), any(), any(), anyInt()))
                .thenReturn(List.of());

        LifeEventDiscoveryRequest request = new LifeEventDiscoveryRequest("I recently lost my job.", "Karnataka");

        LifeEventDiscoveryResponse response = discoveryService.discoverBenefits(request, null);

        assertThat(response.stateSchemes()).hasSize(1);
        var match = response.stateSchemes().get(0);
        assertThat(match.schemeName()).isEqualTo("Yuva Nidhi");
        assertThat(match.eligibilityStatus()).isEqualTo(EligibilityStatus.POTENTIALLY_ELIGIBLE);
        assertThat(match.satisfiedConditions()).contains("Occupation requirement satisfied");
        assertThat(match.missingInformation()).contains("Education information is missing");
        assertThat(match.whySurfaced()).contains("Occupation requirement satisfied");
    }

    @Test
    @DisplayName("Authenticated user automatically inherits stored profile state and fields")
    void discoverBenefits_authenticatedProfileEnrichment() {
        String email = "citizen@example.com";
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setId(userId);
        user.setEmail(email);

        UserProfile profile = new UserProfile();
        profile.setState("Karnataka");
        profile.setUser(user);

        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));
        when(userProfileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));

        Scheme gruhaJyothi = createScheme(UUID.randomUUID(), "Gruha Jyothi", "Utilities", GovernmentLevel.STATE, "Karnataka");
        addRule(gruhaJyothi, "STATE", "Karnataka", "Applicant must be a Karnataka resident.");

        when(schemeRepository.findByGovernmentLevel(GovernmentLevel.CENTRAL)).thenReturn(List.of());
        when(schemeRepository.findByGovernmentLevelAndStateIgnoreCase(GovernmentLevel.STATE, "Karnataka"))
                .thenReturn(List.of(gruhaJyothi));

        // Description omits state, but authenticated profile provides Karnataka
        LifeEventSignals signals = LifeEventSignals.of(
                "GENERAL_LIFE_EVENT", "SELF", null, null, null, null, List.of()
        );
        when(signalExtractor.extractSignals(anyString())).thenReturn(signals);
        when(retrievalService.retrieveRelevantChunks(anyString(), any(), any(), anyInt())).thenReturn(List.of());

        LifeEventDiscoveryRequest request = new LifeEventDiscoveryRequest("Need electricity assistance", null);

        LifeEventDiscoveryResponse response = discoveryService.discoverBenefits(request, email);

        assertThat(response.stateSchemes()).hasSize(1);
        assertThat(response.stateSchemes().get(0).schemeName()).isEqualTo("Gruha Jyothi");
    }

    private Scheme createScheme(UUID id, String name, String category, GovernmentLevel level, String state) {
        Scheme s = new Scheme();
        s.setId(id);
        s.setName(name);
        s.setCategory(category);
        s.setGovernmentLevel(level);
        s.setState(state);
        s.setIssuingAuthority("Authority");
        s.setOfficialSourceUrl("https://example.gov.in");
        s.setStatus(SchemeStatus.ACTIVE);
        return s;
    }

    private void addRule(Scheme scheme, String ruleType, String ruleValue, String description) {
        SchemeEligibilityRule rule = new SchemeEligibilityRule();
        rule.setScheme(scheme);
        rule.setRuleType(ruleType);
        rule.setRuleValue(ruleValue);
        rule.setRuleDescription(description);
        scheme.getEligibilityRules().add(rule);
    }
}
