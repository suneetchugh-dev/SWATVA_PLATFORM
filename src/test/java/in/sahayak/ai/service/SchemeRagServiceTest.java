package in.sahayak.ai.service;

import in.sahayak.ai.api.RetrievedChunkDto;
import in.sahayak.ai.api.SchemeExplanationResponse;
import in.sahayak.ai.api.SchemeQueryRequest;
import in.sahayak.ai.api.SchemeQueryResponse;
import in.sahayak.eligibility.EligibilityResult;
import in.sahayak.eligibility.EligibilityService;
import in.sahayak.eligibility.EligibilityStatus;
import in.sahayak.scheme.model.Scheme;
import in.sahayak.scheme.model.enums.GovernmentLevel;
import in.sahayak.scheme.repository.SchemeRepository;
import in.sahayak.user.model.User;
import in.sahayak.user.model.UserProfile;
import in.sahayak.user.repository.UserProfileRepository;
import in.sahayak.user.repository.UserRepository;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.chat.model.ChatModel;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SchemeRagServiceTest {

    @Mock
    private SchemeRetrievalService retrievalService;

    @Mock
    private ChatModel chatModel;

    @Mock
    private SchemeRepository schemeRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserProfileRepository profileRepository;

    @Mock
    private EligibilityService eligibilityService;

    private SchemeRagService ragService;

    @BeforeEach
    void setUp() {
        ragService = new SchemeRagService(
                retrievalService,
                chatModel,
                schemeRepository,
                userRepository,
                profileRepository,
                eligibilityService
        );
    }

    @Test
    void askQuestion_returnsGroundedAnswer_whenChunksAreFound() {
        UUID schemeId = UUID.randomUUID();
        RetrievedChunkDto chunk = new RetrievedChunkDto(
                UUID.randomUUID(),
                schemeId,
                "PM-KISAN",
                "BENEFITS",
                "PM-KISAN provides ₹6,000 per year in 3 equal instalments.",
                "https://pmkisan.gov.in/",
                0.92
        );

        when(retrievalService.retrieveRelevantChunks("What is the benefit under PM-KISAN?", null, null, 5))
                .thenReturn(List.of(chunk));
        when(chatModel.call(anyString())).thenReturn("PM-KISAN provides income support of ₹6,000 annually.");

        SchemeQueryRequest request = new SchemeQueryRequest("What is the benefit under PM-KISAN?", null, null);
        SchemeQueryResponse response = ragService.askQuestion(request);

        assertThat(response.grounded()).isTrue();
        assertThat(response.answer()).isEqualTo("PM-KISAN provides income support of ₹6,000 annually.");
        assertThat(response.citations()).hasSize(1);
        assertThat(response.citations().getFirst().schemeName()).isEqualTo("PM-KISAN");
        assertThat(response.citations().getFirst().sourceUrl()).isEqualTo("https://pmkisan.gov.in/");
    }

    @Test
    void askQuestion_returnsInsufficientInformation_whenNoChunksFound() {
        when(retrievalService.retrieveRelevantChunks("Unknown scheme query", null, null, 5))
                .thenReturn(List.of());

        SchemeQueryRequest request = new SchemeQueryRequest("Unknown scheme query", null, null);
        SchemeQueryResponse response = ragService.askQuestion(request);

        assertThat(response.grounded()).isFalse();
        assertThat(response.answer()).contains("The system does not have enough verified information to answer this question");
        assertThat(response.citations()).isEmpty();
        verify(chatModel, never()).call(anyString());
    }

    @Test
    void explainSchemeMatch_usesDeterministicEligibility_andRetrievedContext() {
        UUID schemeId = UUID.randomUUID();
        Scheme scheme = new Scheme();
        scheme.setId(schemeId);
        scheme.setName("Gruha Jyothi");
        scheme.setGovernmentLevel(GovernmentLevel.STATE);
        scheme.setState("Karnataka");
        scheme.setCategory("Utilities");
        scheme.setOfficialSourceUrl("https://sevasindhu.karnataka.gov.in/");

        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setId(userId);
        user.setEmail("citizen@example.com");

        UserProfile profile = new UserProfile();
        profile.setState("Karnataka");

        EligibilityResult eligibilityResult = new EligibilityResult(
                schemeId,
                "Gruha Jyothi",
                EligibilityStatus.ELIGIBLE,
                100,
                List.of("Resident of Karnataka", "Domestic electricity connection"),
                List.of(),
                List.of(),
                Map.of()
        );

        RetrievedChunkDto chunk = new RetrievedChunkDto(
                UUID.randomUUID(),
                schemeId,
                "Gruha Jyothi",
                "BENEFITS",
                "Free electricity up to 200 units per month.",
                "https://sevasindhu.karnataka.gov.in/",
                1.0
        );

        when(schemeRepository.findById(schemeId)).thenReturn(Optional.of(scheme));
        when(userRepository.findByEmail("citizen@example.com")).thenReturn(Optional.of(user));
        when(profileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));
        when(eligibilityService.evaluate(scheme, profile)).thenReturn(eligibilityResult);
        when(retrievalService.retrieveChunksForScheme(schemeId)).thenReturn(List.of(chunk));
        when(chatModel.call(anyString())).thenReturn("You are eligible for Gruha Jyothi because you are a resident of Karnataka.");

        SchemeExplanationResponse response = ragService.explainSchemeMatch(schemeId, "citizen@example.com");

        assertThat(response.schemeId()).isEqualTo(schemeId);
        assertThat(response.schemeName()).isEqualTo("Gruha Jyothi");
        assertThat(response.eligibilityStatus()).isEqualTo(EligibilityStatus.ELIGIBLE);
        assertThat(response.matchPercentage()).isEqualTo(100);
        assertThat(response.satisfiedConditions()).containsExactly("Resident of Karnataka", "Domestic electricity connection");
        assertThat(response.failedConditions()).isEmpty();
        assertThat(response.explanation()).isEqualTo("You are eligible for Gruha Jyothi because you are a resident of Karnataka.");
        assertThat(response.citations()).hasSize(1);
        assertThat(response.citations().getFirst().sourceUrl()).isEqualTo("https://sevasindhu.karnataka.gov.in/");
    }
}
