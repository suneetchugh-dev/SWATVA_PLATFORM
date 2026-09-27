package in.swatva.ai.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import in.swatva.ai.api.ChatRequest;
import in.swatva.ai.api.ChatResponse;
import in.swatva.ai.api.RetrievedChunkDto;
import in.swatva.ai.model.ChatSession;
import in.swatva.ai.repository.ChatMessageRepository;
import in.swatva.ai.repository.ChatSessionRepository;
import in.swatva.eligibility.EligibilityRuleEvaluator;
import in.swatva.eligibility.EligibilityService;
import in.swatva.readiness.api.ApplicationReadinessResponse;
import in.swatva.readiness.model.enums.ReadinessTrafficLight;
import in.swatva.readiness.service.ApplicationReadinessService;
import in.swatva.scheme.ChecklistService;
import in.swatva.scheme.api.ActionChecklist;
import in.swatva.scheme.api.ActionChecklist.ChecklistDocument;
import in.swatva.scheme.api.ActionChecklist.ChecklistStep;
import in.swatva.scheme.model.Scheme;
import in.swatva.scheme.model.SchemeEligibilityRule;
import in.swatva.scheme.model.enums.GovernmentLevel;
import in.swatva.scheme.model.enums.SchemeStatus;
import in.swatva.scheme.repository.SchemeRepository;
import in.swatva.user.model.User;
import in.swatva.user.model.UserProfile;
import in.swatva.user.repository.UserProfileRepository;
import in.swatva.user.repository.UserRepository;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ChatServiceTest {

    private ChatSessionRepository sessionRepository;
    private ChatMessageRepository messageRepository;
    private UserRepository userRepository;
    private UserProfileRepository userProfileRepository;
    private SchemeRepository schemeRepository;
    private EligibilityService eligibilityService;
    private SchemeRetrievalService retrievalService;
    private ChecklistService checklistService;
    private ApplicationReadinessService readinessService;
    private ChatService chatService;

    private Map<UUID, ChatSession> sessionDb;

    @BeforeEach
    void setUp() {
        sessionDb = new HashMap<>();
        sessionRepository = mock(ChatSessionRepository.class);
        when(sessionRepository.findById(any(UUID.class))).thenAnswer(inv -> Optional.ofNullable(sessionDb.get(inv.getArgument(0))));
        when(sessionRepository.save(any(ChatSession.class))).thenAnswer(inv -> {
            ChatSession s = inv.getArgument(0);
            if (s.getId() == null) s.setId(UUID.randomUUID());
            sessionDb.put(s.getId(), s);
            return s;
        });

        messageRepository = mock(ChatMessageRepository.class);
        userRepository = mock(UserRepository.class);
        userProfileRepository = mock(UserProfileRepository.class);
        schemeRepository = mock(SchemeRepository.class);
        eligibilityService = new EligibilityService(null, null, null, new EligibilityRuleEvaluator());
        retrievalService = mock(SchemeRetrievalService.class);
        checklistService = mock(ChecklistService.class);
        readinessService = mock(ApplicationReadinessService.class);

        chatService = new ChatService(
                sessionRepository,
                messageRepository,
                userRepository,
                userProfileRepository,
                schemeRepository,
                eligibilityService,
                retrievalService,
                checklistService,
                readinessService,
                null // Test offline deterministic generator
        );
    }

    @Test
    @DisplayName("Multi-turn conversation in Hindi: Lists benefits on Turn 1, resolves 'इसके लिए क्या चाहिए?' on Turn 2")
    void multiTurnChat_hindi() {
        String email = "farmer@example.com";
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setId(userId);
        user.setEmail(email);

        UserProfile profile = new UserProfile();
        profile.setUser(user);
        profile.setState("Karnataka");
        profile.setOccupation("FARMER");

        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));
        when(userProfileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));

        UUID kisanId = UUID.randomUUID();
        Scheme pmKisan = createScheme(kisanId, "PM-KISAN", "Agriculture", GovernmentLevel.CENTRAL, null,
                "Income support of ₹6,000 per year in three equal instalments.", "https://pmkisan.gov.in/");
        addRule(pmKisan, "OCCUPATION", "FARMER", "Applicant occupation must be farmer.");

        UUID gruhaId = UUID.randomUUID();
        Scheme gruhaLakshmi = createScheme(gruhaId, "Gruha Lakshmi", "Women", GovernmentLevel.STATE, "Karnataka",
                "₹2,000 per month financial assistance.", "https://karnataka.gov.in");
        addRule(gruhaLakshmi, "STATE", "Karnataka", "Applicant must be a Karnataka resident.");

        when(schemeRepository.findByGovernmentLevel(GovernmentLevel.CENTRAL)).thenReturn(List.of(pmKisan));
        when(schemeRepository.findByGovernmentLevelAndStateIgnoreCase(GovernmentLevel.STATE, "Karnataka"))
                .thenReturn(List.of(gruhaLakshmi));
        when(schemeRepository.findById(kisanId)).thenReturn(Optional.of(pmKisan));
        when(schemeRepository.findByName("PM-KISAN")).thenReturn(Optional.of(pmKisan));
        when(schemeRepository.findAll()).thenReturn(List.of(pmKisan, gruhaLakshmi));

        // TURN 1: User asks for available schemes in Hindi
        ChatRequest req1 = new ChatRequest("मेरे लिए कौन सी सरकारी योजनाएं हैं?", null, null);
        ChatResponse resp1 = chatService.processChat(req1, email);

        assertThat(resp1).isNotNull();
        assertThat(resp1.language()).isEqualTo("hi");
        assertThat(resp1.surfacedBenefits()).isNotEmpty();
        assertThat(resp1.activeSchemeId()).isEqualTo(kisanId);
        assertThat(resp1.reply()).contains("केंद्रीय सरकारी योजनाएं");
        assertThat(resp1.reply()).contains("PM-KISAN");
        assertThat(resp1.reply()).contains("राज्य सरकारी योजनाएं (कर्नाटक)");

        UUID sessionId = resp1.sessionId();
        assertThat(sessionId).isNotNull();

        // TURN 2: User asks "इसके लिए क्या चाहिए?" referencing previous scheme
        ActionChecklist kisanChecklist = new ActionChecklist(
                kisanId,
                "PM-KISAN",
                List.of(
                        new ChecklistDocument("AADHAAR", "आधार कार्ड", true, "पहचान प्रमाण"),
                        new ChecklistDocument("BANK_ACCOUNT", "बैंक खाता पासबुक", true, "डीबीटी खाता")
                ),
                "कृषि और किसान कल्याण विभाग",
                "https://pmkisan.gov.in/",
                List.of(new ChecklistStep(1, "पंजीकरण", "पोर्टल पर जाएं और विवरण दर्ज करें", "https://pmkisan.gov.in")),
                List.of("आवेदक किसान होना चाहिए"),
                List.of(),
                null
        );
        when(checklistService.getChecklist(eq(kisanId), eq(email))).thenReturn(kisanChecklist);

        ApplicationReadinessResponse kisanReadiness = new ApplicationReadinessResponse(
                kisanId, "PM-KISAN", 100, ReadinessTrafficLight.GREEN, 2, 2, 0, 0, 0,
                List.of(), List.of(), List.of(), List.of()
        );
        when(readinessService.calculateReadiness(eq(kisanId), eq(email))).thenReturn(kisanReadiness);

        RetrievedChunkDto kisanChunk = new RetrievedChunkDto(
                UUID.randomUUID(), kisanId, "PM-KISAN", "ELIGIBILITY",
                "सभी भूमिधारक किसान परिवार जिनके नाम पर कृषि योग्य भूमि है।", "https://pmkisan.gov.in/", 1.0
        );
        when(retrievalService.retrieveChunksForScheme(kisanId)).thenReturn(List.of(kisanChunk));

        ChatRequest req2 = new ChatRequest("इसके लिए क्या चाहिए?", sessionId, null);
        ChatResponse resp2 = chatService.processChat(req2, email);

        assertThat(resp2).isNotNull();
        assertThat(resp2.sessionId()).isEqualTo(sessionId);
        assertThat(resp2.language()).isEqualTo("hi");
        assertThat(resp2.activeSchemeId()).isEqualTo(kisanId);
        assertThat(resp2.activeSchemeName()).isEqualTo("PM-KISAN");
        assertThat(resp2.checklist()).isNotNull();
        assertThat(resp2.reply()).contains("PM-KISAN");
        assertThat(resp2.reply()).contains("आवश्यक दस्तावेज़");
        assertThat(resp2.reply()).contains("आधार कार्ड");
        assertThat(resp2.reply()).contains("बैंक खाता पासबुक");
        assertThat(resp2.reply()).contains("यह योजना आवेदन के लिए पूर्णतः निःशुल्क है — यदि कोई पैसे मांगता है, तो यह गैरकानूनी है।");

        // Verify conversation history length in session
        ChatSession savedSession = sessionDb.get(sessionId);
        assertThat(savedSession.getMessages()).hasSize(4); // 2 user msgs + 2 assistant msgs
    }

    @Test
    @DisplayName("Kannada conversation: Answers benefit discovery and 'ಇದಕ್ಕೆ ಏನು ಬೇಕು?' in Kannada")
    void conversation_kannada() {
        UUID kisanId = UUID.randomUUID();
        Scheme pmKisan = createScheme(kisanId, "PM-KISAN", "Agriculture", GovernmentLevel.CENTRAL, null,
                "Income support of ₹6,000 per year", "https://pmkisan.gov.in/");
        when(schemeRepository.findByGovernmentLevel(GovernmentLevel.CENTRAL)).thenReturn(List.of(pmKisan));
        when(schemeRepository.findByGovernmentLevelAndStateIgnoreCase(GovernmentLevel.STATE, "Karnataka"))
                .thenReturn(List.of());
        when(schemeRepository.findById(kisanId)).thenReturn(Optional.of(pmKisan));
        when(schemeRepository.findAll()).thenReturn(List.of(pmKisan));

        ActionChecklist kisanChecklist = new ActionChecklist(
                kisanId, "PM-KISAN",
                List.of(new ChecklistDocument("AADHAAR", "ಆಧಾರ್ ಕಾರ್ಡ್", true, "ಗುರುತಿನ ಚೀಟಿ")),
                "ಕೃಷಿ ಇಲಾಖೆ", "https://pmkisan.gov.in/", List.of(), List.of(), List.of(), null
        );
        when(checklistService.getChecklist(eq(kisanId), any())).thenReturn(kisanChecklist);

        ChatRequest req1 = new ChatRequest("ನನಗೆ ಯಾವ ಯೋಜನೆಗಳು ಲಭ್ಯವಿವೆ?", null, "kn");
        ChatResponse resp1 = chatService.processChat(req1, null);

        assertThat(resp1.language()).isEqualTo("kn");
        assertThat(resp1.reply()).contains("ಕೇಂದ್ರ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು");
        assertThat(resp1.reply()).contains("PM-KISAN");

        ChatRequest req2 = new ChatRequest("ಇದಕ್ಕೆ ಏನು ಬೇಕು?", resp1.sessionId(), "kn");
        ChatResponse resp2 = chatService.processChat(req2, null);

        assertThat(resp2.language()).isEqualTo("kn");
        assertThat(resp2.reply()).contains("PM-KISAN");
        assertThat(resp2.reply()).contains("ಅಗತ್ಯ ದಾಖಲೆಗಳು");
        assertThat(resp2.reply()).contains("ಆಧಾರ್ ಕಾರ್ಡ್");
        assertThat(resp2.reply()).contains("ಈ ಯೋಜನೆಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸುವುದು ಸಂಪೂರ್ಣ ಉಚಿತ");
    }

    @Test
    @DisplayName("English conversation: Lists schemes and requirements with grounding and free warning")
    void conversation_english() {
        UUID gruhaId = UUID.randomUUID();
        Scheme gruhaJyothi = createScheme(gruhaId, "Gruha Jyothi", "Utilities", GovernmentLevel.STATE, "Karnataka",
                "Free domestic electricity up to 200 units", "https://karnataka.gov.in");

        when(schemeRepository.findByGovernmentLevel(GovernmentLevel.CENTRAL)).thenReturn(List.of());
        when(schemeRepository.findByGovernmentLevelAndStateIgnoreCase(GovernmentLevel.STATE, "Karnataka"))
                .thenReturn(List.of(gruhaJyothi));
        when(schemeRepository.findById(gruhaId)).thenReturn(Optional.of(gruhaJyothi));
        when(schemeRepository.findAll()).thenReturn(List.of(gruhaJyothi));

        ActionChecklist checklist = new ActionChecklist(
                gruhaId, "Gruha Jyothi",
                List.of(new ChecklistDocument("ELECTRICITY_CONNECTION", "Electricity Connection Bill", true, "Consumer ID")),
                "Energy Department", "https://sevasindhu.karnataka.gov.in", List.of(), List.of(), List.of(), null
        );
        when(checklistService.getChecklist(eq(gruhaId), any())).thenReturn(checklist);

        ChatRequest req = new ChatRequest("What is needed for Gruha Jyothi?", null, "en");
        ChatResponse resp = chatService.processChat(req, null);

        assertThat(resp.language()).isEqualTo("en");
        assertThat(resp.activeSchemeName()).isEqualTo("Gruha Jyothi");
        assertThat(resp.reply()).contains("Gruha Jyothi");
        assertThat(resp.reply()).contains("Electricity Connection Bill");
        assertThat(resp.reply()).contains("This scheme is free to apply for \u2014 if anyone asks for money, it is illegal.");
    }

    @Test
    @DisplayName("Unverified question with no RAG chunks returns message that system lacks verified info")
    void unverifiedQuestion_returnsGroundedDisclaimer() {
        when(retrievalService.retrieveRelevantChunks(anyString(), any(), any(), anyInt()))
                .thenReturn(List.of());
        when(schemeRepository.findAll()).thenReturn(List.of());

        ChatRequest req = new ChatRequest("Can I get a spaceship license subsidy?", null, "en");
        ChatResponse resp = chatService.processChat(req, null);

        assertThat(resp.grounded()).isFalse();
        assertThat(resp.reply()).contains("The system does not have enough verified information to answer this question");
    }

    private Scheme createScheme(UUID id, String name, String category, GovernmentLevel level, String state,
                                String benefit, String url) {
        Scheme s = new Scheme();
        s.setId(id);
        s.setName(name);
        s.setCategory(category);
        s.setGovernmentLevel(level);
        s.setState(state);
        s.setBenefitInformation(benefit);
        s.setOfficialSourceUrl(url);
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
