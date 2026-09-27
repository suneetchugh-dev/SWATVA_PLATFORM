package in.swatva.ai.service;

import in.swatva.ai.api.RetrievedChunkDto;
import in.swatva.ai.api.SchemeCitation;
import in.swatva.ai.api.SchemeExplanationResponse;
import in.swatva.ai.api.SchemeQueryRequest;
import in.swatva.ai.api.SchemeQueryResponse;
import in.swatva.common.exception.ResourceNotFoundException;
import in.swatva.eligibility.EligibilityResult;
import in.swatva.eligibility.EligibilityService;
import in.swatva.scheme.model.Scheme;
import in.swatva.scheme.repository.SchemeRepository;
import in.swatva.user.model.User;
import in.swatva.user.model.UserProfile;
import in.swatva.user.repository.UserProfileRepository;
import in.swatva.user.repository.UserRepository;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
public class SchemeRagService {

    private static final String INSUFFICIENT_INFO_MESSAGE =
            "The system does not have enough verified information to answer this question. Please refer to the official government portals.";

    private final SchemeRetrievalService retrievalService;
    private final ChatModel chatModel;
    private final SchemeRepository schemeRepository;
    private final UserRepository userRepository;
    private final UserProfileRepository profileRepository;
    private final EligibilityService eligibilityService;

    public SchemeRagService(SchemeRetrievalService retrievalService,
                            ChatModel chatModel,
                            SchemeRepository schemeRepository,
                            UserRepository userRepository,
                            UserProfileRepository profileRepository,
                            EligibilityService eligibilityService) {
        this.retrievalService = retrievalService;
        this.chatModel = chatModel;
        this.schemeRepository = schemeRepository;
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
        this.eligibilityService = eligibilityService;
    }

    public SchemeQueryResponse askQuestion(SchemeQueryRequest request) {
        List<RetrievedChunkDto> chunks = retrievalService.retrieveRelevantChunks(
                request.query(), request.state(), request.category(), 5);

        if (chunks.isEmpty()) {
            return new SchemeQueryResponse(
                    request.query(),
                    INSUFFICIENT_INFO_MESSAGE,
                    false,
                    List.of(),
                    List.of()
            );
        }

        List<SchemeCitation> citations = extractCitations(chunks);
        String contextText = buildGroundedContext(chunks);

        String prompt = """
                You are Swatva AI, an assistant for Indian government schemes and citizen benefits.
                You must answer the citizen's question strictly and ONLY using the verified scheme information provided below in the grounded context.

                CRITICAL CONSTRAINTS:
                - Do NOT invent, assume, or extrapolate any eligibility rules, benefits, or documents.
                - Answer only from the provided facts.
                - If the provided context is insufficient or does not contain enough verified information to answer the question accurately, explicitly state: "%s".
                - Keep citations/source URLs attached to retrieved scheme information.

                [GROUNDED CONTEXT]
                %s

                [CITIZEN QUESTION]
                %s
                """.formatted(INSUFFICIENT_INFO_MESSAGE, contextText, request.query());

        String answer;
        try {
            answer = chatModel.call(prompt);
            if (answer == null || answer.isBlank()) {
                answer = INSUFFICIENT_INFO_MESSAGE;
            }
        } catch (Exception ex) {
            log.warn("LLM call failed ({}), falling back to grounded context summary: {}",
                    ex.getClass().getSimpleName(), ex.getMessage());
            answer = buildFallbackAnswer(chunks);
        }

        boolean grounded = !answer.contains("not have enough verified information");

        return new SchemeQueryResponse(
                request.query(),
                answer.trim(),
                grounded,
                citations,
                chunks
        );
    }

