package in.swatva.ai.service;

import in.swatva.ai.api.ChatRequest;
import in.swatva.ai.api.ChatResponse;
import in.swatva.ai.api.ChatResponse.ChatBenefitSummary;
import in.swatva.ai.api.ChatResponse.ChatReadinessSummary;
import in.swatva.ai.api.RetrievedChunkDto;
import in.swatva.ai.model.ChatMessage;
import in.swatva.ai.model.ChatMessage.MessageRole;
import in.swatva.ai.model.ChatSession;
import in.swatva.ai.repository.ChatMessageRepository;
import in.swatva.ai.repository.ChatSessionRepository;
import in.swatva.eligibility.EligibilityResult;
import in.swatva.eligibility.EligibilityService;
import in.swatva.eligibility.EligibilityStatus;
import in.swatva.readiness.api.ApplicationReadinessResponse;
import in.swatva.readiness.service.ApplicationReadinessService;
import in.swatva.scheme.ChecklistService;
import in.swatva.scheme.api.ActionChecklist;
import in.swatva.scheme.api.ActionChecklist.ChecklistDocument;
import in.swatva.scheme.api.ActionChecklist.ChecklistStep;
import in.swatva.scheme.model.Scheme;
import in.swatva.scheme.model.enums.GovernmentLevel;
import in.swatva.scheme.model.enums.SchemeStatus;
import in.swatva.scheme.repository.SchemeRepository;
import in.swatva.user.model.User;
import in.swatva.user.model.UserProfile;
import in.swatva.user.repository.UserProfileRepository;
import in.swatva.user.repository.UserRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);

    private static final Pattern DEVANAGARI_PATTERN = Pattern.compile("[\\u0900-\\u097F]");
    private static final Pattern KANNADA_PATTERN = Pattern.compile("[\\u0C80-\\u0CFF]");

    private final ChatSessionRepository sessionRepository;
    private final ChatMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final SchemeRepository schemeRepository;
    private final EligibilityService eligibilityService;
    private final SchemeRetrievalService retrievalService;
    private final ChecklistService checklistService;
    private final ApplicationReadinessService readinessService;
    private final ChatModel chatModel;

    @Autowired
    public ChatService(ChatSessionRepository sessionRepository,
                       ChatMessageRepository messageRepository,
                       UserRepository userRepository,
                       UserProfileRepository userProfileRepository,
                       SchemeRepository schemeRepository,
                       EligibilityService eligibilityService,
                       SchemeRetrievalService retrievalService,
                       ChecklistService checklistService,
                       ApplicationReadinessService readinessService,
                       @Autowired(required = false) ChatModel chatModel) {
        this.sessionRepository = sessionRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.userProfileRepository = userProfileRepository;
        this.schemeRepository = schemeRepository;
        this.eligibilityService = eligibilityService;
        this.retrievalService = retrievalService;
        this.checklistService = checklistService;
        this.readinessService = readinessService;
        this.chatModel = chatModel;
    }

    @Transactional
    public ChatResponse processChat(ChatRequest request, String userEmail) {
        // 1. Resolve or create chat session
        User user = (userEmail != null && !userEmail.isBlank())
                ? userRepository.findByEmail(userEmail).orElse(null) : null;
        UserProfile profile = (user != null)
                ? userProfileRepository.findByUserId(user.getId()).orElse(null) : null;

        ChatSession session = resolveSession(request.sessionId(), user);

        // 2. Detect / normalize language ("en", "hi", "kn")
        String language = detectLanguage(request, session);
        session.setLanguage(language);

        String userQuery = request.message().trim();

        // 3. Resolve active scheme and classify intent
        Scheme explicitScheme = detectExplicitScheme(userQuery);
        boolean isAnaphoric = isAnaphoricReference(userQuery, language);

        Scheme activeScheme = explicitScheme;
        if (activeScheme == null && isAnaphoric && session.getActiveSchemeId() != null) {
            activeScheme = schemeRepository.findById(session.getActiveSchemeId()).orElse(null);
        }

        ChatIntent intent = classifyIntent(userQuery, language, isAnaphoric, activeScheme != null);

        // 4. Gather grounded data according to intent
        List<ChatBenefitSummary> surfacedBenefits = new ArrayList<>();
        ActionChecklist checklist = null;
        ChatReadinessSummary readinessSummary = null;
        List<String> citations = new ArrayList<>();
        String groundedContextText = "";
        boolean isGrounded = true;

        if (intent == ChatIntent.DISCOVER_BENEFITS) {
            String effectiveState = (profile != null && profile.getState() != null)
                    ? profile.getState().trim() : "Karnataka";

            List<Scheme> central = schemeRepository.findByGovernmentLevel(GovernmentLevel.CENTRAL).stream()
                    .filter(s -> s.getStatus() == SchemeStatus.ACTIVE).toList();
            List<Scheme> state = schemeRepository.findByGovernmentLevelAndStateIgnoreCase(GovernmentLevel.STATE, effectiveState).stream()
                    .filter(s -> s.getStatus() == SchemeStatus.ACTIVE).toList();

            List<SchemeEvaluationPair> evaluatedCentral = evaluateSchemes(central, profile);
            List<SchemeEvaluationPair> evaluatedState = evaluateSchemes(state, profile);

            for (SchemeEvaluationPair p : evaluatedCentral) {
                surfacedBenefits.add(toBenefitSummary(p.scheme(), p.result()));
                citations.add(p.scheme().getOfficialSourceUrl());
            }
            for (SchemeEvaluationPair p : evaluatedState) {
                surfacedBenefits.add(toBenefitSummary(p.scheme(), p.result()));
                citations.add(p.scheme().getOfficialSourceUrl());
            }

            // Set top surfaced scheme as active scheme context
            if (!surfacedBenefits.isEmpty()) {
                UUID topId = surfacedBenefits.get(0).schemeId();
                activeScheme = schemeRepository.findById(topId).orElse(null);
                if (activeScheme != null) {
                    session.setActiveSchemeId(activeScheme.getId());
                    session.setActiveSchemeName(activeScheme.getName());
                }
            }

            groundedContextText = buildBenefitsGroundedContext(evaluatedCentral, evaluatedState, effectiveState);

        } else if (intent == ChatIntent.SCHEME_REQUIREMENTS || intent == ChatIntent.READINESS_STATUS) {
            if (activeScheme == null && session.getActiveSchemeId() != null) {
                activeScheme = schemeRepository.findById(session.getActiveSchemeId()).orElse(null);
            }
            if (activeScheme == null) {
                // Fallback to top scheme in repository (e.g. PM-KISAN or Gruha Lakshmi)
                activeScheme = schemeRepository.findByName("PM-KISAN")
                        .or(() -> schemeRepository.findAll().stream().findFirst())
                        .orElse(null);
            }

            if (activeScheme != null) {
                session.setActiveSchemeId(activeScheme.getId());
                session.setActiveSchemeName(activeScheme.getName());
                citations.add(activeScheme.getOfficialSourceUrl());

                checklist = checklistService.getChecklist(activeScheme.getId(), userEmail);

                if (user != null) {
                    try {
                        ApplicationReadinessResponse rResp = readinessService.calculateReadiness(activeScheme.getId(), userEmail);
                        readinessSummary = new ChatReadinessSummary(
                                rResp.readinessPercentage(),
                                rResp.status().name(),
                                rResp.completedDocuments(),
                                rResp.missingDocuments(),
                                rResp.totalRequiredDocuments()
                        );
                    } catch (Exception ex) {
                        log.debug("Readiness could not be computed: {}", ex.getMessage());
                    }
                }

                // Retrieve RAG chunks for scheme
                List<RetrievedChunkDto> chunks = retrievalService.retrieveChunksForScheme(activeScheme.getId());
                groundedContextText = buildRequirementsGroundedContext(activeScheme, checklist, readinessSummary, chunks);
            }
        } else {
            // General question or specific question - query RAG
            String stateFilter = profile != null ? profile.getState() : null;
            List<RetrievedChunkDto> chunks = retrievalService.retrieveRelevantChunks(userQuery, stateFilter, null, 5);
            if (!chunks.isEmpty()) {
                StringBuilder sb = new StringBuilder();
                for (RetrievedChunkDto c : chunks) {
                    sb.append("• ").append(c.schemeName()).append(" (").append(c.documentType()).append("):\n")
                            .append(c.content()).append("\nSource: ").append(c.sourceUrl()).append("\n\n");
                    citations.add(c.sourceUrl());
                }
                groundedContextText = sb.toString();
            } else {
                isGrounded = false;
            }
        }

        // 5. Generate assistant reply (via LLM or deterministic multilingual generator)
        String reply = generateReply(userQuery, intent, language, activeScheme, surfacedBenefits,
                checklist, readinessSummary, groundedContextText, session);

        // 6. Record conversation turn in history
        ChatMessage userMsg = new ChatMessage();
        userMsg.setSession(session);
        userMsg.setRole(MessageRole.USER);
        userMsg.setContent(userQuery);
        userMsg.setLanguage(language);
        if (activeScheme != null) userMsg.setActiveSchemeId(activeScheme.getId());
        session.getMessages().add(userMsg);

        ChatMessage assistantMsg = new ChatMessage();
        assistantMsg.setSession(session);
        assistantMsg.setRole(MessageRole.ASSISTANT);
        assistantMsg.setContent(reply);
        assistantMsg.setLanguage(language);
        if (activeScheme != null) assistantMsg.setActiveSchemeId(activeScheme.getId());
        assistantMsg.setGrounded(isGrounded);
        assistantMsg.setGroundedContextSummary(groundedContextText.length() > 500
                ? groundedContextText.substring(0, 500) : groundedContextText);
        session.getMessages().add(assistantMsg);

        sessionRepository.save(session);

        UUID activeId = activeScheme != null ? activeScheme.getId() : session.getActiveSchemeId();
        String activeName = activeScheme != null ? activeScheme.getName() : session.getActiveSchemeName();

        return new ChatResponse(
                session.getId(),
                reply,
                language,
                isGrounded,
                activeId,
                activeName,
                surfacedBenefits,
                checklist,
                readinessSummary,
                citations.stream().distinct().toList()
        );
    }

    private String generateReply(String userQuery,
                                 ChatIntent intent,
                                 String language,
                                 Scheme activeScheme,
                                 List<ChatBenefitSummary> surfacedBenefits,
                                 ActionChecklist checklist,
                                 ChatReadinessSummary readinessSummary,
                                 String groundedContextText,
                                 ChatSession session) {
        if (chatModel != null && !groundedContextText.isBlank()) {
            try {
                String prompt = buildLlmPrompt(userQuery, language, groundedContextText, session);
                String llmAnswer = chatModel.call(prompt);
                if (llmAnswer != null && !llmAnswer.isBlank()) {
                    return llmAnswer.trim();
                }
            } catch (Exception ex) {
                log.warn("LLM chat invocation failed ({}), falling back to deterministic multilingual response: {}",
                        ex.getClass().getSimpleName(), ex.getMessage());
            }
        }

        return generateDeterministicMultilingualReply(
                intent, language, activeScheme, surfacedBenefits, checklist, readinessSummary, groundedContextText);
    }

    private String buildLlmPrompt(String userQuery,
                                  String language,
                                  String groundedContextText,
                                  ChatSession session) {
        String langName = switch (language) {
            case "hi" -> "Hindi (हिंदी / Hinglish)";
            case "kn" -> "Kannada (ಕನ್ನಡ)";
            default -> "English (or mirror the citizen's language if they ask in Hindi or another Indian language)";
        };

        StringBuilder historyStr = new StringBuilder();
        int msgCount = session.getMessages().size();
        int startIndex = Math.max(0, msgCount - 4);
        for (int i = startIndex; i < msgCount; i++) {
            ChatMessage m = session.getMessages().get(i);
            historyStr.append(m.getRole()).append(": ").append(m.getContent()).append("\n");
        }

        return """
                You are Swatva AI, an empathetic and highly knowledgeable Indian government scheme discovery assistant.
                You are fluent in English, Hindi (हिंदी / Hinglish), and Indian regional languages.
                You must answer the citizen strictly and ONLY based on the verified grounded context below.
                
                LANGUAGE REQUIREMENT:
                - Primary target language: %s.
                - If the citizen asks in Hindi, Hinglish, or requests to speak in Hindi/another language, respond fluently in that requested language (Hindi/Hinglish/Regional).
                - NEVER say you can only speak English. You are fully multilingual and can converse warmly in Hindi, Hinglish, Kannada, and other Indian languages.
                
                CRITICAL CONSTRAINTS:
                - Do NOT independently invent, assume, or fabricate scheme rules, documents, or benefits.
                - Answer ONLY from the facts provided in the grounded context.
                - Clearly distinguish Central and State schemes when listing benefits.
                - If the scheme has no official fee, highlight that application is completely free and paying bribes is illegal.
                
                [RECENT CONVERSATION HISTORY]
                %s
                
                [GROUNDED CONTEXT]
                %s
                
                [CITIZEN MESSAGE]
                %s
                """.formatted(langName, historyStr.toString(), groundedContextText, userQuery);
    }

    private String generateDeterministicMultilingualReply(ChatIntent intent,
                                                          String language,
                                                          Scheme activeScheme,
                                                          List<ChatBenefitSummary> surfacedBenefits,
                                                          ActionChecklist checklist,
                                                          ChatReadinessSummary readinessSummary,
                                                          String groundedContext) {
        return switch (language) {
            case "hi" -> generateHindiReply(intent, activeScheme, surfacedBenefits, checklist, readinessSummary, groundedContext);
            case "kn" -> generateKannadaReply(intent, activeScheme, surfacedBenefits, checklist, readinessSummary, groundedContext);
            default -> generateEnglishReply(intent, activeScheme, surfacedBenefits, checklist, readinessSummary, groundedContext);
        };
    }

    private String generateHindiReply(ChatIntent intent,
                                      Scheme activeScheme,
                                      List<ChatBenefitSummary> surfacedBenefits,
                                      ActionChecklist checklist,
                                      ChatReadinessSummary readiness,
                                      String groundedContext) {
        if (intent == ChatIntent.GREETING) {
            return "नमस्ते! मैं Swatva AI सहायक हूँ। मैं आपकी इस प्रकार मदद कर सकता हूँ:\n\n"
                    + "• **सरकारी योजनाएं खोजें** — पूछें \"मेरे लिए कौन सी योजनाएं हैं?\"\n"
                    + "• **दस्तावेज़ जांचें** — पूछें \"PM-KISAN के लिए क्या चाहिए?\"\n"
                    + "• **आवेदन तैयारी देखें** — पूछें \"क्या मैं आवेदन के लिए तैयार हूँ?\"\n\n"
                    + "जितना अधिक आप अपना प्रोफ़ाइल भरेंगे, उतने सटीक जवाब मिलेंगे। आज मैं आपकी कैसे मदद करूँ?";
        }

        if (intent == ChatIntent.DISCOVER_BENEFITS) {
            StringBuilder sb = new StringBuilder();
            sb.append("नमस्ते! आपके प्रोफ़ाइल और पात्रता के अनुसार, निम्नलिखित सरकारी योजनाएं आपके लिए उपयुक्त हैं:\n\n");

            List<ChatBenefitSummary> central = surfacedBenefits.stream()
                    .filter(b -> "CENTRAL".equalsIgnoreCase(b.governmentLevel())).toList();
            List<ChatBenefitSummary> state = surfacedBenefits.stream()
                    .filter(b -> "STATE".equalsIgnoreCase(b.governmentLevel())).toList();

            if (!central.isEmpty()) {
                sb.append("**केंद्रीय सरकारी योजनाएं:**\n");
                for (ChatBenefitSummary b : central) {
                    sb.append("• **").append(b.schemeName()).append("**: ").append(b.benefitInformation()).append("\n");
                }
                sb.append("\n");
            }

            if (!state.isEmpty()) {
                sb.append("**राज्य सरकारी योजनाएं (कर्नाटक):**\n");
                for (ChatBenefitSummary b : state) {
                    sb.append("• **").append(b.schemeName()).append("**: ").append(b.benefitInformation()).append("\n");
                }
                sb.append("\n");
            }

            sb.append("किसी भी योजना के आवश्यक दस्तावेज़ जानने के लिए पूछें (उदाहरण: 'इसके लिए क्या चाहिए?').");
            return sb.toString();
        }

        if (intent == ChatIntent.SCHEME_REQUIREMENTS || intent == ChatIntent.READINESS_STATUS) {
            String name = activeScheme != null ? activeScheme.getName() : "इस योजना";
            StringBuilder sb = new StringBuilder();
            sb.append("**").append(name).append("** के लिए आवश्यक दस्तावेज़ और जानकारी:\n\n");

            if (checklist != null && !checklist.requiredDocuments().isEmpty()) {
                sb.append("**आवश्यक दस्तावेज़:**\n");
                for (ChecklistDocument doc : checklist.requiredDocuments()) {
                    sb.append("• ").append(doc.name()).append(doc.required() ? " (अनिवार्य)" : " (वैकल्पिक)").append("\n");
                }
                sb.append("\n");

                sb.append("**आवेदन कहां करें:** ").append(checklist.whereToApply()).append("\n");
                sb.append("**आधिकारिक पोर्टल:** ").append(checklist.officialApplicationUrl()).append("\n\n");

                if (!checklist.applicationSteps().isEmpty()) {
                    sb.append("**आवेदन के चरण:**\n");
                    for (ChecklistStep step : checklist.applicationSteps()) {
                        sb.append(step.stepNumber()).append(". ").append(step.title()).append(": ").append(step.instructions()).append("\n");
                    }
                    sb.append("\n");
                }
            }

            if (readiness != null) {
                sb.append("**आपकी दस्तावेज़ तैयारी स्थिति:** ").append(readiness.readinessPercentage()).append("% (")
                        .append(readiness.trafficLight()).append(")\n")
                        .append("पूर्ण दस्तावेज़: ").append(readiness.completedDocuments())
                        .append(" / ").append(readiness.totalRequired()).append("\n\n");
            }

            sb.append("⚠️ **पारदर्शिता सूचना:** यह योजना आवेदन के लिए पूर्णतः निःशुल्क है — यदि कोई पैसे मांगता है, तो यह गैरकानूनी है।");
            return sb.toString();
        }

        if (!groundedContext.isBlank()) {
            return "सत्यापित सरकारी विवरण:\n\n" + groundedContext;
        }

        return "सिस्टम के पास इस प्रश्न का उत्तर देने के लिए पर्याप्त सत्यापित जानकारी नहीं है। कृपया आधिकारिक सरकारी पोर्टल पर जाएं।";
    }

    private String generateKannadaReply(ChatIntent intent,
                                        Scheme activeScheme,
                                        List<ChatBenefitSummary> surfacedBenefits,
                                        ActionChecklist checklist,
                                        ChatReadinessSummary readiness,
                                        String groundedContext) {
        if (intent == ChatIntent.GREETING) {
            return "ನಮಸ್ಕಾರ! ನಾನು Swatva AI ಸಹಾಯಕ. ನಾನು ನಿಮಗೆ ಹೀಗೆ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ:\n\n"
                    + "• **ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು ಹುಡುಕಿ** — ಕೇಳಿ \"ನನಗೆ ಯಾವ ಯೋಜನೆಗಳು ಇವೆ?\"\n"
                    + "• **ಅಗತ್ಯ ದಾಖಲೆಗಳು ತಿಳಿಯಿರಿ** — ಕೇಳಿ \"PM-KISAN ಗೆ ಏನು ಬೇಕು?\"\n"
                    + "• **ಅರ್ಜಿ ಸಿದ್ಧತೆ ನೋಡಿ** — ಕೇಳಿ \"ನಾನು ಅರ್ಜಿ ಹಾಕಲು ಸಿದ್ಧವಾಗಿದ್ದೇನೆಯೇ?\"\n\n"
                    + "ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಹೆಚ್ಚು ಭರ್ತಿ ಮಾಡಿದಷ್ಟು, ನಾನು ಹೆಚ್ಚು ನಿಖರವಾದ ಉತ್ತರ ನೀಡಬಲ್ಲೆ. ಇಂದು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?";
        }

        if (intent == ChatIntent.DISCOVER_BENEFITS) {
            StringBuilder sb = new StringBuilder();
            sb.append("ನಮಸ್ಕಾರ! ನಿಮ್ಮ ವಿವರಗಳ ಪ್ರಕಾರ, ಈ ಕೆಳಗಿನ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು ನಿಮಗೆ ಲಭ್ಯವಿವೆ:\n\n");

            List<ChatBenefitSummary> central = surfacedBenefits.stream()
                    .filter(b -> "CENTRAL".equalsIgnoreCase(b.governmentLevel())).toList();
            List<ChatBenefitSummary> state = surfacedBenefits.stream()
                    .filter(b -> "STATE".equalsIgnoreCase(b.governmentLevel())).toList();

            if (!central.isEmpty()) {
                sb.append("**ಕೇಂದ್ರ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು:**\n");
                for (ChatBenefitSummary b : central) {
                    sb.append("• **").append(b.schemeName()).append("**: ").append(b.benefitInformation()).append("\n");
                }
                sb.append("\n");
            }

            if (!state.isEmpty()) {
                sb.append("**ಕರ್ನಾಟಕ ರಾಜ್ಯ ಯೋಜನೆಗಳು:**\n");
                for (ChatBenefitSummary b : state) {
                    sb.append("• **").append(b.schemeName()).append("**: ").append(b.benefitInformation()).append("\n");
                }
                sb.append("\n");
            }

            sb.append("ಯಾವುದೇ ಯೋಜನೆಯ ಅಗತ್ಯ ದಾಖಲೆಗಳನ್ನು ತಿಳಿಯಲು 'ಇದಕ್ಕೆ ಏನು ಬೇಕು?' ಎಂದು ಕೇಳಿ.");
            return sb.toString();
        }

        if (intent == ChatIntent.SCHEME_REQUIREMENTS || intent == ChatIntent.READINESS_STATUS) {
            String name = activeScheme != null ? activeScheme.getName() : "ಈ ಯೋಜನೆ";
            StringBuilder sb = new StringBuilder();
            sb.append("**").append(name).append("** ಯೋಜನೆಗೆ ಅಗತ್ಯವಿರುವ ದಾಖಲೆಗಳು ಮತ್ತು ಅರ್ಜಿ ವಿವರಗಳು:\n\n");

            if (checklist != null && !checklist.requiredDocuments().isEmpty()) {
                sb.append("**ಅಗತ್ಯ ದಾಖಲೆಗಳು:**\n");
                for (ChecklistDocument doc : checklist.requiredDocuments()) {
                    sb.append("• ").append(doc.name()).append(doc.required() ? " (ಕಡ್ಡಾಯ)" : " (ಐಚ್ಛಿಕ)").append("\n");
                }
                sb.append("\n");

                sb.append("**ಅರ್ಜಿ ಸಲ್ಲಿಸುವ ಸ್ಥಳ:** ").append(checklist.whereToApply()).append("\n");
                sb.append("**ಅಧಿಕೃತ ಪೋರ್ಟಲ್:** ").append(checklist.officialApplicationUrl()).append("\n\n");
            }

            if (readiness != null) {
                sb.append("**ದಾಖಲೆಗಳ ಸಿದ್ಧತೆ:** ").append(readiness.readinessPercentage()).append("% (")
                        .append(readiness.trafficLight()).append(")\n\n");
            }

            sb.append("⚠️ **ಪಾರದರ್ಶಕತೆ ಎಚ್ಚರಿಕೆ:** ಈ ಯೋಜನೆಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸುವುದು ಸಂಪೂರ್ಣ ಉಚಿತ — ಯಾರಾದರೂ ಹಣ ಕೇಳಿದರೆ, ಅದು ಕಾನೂನುಬಾಹಿರ.");
            return sb.toString();
        }

        if (!groundedContext.isBlank()) {
            return "ಪರಿಶೀಲಿಸಿದ ಸರ್ಕಾರಿ ಮಾಹಿತಿ:\n\n" + groundedContext;
        }

        return "ಈ ಪ್ರಶ್ನೆಗೆ ಉತ್ತರಿಸಲು ಸಿಸ್ಟಮ್‌ನಲ್ಲಿ ಸಾಕಷ್ಟು ಪರಿಶೀಲಿಸಿದ ಮಾಹಿತಿ ಇಲ್ಲ. ದಯವಿಟ್ಟು ಅಧಿಕೃತ ಸರ್ಕಾರಿ ಪೋರ್ಟಲ್ ಅನ್ನು ಪರಿಶೀಲಿಸಿ.";
    }

    private String generateEnglishReply(ChatIntent intent,
                                        Scheme activeScheme,
                                        List<ChatBenefitSummary> surfacedBenefits,
                                        ActionChecklist checklist,
                                        ChatReadinessSummary readiness,
                                        String groundedContext) {
        if (intent == ChatIntent.GREETING) {
            return "Hello! I'm the Swatva AI assistant. I can help you:\n\n"
                    + "• **Find government schemes** you may be eligible for — just say \"What schemes am I eligible for?\"\n"
                    + "• **Check documents required** for any scheme — say \"What documents do I need for PM-KISAN?\"\n"
                    + "• **Track your application readiness** — say \"Am I ready to apply?\"\n\n"
                    + "The more you fill in your profile, the more accurate my answers will be. How can I help you today?";
        }

        if (intent == ChatIntent.DISCOVER_BENEFITS) {
            StringBuilder sb = new StringBuilder();
            sb.append("Based on your profile, here are the potentially eligible schemes for you:\n\n");

            List<ChatBenefitSummary> central = surfacedBenefits.stream()
                    .filter(b -> "CENTRAL".equalsIgnoreCase(b.governmentLevel())).toList();
            List<ChatBenefitSummary> state = surfacedBenefits.stream()
                    .filter(b -> "STATE".equalsIgnoreCase(b.governmentLevel())).toList();

            if (!central.isEmpty()) {
                sb.append("**Central Government Schemes:**\n");
                for (ChatBenefitSummary b : central) {
                    sb.append("• **").append(b.schemeName()).append("**: ").append(b.benefitInformation()).append("\n");
                }
                sb.append("\n");
            }

            if (!state.isEmpty()) {
                sb.append("**State Government Schemes:**\n");
                for (ChatBenefitSummary b : state) {
                    sb.append("• **").append(b.schemeName()).append("**: ").append(b.benefitInformation()).append("\n");
                }
                sb.append("\n");
            }

            sb.append("To check requirements for any scheme, simply ask (e.g., 'What is needed for this?').");
            return sb.toString();
        }

        if (intent == ChatIntent.SCHEME_REQUIREMENTS || intent == ChatIntent.READINESS_STATUS) {
            String name = activeScheme != null ? activeScheme.getName() : "this scheme";
            StringBuilder sb = new StringBuilder();
            sb.append("Here are the required documents and application steps for **").append(name).append("**:\n\n");

            if (checklist != null && !checklist.requiredDocuments().isEmpty()) {
                sb.append("**Required Documents:**\n");
                for (ChecklistDocument doc : checklist.requiredDocuments()) {
                    sb.append("• ").append(doc.name()).append(doc.required() ? " (Required)" : " (Optional)").append("\n");
                }
                sb.append("\n");

                sb.append("**Where to Apply:** ").append(checklist.whereToApply()).append("\n");
                sb.append("**Official Portal:** ").append(checklist.officialApplicationUrl()).append("\n\n");

                if (!checklist.applicationSteps().isEmpty()) {
                    sb.append("**Application Steps:**\n");
                    for (ChecklistStep step : checklist.applicationSteps()) {
                        sb.append(step.stepNumber()).append(". ").append(step.title()).append(": ").append(step.instructions()).append("\n");
                    }
                    sb.append("\n");
                }
            }

            if (readiness != null) {
                sb.append("**Your Document Locker Readiness:** ").append(readiness.readinessPercentage()).append("% (")
                        .append(readiness.trafficLight()).append(")\n")
                        .append("Completed Documents: ").append(readiness.completedDocuments())
                        .append(" / ").append(readiness.totalRequired()).append("\n\n");
            }

            sb.append("⚠️ **Transparency Warning:** This scheme is free to apply for — if anyone asks for money, it is illegal.");
            return sb.toString();
        }

        if (!groundedContext.isBlank()) {
            return "Based on verified government scheme information:\n\n" + groundedContext;
        }

        return "The system does not have enough verified information to answer this question. Please refer to the official government portals.";
    }

    private ChatSession resolveSession(UUID sessionId, User user) {
        if (sessionId != null) {
            Optional<ChatSession> existing = sessionRepository.findById(sessionId);
            if (existing.isPresent()) {
                ChatSession s = existing.get();
                if (s.getUser() == null && user != null) {
                    s.setUser(user);
                }
                return s;
            }
        }

        ChatSession session = new ChatSession();
        if (sessionId != null) {
            session.setId(sessionId);
        }
        if (user != null) {
            session.setUser(user);
        }
        return sessionRepository.save(session);
    }

    private String detectLanguage(ChatRequest request, ChatSession session) {
        String text = request.message() != null ? request.message() : "";
        if (DEVANAGARI_PATTERN.matcher(text).find()) {
            return "hi";
        }
        if (KANNADA_PATTERN.matcher(text).find()) {
            return "kn";
        }

        String lower = text.toLowerCase(Locale.ROOT);
        if (lower.contains("mere liye") || lower.contains("kya chahiye") || lower.contains("yojana") || lower.contains("kaun si")
                || lower.contains("hindi") || lower.contains("baat") || lower.contains("madad") || lower.contains("kaise")
                || lower.contains("batao") || lower.contains("namaste") || lower.contains("karen") || lower.contains("karo")
                || lower.contains("chahiye") || lower.contains("kisan") || lower.contains("samjhao")) {
            return "hi";
        }
        if (lower.contains("nanage") || lower.contains("yavudu") || lower.contains("beku") || lower.contains("yojane") || lower.contains("kannada")) {
            return "kn";
        }

        if (request.normalizedLanguage() != null && !request.normalizedLanguage().isBlank()) {
            return request.normalizedLanguage();
        }

        if (session != null && session.getLanguage() != null && !session.getLanguage().isBlank()) {
            return session.getLanguage();
        }

        return "en";
    }

    private Scheme detectExplicitScheme(String query) {
        String lower = query.toLowerCase(Locale.ROOT);
        List<Scheme> all = schemeRepository.findAll();
        for (Scheme s : all) {
            if (lower.contains(s.getName().toLowerCase(Locale.ROOT))) {
                return s;
            }
        }
        // Check partial abbreviations
        if (lower.contains("kisan") || lower.contains("pm-kisan") || lower.contains("pmkisan")) {
            return schemeRepository.findByName("PM-KISAN").orElse(null);
        }
        if (lower.contains("gruha lakshmi") || lower.contains("graha lakshmi") || lower.contains("गृह लक्ष्मी")) {
            return schemeRepository.findByName("Gruha Lakshmi").orElse(null);
        }
        if (lower.contains("gruha jyothi") || lower.contains("graha jyothi") || lower.contains("गृह ज्योति")) {
            return schemeRepository.findByName("Gruha Jyothi").orElse(null);
        }
        if (lower.contains("yuva nidhi") || lower.contains("युवा निधि")) {
            return schemeRepository.findByName("Yuva Nidhi").orElse(null);
        }
        if (lower.contains("ayushman") || lower.contains("pmjay") || lower.contains("आयुष्मान")) {
            return all.stream().filter(s -> s.getName().contains("Jan Arogya")).findFirst().orElse(null);
        }
        return null;
    }

    private boolean isAnaphoricReference(String query, String lang) {
        String lower = query.toLowerCase(Locale.ROOT);
        if (lower.contains("इसके लिए") || lower.contains("इसके") || lower.contains("इस योजना") || lower.contains("iska")) {
            return true;
        }
        if (lower.contains("ಇದಕ್ಕೆ") || lower.contains("ಈ ಯೋಜನೆಗೆ") || lower.contains("idakk")) {
            return true;
        }
        if (lower.contains("for this") || lower.contains("for this scheme") || lower.contains("about this") || lower.contains("to apply for this")) {
            return true;
        }
        return false;
    }

    private ChatIntent classifyIntent(String query, String lang, boolean isAnaphoric, boolean hasActiveScheme) {
        String lower = query.toLowerCase(Locale.ROOT).strip();

        // Greetings — short openers that don't match any scheme topic
        if (lower.matches("(hi|hello|hey|namaste|namaskar|hii|helo|hai|नमस्ते|नमस्कार|ನಮಸ್ಕಾರ|ಹಾಯ್)([!?.\\s]*)")) {
            return ChatIntent.GREETING;
        }

        // Check if asking for requirements
        if (isAnaphoric || lower.contains("क्या चाहिए") || lower.contains("कागजात") || lower.contains("दस्तावेज़")
                || lower.contains("ಏನು ಬೇಕು") || lower.contains("ದಾಖಲೆಗಳು")
                || lower.contains("what is needed") || lower.contains("documents required")
                || lower.contains("what documents") || lower.contains("how to apply")) {
            return ChatIntent.SCHEME_REQUIREMENTS;
        }

        // Check if asking about readiness
        if (lower.contains("तैयार") || lower.contains("रेडी") || lower.contains("ಸಿದ್ಧ")
                || lower.contains("readiness") || lower.contains("ready to apply")) {
            return ChatIntent.READINESS_STATUS;
        }

        // Check if asking for schemes
        if (lower.contains("कौन सी सरकारी योजनाएं") || lower.contains("सरकारी योजनाएं") || lower.contains("मेरे लिए")
                || lower.contains("ಯಾವ ಯೋಜನೆಗಳು") || lower.contains("ನನಗೆ ಯಾವ")
                || lower.contains("what schemes") || lower.contains("available for me")
                || lower.contains("eligible for") || lower.contains("benefits for me")
                || lower.contains("schemes for me")) {
            return ChatIntent.DISCOVER_BENEFITS;
        }

        if (hasActiveScheme) {
            return ChatIntent.SCHEME_REQUIREMENTS;
        }

        return ChatIntent.GENERAL_QUERY;
    }

    private List<SchemeEvaluationPair> evaluateSchemes(List<Scheme> schemes, UserProfile profile) {
        List<SchemeEvaluationPair> list = new ArrayList<>();
        for (Scheme s : schemes) {
            EligibilityResult res = eligibilityService.evaluate(s, profile);
            if (res.status() != EligibilityStatus.NOT_ELIGIBLE) {
                list.add(new SchemeEvaluationPair(s, res));
            }
        }
        list.sort(Comparator.comparingInt((SchemeEvaluationPair p) -> p.result().matchPercentage()).reversed()
                .thenComparing(p -> p.scheme().getName()));
        return list;
    }

    private ChatBenefitSummary toBenefitSummary(Scheme s, EligibilityResult r) {
        return new ChatBenefitSummary(
                s.getId(),
                s.getName(),
                s.getGovernmentLevel().name(),
                s.getCategory(),
                s.getBenefitInformation(),
                s.getOfficialSourceUrl(),
                r.status().name(),
                r.matchPercentage()
        );
    }

    private String buildBenefitsGroundedContext(List<SchemeEvaluationPair> central,
                                                List<SchemeEvaluationPair> state,
                                                String stateName) {
        StringBuilder sb = new StringBuilder();
        sb.append("=== ELIGIBLE CENTRAL SCHEMES ===\n");
        for (SchemeEvaluationPair p : central) {
            sb.append("• ").append(p.scheme().getName())
                    .append(" (Status: ").append(p.result().status())
                    .append(", Match: ").append(p.result().matchPercentage()).append("%)\n")
                    .append("  Benefit: ").append(p.scheme().getBenefitInformation()).append("\n")
                    .append("  Source: ").append(p.scheme().getOfficialSourceUrl()).append("\n");
        }
        sb.append("\n=== ELIGIBLE STATE SCHEMES (").append(stateName).append(") ===\n");
        for (SchemeEvaluationPair p : state) {
            sb.append("• ").append(p.scheme().getName())
                    .append(" (Status: ").append(p.result().status())
                    .append(", Match: ").append(p.result().matchPercentage()).append("%)\n")
                    .append("  Benefit: ").append(p.scheme().getBenefitInformation()).append("\n")
                    .append("  Source: ").append(p.scheme().getOfficialSourceUrl()).append("\n");
        }
        return sb.toString();
    }

    private String buildRequirementsGroundedContext(Scheme scheme,
                                                    ActionChecklist checklist,
                                                    ChatReadinessSummary readiness,
                                                    List<RetrievedChunkDto> chunks) {
        StringBuilder sb = new StringBuilder();
        sb.append("=== SCHEME: ").append(scheme.getName()).append(" ===\n")
                .append("Authority: ").append(scheme.getIssuingAuthority()).append("\n")
                .append("Benefit: ").append(scheme.getBenefitInformation()).append("\n")
                .append("Official Portal: ").append(scheme.getOfficialSourceUrl()).append("\n");

        if (checklist != null) {
            sb.append("Required Documents:\n");
            for (ChecklistDocument doc : checklist.requiredDocuments()) {
                sb.append(" - ").append(doc.name()).append(" (Required: ").append(doc.required()).append(")\n");
            }
            sb.append("Application Steps:\n");
            for (ChecklistStep step : checklist.applicationSteps()) {
                sb.append(" ").append(step.stepNumber()).append(". ").append(step.title()).append(": ").append(step.instructions()).append("\n");
            }
            sb.append("Where to Apply: ").append(checklist.whereToApply()).append("\n");
        }

        if (readiness != null) {
            sb.append("Document Locker Readiness: ").append(readiness.readinessPercentage())
                    .append("% (Traffic Light: ").append(readiness.trafficLight()).append(")\n")
                    .append("Completed Documents: ").append(readiness.completedDocuments())
                    .append(" of ").append(readiness.totalRequired()).append("\n");
        }

        if (chunks != null && !chunks.isEmpty()) {
            sb.append("\nVerified Guidelines & RAG Chunks:\n");
            for (RetrievedChunkDto c : chunks) {
                sb.append("- ").append(c.documentType()).append(": ").append(c.content()).append("\n");
            }
        }

        sb.append("\nTransparency Rule: Free to apply; paying money to middlemen is illegal.\n");
        return sb.toString();
    }

    private record SchemeEvaluationPair(Scheme scheme, EligibilityResult result) {}

    public enum ChatIntent {
        GREETING,
        DISCOVER_BENEFITS,
        SCHEME_REQUIREMENTS,
        READINESS_STATUS,
        GENERAL_QUERY
    }
}
