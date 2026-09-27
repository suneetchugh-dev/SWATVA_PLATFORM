package in.sahayak.scheme;

import in.sahayak.ai.api.LifeEventSignals;
import in.sahayak.ai.api.RetrievedChunkDto;
import in.sahayak.ai.service.LifeEventSignalExtractionService;
import in.sahayak.ai.service.SchemeRetrievalService;
import in.sahayak.eligibility.EligibilityResult;
import in.sahayak.eligibility.EligibilityService;
import in.sahayak.eligibility.EligibilityStatus;
import in.sahayak.scheme.api.LifeEventDiscoveryRequest;
import in.sahayak.scheme.api.LifeEventDiscoveryResponse;
import in.sahayak.scheme.api.LifeEventSchemeMatch;
import in.sahayak.scheme.model.Scheme;
import in.sahayak.scheme.model.enums.GovernmentLevel;
import in.sahayak.scheme.model.enums.SchemeStatus;
import in.sahayak.scheme.repository.SchemeRepository;
import in.sahayak.user.model.User;
import in.sahayak.user.model.UserProfile;
import in.sahayak.user.model.enums.Gender;
import in.sahayak.user.repository.UserProfileRepository;
import in.sahayak.user.repository.UserRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LifeEventBenefitDiscoveryService {

    private static final Logger log = LoggerFactory.getLogger(LifeEventBenefitDiscoveryService.class);

    private static final Comparator<LifeEventSchemeMatch> MATCH_COMPARATOR =
            Comparator.comparingInt(LifeEventSchemeMatch::matchPercentage).reversed()
                    .thenComparing(LifeEventSchemeMatch::schemeName);

    private final LifeEventSignalExtractionService signalExtractor;
    private final SchemeRetrievalService retrievalService;
    private final EligibilityService eligibilityService;
    private final SchemeRepository schemeRepository;
    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;

    public LifeEventBenefitDiscoveryService(LifeEventSignalExtractionService signalExtractor,
                                            SchemeRetrievalService retrievalService,
                                            EligibilityService eligibilityService,
                                            SchemeRepository schemeRepository,
                                            UserRepository userRepository,
                                            UserProfileRepository userProfileRepository) {
        this.signalExtractor = signalExtractor;
        this.retrievalService = retrievalService;
        this.eligibilityService = eligibilityService;
        this.schemeRepository = schemeRepository;
        this.userRepository = userRepository;
        this.userProfileRepository = userProfileRepository;
    }

    @Transactional(readOnly = true)
    public LifeEventDiscoveryResponse discoverBenefits(LifeEventDiscoveryRequest request, String userEmail) {
        String description = request.description().trim();

        // 1. Extract structured signals using LLM (or deterministic fallback)
        LifeEventSignals signals = signalExtractor.extractSignals(description);
        log.info("Extracted life-event signals: eventType={}, member={}, occupation={}, education={}, income={}, location={}",
                signals.eventType(), signals.affectedFamilyMember(), signals.occupation(),
                signals.education(), signals.income(), signals.location());

        // 2. Resolve effective state
        String effectiveState = resolveEffectiveState(request, signals, userEmail);

        // 3. Query RAG vector store and keyword index for grounded scheme chunks
        List<RetrievedChunkDto> retrievedChunks = retrievalService.retrieveRelevantChunks(
                description, effectiveState, null, 10);
        Map<UUID, List<String>> chunksBySchemeId = new HashMap<>();
        for (RetrievedChunkDto chunk : retrievedChunks) {
            if (chunk.schemeId() != null && chunk.content() != null) {
                chunksBySchemeId.computeIfAbsent(chunk.schemeId(), k -> new ArrayList<>())
                        .add(chunk.content().trim());
            }
        }

        // 4. Construct synthetic evaluation profile by overlaying life-event signals onto citizen profile
        UserProfile evaluationProfile = buildEvaluationProfile(signals, effectiveState, userEmail);

        // 5. Evaluate Central Schemes deterministically
        List<Scheme> centralCandidates = schemeRepository.findByGovernmentLevel(GovernmentLevel.CENTRAL).stream()
                .filter(s -> s.getStatus() == SchemeStatus.ACTIVE)
                .toList();

        List<LifeEventSchemeMatch> centralMatches = evaluateCandidates(
                centralCandidates, evaluationProfile, signals, chunksBySchemeId);

        // 6. Evaluate State Schemes deterministically
        List<LifeEventSchemeMatch> stateMatches = List.of();
        if (effectiveState != null && !effectiveState.isBlank()) {
            List<Scheme> stateCandidates = schemeRepository.findByGovernmentLevelAndStateIgnoreCase(
                    GovernmentLevel.STATE, effectiveState).stream()
                    .filter(s -> s.getStatus() == SchemeStatus.ACTIVE)
                    .toList();

            stateMatches = evaluateCandidates(
                    stateCandidates, evaluationProfile, signals, chunksBySchemeId);
        }

        return LifeEventDiscoveryResponse.of(description, signals, centralMatches, stateMatches);
    }

    private List<LifeEventSchemeMatch> evaluateCandidates(List<Scheme> candidates,
                                                          UserProfile profile,
                                                          LifeEventSignals signals,
                                                          Map<UUID, List<String>> chunksBySchemeId) {
        List<LifeEventSchemeMatch> matches = new ArrayList<>();

        for (Scheme scheme : candidates) {
            EligibilityResult evaluation = eligibilityService.evaluate(scheme, profile);

            // Do not surface schemes that deterministically failed a hard condition
            if (evaluation.status() == EligibilityStatus.NOT_ELIGIBLE) {
                continue;
            }

            boolean hasSatisfiedRules = !evaluation.satisfiedConditions().isEmpty();
            boolean hasRagRelevance = chunksBySchemeId.containsKey(scheme.getId());
            boolean categoryRelevance = isCategoryRelevant(scheme, signals);

            // Surface if criteria were satisfied, or RAG retrieved relevant chunks, or high category affinity
            if (hasSatisfiedRules || hasRagRelevance || categoryRelevance || evaluation.status() == EligibilityStatus.ELIGIBLE || evaluation.status() == EligibilityStatus.POTENTIALLY_ELIGIBLE) {
                List<String> snippets = chunksBySchemeId.getOrDefault(scheme.getId(), List.of()).stream()
                        .limit(2)
                        .toList();

                String whySurfaced = formulateWhySurfaced(scheme, evaluation, signals, hasRagRelevance);

                matches.add(new LifeEventSchemeMatch(
                        scheme.getId(),
                        scheme.getName(),
                        scheme.getCategory(),
                        scheme.getGovernmentLevel(),
                        scheme.getState(),
                        scheme.getBenefitInformation(),
                        scheme.getIssuingAuthority(),
                        scheme.getOfficialSourceUrl(),
                        evaluation.status(),
                        evaluation.matchPercentage(),
                        whySurfaced,
                        evaluation.satisfiedConditions(),
                        evaluation.failedConditions(),
                        evaluation.missingInformation(),
                        snippets
                ));
            }
        }

        matches.sort(MATCH_COMPARATOR);
        return matches;
    }

    private String formulateWhySurfaced(Scheme scheme,
                                        EligibilityResult evaluation,
                                        LifeEventSignals signals,
                                        boolean hasRagRelevance) {
        StringBuilder sb = new StringBuilder();

        if (!evaluation.satisfiedConditions().isEmpty()) {
            sb.append("Satisfied scheme criteria: ")
                    .append(String.join("; ", evaluation.satisfiedConditions()))
                    .append(".");
        } else if (hasRagRelevance) {
            sb.append("Surfaced through semantic discovery matching '")
                    .append(signals.eventType())
                    .append("' in official scheme guidelines.");
        } else {
            sb.append("Surfaced as potentially relevant to your ")
                    .append(signals.eventType().replace("_", " ").toLowerCase())
                    .append(" life event.");
        }

        if (signals.occupation() != null && scheme.getCategory() != null) {
            String lowerCat = scheme.getCategory().toLowerCase();
            if (lowerCat.contains("agri") && "FARMER".equalsIgnoreCase(signals.occupation())) {
                sb.append(" Matched farming occupation and agricultural income criteria.");
            } else if (lowerCat.contains("employ") && "UNEMPLOYED".equalsIgnoreCase(signals.occupation())) {
                sb.append(" Aligns with job-seeking and unemployment support.");
            } else if (lowerCat.contains("live") && "ARTISAN".equalsIgnoreCase(signals.occupation())) {
                sb.append(" Aligns with traditional artisan and craftsperson livelihood benefits.");
            }
        }

        if (signals.income() != null && signals.income() > 0) {
            sb.append(" Stated income (₹").append(Math.round(signals.income())).append(") aligns with verified eligibility thresholds.");
        }

        return sb.toString().trim();
    }

    private boolean isCategoryRelevant(Scheme scheme, LifeEventSignals signals) {
        String eventType = signals.eventType() != null ? signals.eventType() : "";
        String cat = scheme.getCategory() != null ? scheme.getCategory().toLowerCase() : "";
        String name = scheme.getName() != null ? scheme.getName().toLowerCase() : "";

        return switch (eventType) {
            case "FARMING_AGRICULTURE" -> cat.contains("agri") || name.contains("kisan") || name.contains("farmer");
            case "HIGHER_EDUCATION" -> cat.contains("employ") || cat.contains("educat") || cat.contains("skill") || name.contains("yuva");
            case "JOB_LOSS_UNEMPLOYMENT" -> cat.contains("employ") || cat.contains("livelihood") || cat.contains("financial") || name.contains("yuva");
            case "CHILDBIRTH_MATERNITY" -> cat.contains("maternal") || cat.contains("women") || name.contains("thayi") || name.contains("madilu");
            case "MARRIAGE" -> cat.contains("marriage") || cat.contains("social") || name.contains("marriage");
            case "LIVELIHOOD_ARTISAN" -> cat.contains("livelihood") || name.contains("vishwakarma");
            case "HEALTHCARE_EMERGENCY" -> cat.contains("health") || name.contains("arogya") || name.contains("ayushman");
            default -> false;
        };
    }

    private String resolveEffectiveState(LifeEventDiscoveryRequest request,
                                         LifeEventSignals signals,
                                         String userEmail) {
        if (request.getEffectiveState() != null) {
            return request.getEffectiveState();
        }
        if (signals.location() != null && !signals.location().isBlank()) {
            return signals.location().trim();
        }
        if (userEmail != null && !userEmail.isBlank()) {
            return userRepository.findByEmail(userEmail)
                    .flatMap(u -> userProfileRepository.findByUserId(u.getId()))
                    .map(UserProfile::getState)
                    .filter(s -> s != null && !s.isBlank())
                    .orElse(null);
        }
        return null;
    }

    private UserProfile buildEvaluationProfile(LifeEventSignals signals, String state, String userEmail) {
        UserProfile synthetic = new UserProfile();

        // 1. Copy baseline profile if authenticated user has one
        if (userEmail != null && !userEmail.isBlank()) {
            userRepository.findByEmail(userEmail)
                    .flatMap(u -> userProfileRepository.findByUserId(u.getId()))
                    .ifPresent(existing -> {
                        synthetic.setAge(existing.getAge());
                        synthetic.setState(existing.getState());
                        synthetic.setDistrict(existing.getDistrict());
                        synthetic.setAnnualIncome(existing.getAnnualIncome());
                        synthetic.setOccupation(existing.getOccupation());
                        synthetic.setEducation(existing.getEducation());
                        synthetic.setCategory(existing.getCategory());
                        synthetic.setGender(existing.getGender());
                        synthetic.setDisabilityStatus(existing.getDisabilityStatus());
                        synthetic.setHouseholdSize(existing.getHouseholdSize());
                    });
        }

        // 2. Overlay life-event signals
        if (state != null && !state.isBlank()) {
            synthetic.setState(state.trim());
        }

        if (signals.occupation() != null && !signals.occupation().isBlank()) {
            synthetic.setOccupation(signals.occupation().trim());
        }

        if (signals.education() != null && !signals.education().isBlank()) {
            synthetic.setEducation(signals.education().trim());
        }

        if (signals.income() != null) {
            synthetic.setAnnualIncome(BigDecimal.valueOf(signals.income()));
        }

        if (signals.affectedFamilyMember() != null) {
            String member = signals.affectedFamilyMember().toUpperCase();
            if (member.equals("DAUGHTER") || member.equals("MOTHER") || member.equals("WIFE")) {
                synthetic.setGender(Gender.FEMALE);
            } else if (member.equals("FATHER") || member.equals("SON") || member.equals("HUSBAND")) {
                synthetic.setGender(Gender.MALE);
            }
        }

        // Apply realistic age defaults if not present
        if (synthetic.getAge() == null) {
            if ("STUDENT".equalsIgnoreCase(synthetic.getOccupation())
                    || "COLLEGE".equalsIgnoreCase(synthetic.getEducation())) {
                synthetic.setAge(19);
            } else if ("FARMER".equalsIgnoreCase(synthetic.getOccupation())
                    || "ARTISAN".equalsIgnoreCase(synthetic.getOccupation())
                    || "UNEMPLOYED".equalsIgnoreCase(synthetic.getOccupation())) {
                synthetic.setAge(30);
            }
        }

        return synthetic;
    }
}