    @Transactional(readOnly = true)
    public SchemeExplanationResponse explainSchemeMatch(UUID schemeId, String userEmail) {
        Scheme scheme = schemeRepository.findById(schemeId)
                .orElseThrow(() -> new ResourceNotFoundException("Scheme not found with id: " + schemeId));

        UserProfile profile = null;
        if (userEmail != null && !userEmail.isBlank()) {
            User user = userRepository.findByEmail(userEmail).orElse(null);
            if (user != null) {
                profile = profileRepository.findByUserId(user.getId()).orElse(null);
            }
        }

        EligibilityResult result = eligibilityService.evaluate(scheme, profile);

        List<RetrievedChunkDto> chunks = retrievalService.retrieveChunksForScheme(schemeId);
        List<SchemeCitation> citations = extractCitations(chunks);
        String contextText = buildGroundedContext(chunks);

        String prompt = """
                You are Swatva AI, an empathetic citizen-service assistant for Indian government benefits.
                Provide a plain-language explanation of why this scheme matched or did not match the citizen.

                CRITICAL RULES:
                - Do NOT decide or modify the eligibility outcome. The eligibility decision has ALREADY been deterministically made by the rules engine.
                - Deterministic Status: %s (Match Percentage: %d%%)
                - Satisfied Conditions: %s
                - Failed Conditions: %s
                - Missing Information Needed: %s

                Scheme Details:
                - Scheme Name: %s
                - Category: %s
                - Government Level: %s
                - Official Source URL: %s

                Verified Scheme Context:
                %s

                Instructions:
                Explain in simple, encouraging, plain language:
                1. The deterministic eligibility evaluation result and why the citizen satisfies or fails the specific criteria.
                2. Key benefits they can receive if eligible.
                3. Immediate next steps, documents needed, or missing profile fields required.
                4. Cite the official portal: %s.
                """.formatted(
                result.status(),
                result.matchPercentage(),
                result.satisfiedConditions().isEmpty() ? "None" : String.join("; ", result.satisfiedConditions()),
                result.failedConditions().isEmpty() ? "None" : String.join("; ", result.failedConditions()),
                result.missingInformation().isEmpty() ? "None" : String.join("; ", result.missingInformation()),
                scheme.getName(),
                scheme.getCategory(),
                scheme.getGovernmentLevel(),
                scheme.getOfficialSourceUrl(),
                contextText,
                scheme.getOfficialSourceUrl()
        );

        String explanation;
        try {
            explanation = chatModel.call(prompt);
            if (explanation == null || explanation.isBlank()) {
                explanation = buildDeterministicSummary(result, scheme);
            }
        } catch (Exception ex) {
            log.warn("LLM call failed ({}), falling back to deterministic explanation: {}",
                    ex.getClass().getSimpleName(), ex.getMessage());
            explanation = buildDeterministicSummary(result, scheme);
        }

        return new SchemeExplanationResponse(
                scheme.getId(),
                scheme.getName(),
                scheme.getOfficialSourceUrl(),
                result.status(),
                result.matchPercentage(),
                explanation.trim(),
                result.satisfiedConditions(),
                result.failedConditions(),
                result.missingInformation(),
                citations
        );
    }

    private String buildGroundedContext(List<RetrievedChunkDto> chunks) {
        StringBuilder sb = new StringBuilder();
        for (RetrievedChunkDto chunk : chunks) {
            sb.append("--- [Scheme: ").append(chunk.schemeName())
                    .append(" | Document Type: ").append(chunk.documentType())
                    .append(" | Official Source: ").append(chunk.sourceUrl()).append("] ---\n")
                    .append(chunk.content()).append("\n\n");
        }
        return sb.toString();
    }

    private List<SchemeCitation> extractCitations(List<RetrievedChunkDto> chunks) {
        Map<String, SchemeCitation> map = new LinkedHashMap<>();
        for (RetrievedChunkDto chunk : chunks) {
            String key = chunk.schemeId() + ":" + chunk.documentType();
            map.putIfAbsent(key, new SchemeCitation(
                    chunk.schemeId(),
                    chunk.schemeName(),
                    chunk.sourceUrl(),
                    chunk.documentType()
            ));
        }
        return new ArrayList<>(map.values());
    }

    private String buildFallbackAnswer(List<RetrievedChunkDto> chunks) {
        StringBuilder sb = new StringBuilder();
        sb.append("Based on verified government scheme information:\n\n");
        for (RetrievedChunkDto chunk : chunks) {
            sb.append("• ").append(chunk.schemeName()).append(" (").append(chunk.documentType()).append("):\n")
                    .append(chunk.content()).append("\nOfficial source: ").append(chunk.sourceUrl()).append("\n\n");
        }
        return sb.toString();
    }

    private String buildDeterministicSummary(EligibilityResult result, Scheme scheme) {
        StringBuilder sb = new StringBuilder();
        sb.append("Eligibility Status: ").append(result.status())
                .append(" (Match: ").append(result.matchPercentage()).append("%).\n");
        if (!result.satisfiedConditions().isEmpty()) {
            sb.append("Satisfied conditions: ").append(String.join(", ", result.satisfiedConditions())).append(".\n");
        }
        if (!result.failedConditions().isEmpty()) {
            sb.append("Failed conditions: ").append(String.join(", ", result.failedConditions())).append(".\n");
        }
        if (!result.missingInformation().isEmpty()) {
            sb.append("Missing information: ").append(String.join(", ", result.missingInformation())).append(".\n");
        }
        sb.append("Official scheme portal: ").append(scheme.getOfficialSourceUrl());
        return sb.toString();
    }
}
