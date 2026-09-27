package in.swatva.readiness.service;

import in.swatva.common.exception.ResourceNotFoundException;
import in.swatva.document.api.DocumentValidationResponse;
import in.swatva.document.model.UserDocument;
import in.swatva.document.model.enums.DocumentValidityStatus;
import in.swatva.document.repository.DocumentValidityRuleRepository;
import in.swatva.document.repository.UserDocumentRepository;
import in.swatva.document.service.DocumentValidityService;
import in.swatva.readiness.api.ApplicationReadinessResponse;
import in.swatva.readiness.api.ReadinessDocumentItem;
import in.swatva.readiness.model.enums.ReadinessTrafficLight;
import in.swatva.scheme.model.Scheme;
import in.swatva.scheme.model.SchemeDocumentRequirement;
import in.swatva.scheme.repository.SchemeRepository;
import in.swatva.user.model.User;
import in.swatva.user.repository.UserRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ApplicationReadinessService {

    private final SchemeRepository schemeRepository;
    private final UserRepository userRepository;
    private final UserDocumentRepository userDocumentRepository;
    private final DocumentValidityRuleRepository documentValidityRuleRepository;
    private final DocumentValidityService documentValidityService;

    public ApplicationReadinessService(SchemeRepository schemeRepository,
                                       UserRepository userRepository,
                                       UserDocumentRepository userDocumentRepository,
                                       DocumentValidityRuleRepository documentValidityRuleRepository) {
        this(schemeRepository, userRepository, userDocumentRepository, documentValidityRuleRepository, null);
    }

    @Autowired
    public ApplicationReadinessService(SchemeRepository schemeRepository,
                                       UserRepository userRepository,
                                       UserDocumentRepository userDocumentRepository,
                                       DocumentValidityRuleRepository documentValidityRuleRepository,
                                       @Autowired(required = false) DocumentValidityService documentValidityService) {
        this.schemeRepository = schemeRepository;
        this.userRepository = userRepository;
        this.userDocumentRepository = userDocumentRepository;
        this.documentValidityRuleRepository = documentValidityRuleRepository;
        this.documentValidityService = (documentValidityService != null)
                ? documentValidityService
                : new DocumentValidityService(userDocumentRepository, documentValidityRuleRepository, schemeRepository, userRepository);
    }

    @Transactional(readOnly = true)
    public ApplicationReadinessResponse calculateReadiness(UUID schemeId, String userEmail) {
        Scheme scheme = schemeRepository.findById(schemeId)
                .orElseThrow(() -> new ResourceNotFoundException("Scheme not found"));

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        List<UserDocument> userDocs = userDocumentRepository.findByUserId(user.getId());
        return evaluate(scheme, userDocs);
    }

    @Transactional(readOnly = true)
    public ApplicationReadinessResponse calculateReadiness(Scheme scheme, User user) {
        List<UserDocument> userDocs = (user != null)
                ? userDocumentRepository.findByUserId(user.getId())
                : List.of();
        return evaluate(scheme, userDocs);
    }

    public ApplicationReadinessResponse evaluate(Scheme scheme, List<UserDocument> userDocs) {
        List<SchemeDocumentRequirement> requirements = scheme.getDocumentRequirements().stream()
                .filter(SchemeDocumentRequirement::isRequired)
                .toList();

        if (requirements.isEmpty()) {
            requirements = scheme.getDocumentRequirements();
        }

        int totalRequired = requirements.size();

        List<ReadinessDocumentItem> completed = new ArrayList<>();
        List<ReadinessDocumentItem> missing = new ArrayList<>();
        List<ReadinessDocumentItem> invalid = new ArrayList<>();
        List<ReadinessDocumentItem> needsReview = new ArrayList<>();

        Map<String, List<UserDocument>> docsByType = userDocs.stream()
                .filter(d -> d.getDocumentType() != null && d.getDocumentType().getCode() != null)
                .collect(Collectors.groupingBy(d -> d.getDocumentType().getCode().trim().toUpperCase()));

        for (SchemeDocumentRequirement req : requirements) {
            if (req.getDocumentType() == null) {
                continue;
            }

            String code = req.getDocumentType().getCode().trim().toUpperCase();
            String name = req.getDocumentType().getName();
            boolean requiredFlag = req.isRequired();

            List<UserDocument> matching = docsByType.getOrDefault(code, List.of());

            if (matching.isEmpty()) {
                missing.add(ReadinessDocumentItem.missing(code, name, requiredFlag, req.getNotes()));
                continue;
            }

            DocumentEvaluationResult bestResult = evaluateMatchingDocuments(req, matching, scheme);

            switch (bestResult.status()) {
                case COMPLETE -> completed.add(bestResult.item());
                case INVALID -> invalid.add(bestResult.item());
                case NEEDS_REVIEW -> needsReview.add(bestResult.item());
                case MISSING -> missing.add(bestResult.item());
            }
        }

        int completedCount = completed.size();
        int missingCount = missing.size();
        int invalidCount = invalid.size();
        int needsReviewCount = needsReview.size();

        int percentage = (totalRequired == 0)
                ? 100
                : (int) Math.round((completedCount * 100.0) / totalRequired);

        ReadinessTrafficLight trafficLight = ReadinessTrafficLight.fromScore(percentage);

        return new ApplicationReadinessResponse(
                scheme.getId(),
                scheme.getName(),
                percentage,
                trafficLight,
                totalRequired,
                completedCount,
                missingCount,
                invalidCount,
                needsReviewCount,
                completed,
                missing,
                invalid,
                needsReview
        );
    }

    private DocumentEvaluationResult evaluateMatchingDocuments(SchemeDocumentRequirement req,
                                                                List<UserDocument> matching,
                                                                Scheme scheme) {
        String code = req.getDocumentType().getCode();
        String name = req.getDocumentType().getName();
        boolean requiredFlag = req.isRequired();

        List<DocumentEvaluationResult> evaluatedResults = new ArrayList<>();

        for (UserDocument doc : matching) {
            DocumentValidationResponse valResp = documentValidityService.validate(
                    doc,
                    scheme.getId(),
                    scheme.getState()
            );

            DocumentStatusCategory category;
            ReadinessDocumentItem item;

            if (doc.getStatus() == in.swatva.document.model.enums.DocumentStatus.NEEDS_REVIEW) {
                category = DocumentStatusCategory.NEEDS_REVIEW;
                item = ReadinessDocumentItem.needsReview(code, name, requiredFlag, doc.getId(), doc.getFilename(),
                        valResp.issueDate(), valResp.expiryDate(), "Document extraction requires citizen review");
            } else if (valResp.status() == DocumentValidityStatus.VALID) {
                category = DocumentStatusCategory.COMPLETE;
                item = ReadinessDocumentItem.complete(code, name, requiredFlag, doc.getId(), doc.getFilename(),
                        valResp.issueDate(), valResp.expiryDate());
            } else if (valResp.status() == DocumentValidityStatus.EXPIRING_SOON) {
                category = DocumentStatusCategory.COMPLETE;
                item = ReadinessDocumentItem.complete(code, name, requiredFlag, doc.getId(), doc.getFilename(),
                        valResp.issueDate(), valResp.expiryDate());
            } else if (valResp.status() == DocumentValidityStatus.EXPIRED) {
                category = DocumentStatusCategory.INVALID;
                item = ReadinessDocumentItem.invalid(code, name, requiredFlag, doc.getId(), doc.getFilename(),
                        valResp.issueDate(), valResp.expiryDate(), valResp.message());
            } else {
                category = DocumentStatusCategory.NEEDS_REVIEW;
                item = ReadinessDocumentItem.needsReview(code, name, requiredFlag, doc.getId(), doc.getFilename(),
                        valResp.issueDate(), valResp.expiryDate(), valResp.message());
            }

            evaluatedResults.add(new DocumentEvaluationResult(category, item));
        }

        // 1. If any is COMPLETE, choose it
        for (DocumentEvaluationResult res : evaluatedResults) {
            if (res.status() == DocumentStatusCategory.COMPLETE) {
                return res;
            }
        }

        // 2. If any is NEEDS_REVIEW, choose it
        for (DocumentEvaluationResult res : evaluatedResults) {
            if (res.status() == DocumentStatusCategory.NEEDS_REVIEW) {
                return res;
            }
        }

        // 3. Otherwise INVALID (or first result)
        if (!evaluatedResults.isEmpty()) {
            return evaluatedResults.get(0);
        }

        return new DocumentEvaluationResult(
                DocumentStatusCategory.MISSING,
                ReadinessDocumentItem.missing(code, name, requiredFlag, req.getNotes())
        );
    }

    private enum DocumentStatusCategory {
        COMPLETE,
        INVALID,
        MISSING,
        NEEDS_REVIEW
    }

    private record DocumentEvaluationResult(
            DocumentStatusCategory status,
            ReadinessDocumentItem item
    ) {
    }
}
