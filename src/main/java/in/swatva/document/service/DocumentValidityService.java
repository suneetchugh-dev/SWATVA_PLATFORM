package in.swatva.document.service;

import in.swatva.common.exception.ResourceNotFoundException;
import in.swatva.document.api.DocumentValidationRequest;
import in.swatva.document.api.DocumentValidationResponse;
import in.swatva.document.model.DocumentType;
import in.swatva.document.model.DocumentValidityRule;
import in.swatva.document.model.UserDocument;
import in.swatva.document.model.enums.DocumentStatus;
import in.swatva.document.model.enums.DocumentValidityStatus;
import in.swatva.document.model.enums.DocumentVerificationStatus;
import in.swatva.document.repository.DocumentValidityRuleRepository;
import in.swatva.document.repository.UserDocumentRepository;
import in.swatva.scheme.model.Scheme;
import in.swatva.scheme.repository.SchemeRepository;
import in.swatva.user.model.User;
import in.swatva.user.repository.UserRepository;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DocumentValidityService {
    private static final Logger log = LoggerFactory.getLogger(DocumentValidityService.class);

    private final UserDocumentRepository userDocumentRepository;
    private final DocumentValidityRuleRepository documentValidityRuleRepository;
    private final SchemeRepository schemeRepository;
    private final UserRepository userRepository;

    public DocumentValidityService(UserDocumentRepository userDocumentRepository,
                                   DocumentValidityRuleRepository documentValidityRuleRepository,
                                   SchemeRepository schemeRepository,
                                   UserRepository userRepository) {
        this.userDocumentRepository = userDocumentRepository;
        this.documentValidityRuleRepository = documentValidityRuleRepository;
        this.schemeRepository = schemeRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public DocumentValidationResponse validateDocument(UUID documentId, String userEmail, DocumentValidationRequest request) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userEmail));

        UserDocument doc = userDocumentRepository.findByIdAndUserId(documentId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + documentId));

        // Manual date entry fallback
        if (request != null) {
            boolean updated = false;
            if (request.issueDate() != null) {
                doc.setIssueDate(request.issueDate());
                updated = true;
            }
            if (request.expiryDate() != null) {
                doc.setExpiryDate(request.expiryDate());
                updated = true;
            }
            if (updated) {
                userDocumentRepository.save(doc);
            }
        }

        UUID schemeId = (request != null) ? request.schemeId() : null;
        String state = (request != null) ? request.state() : null;

        if (state == null && schemeId != null) {
            Scheme scheme = schemeRepository.findById(schemeId).orElse(null);
            if (scheme != null && scheme.getState() != null) {
                state = scheme.getState();
            }
        }

        return validate(doc, schemeId, state);
    }

    @Transactional(readOnly = true)
    public DocumentValidationResponse validate(UserDocument doc, UUID schemeId, String state) {
        DocumentType docType = doc.getDocumentType();
        String typeCode = (docType != null) ? docType.getCode() : "DOCUMENT";
        String typeName = (docType != null) ? docType.getName() : "Document";

        DocumentValidityRule rule = findApplicableRule(docType, schemeId, state);
        String ruleDesc = (rule != null && rule.getRuleDescription() != null)
                ? rule.getRuleDescription()
                : "Standard validity rule";

        LocalDate issueDate = doc.getIssueDate();
        LocalDate expiryDate = doc.getExpiryDate();
        LocalDate today = LocalDate.now();

        // 1. Explicit document status / verification status check
        if (doc.getStatus() == DocumentStatus.EXPIRED || doc.getVerificationStatus() == DocumentVerificationStatus.EXPIRED) {
            return new DocumentValidationResponse(
                    doc.getId(), typeCode, typeName, DocumentValidityStatus.EXPIRED,
                    issueDate, expiryDate, ruleDesc, "Document is marked as EXPIRED", 0L
            );
        }

        if (doc.getVerificationStatus() == DocumentVerificationStatus.REJECTED) {
            return new DocumentValidationResponse(
                    doc.getId(), typeCode, typeName, DocumentValidityStatus.EXPIRED,
                    issueDate, expiryDate, ruleDesc, "Document verification was REJECTED", 0L
            );
        }

        // 2. Freshness requirement check
        if (rule != null) {
            if (rule.getFreshnessMonths() != null) {
                if (issueDate == null) {
                    return new DocumentValidationResponse(
                            doc.getId(), typeCode, typeName, DocumentValidityStatus.NEEDS_REVIEW,
                            null, expiryDate, ruleDesc,
                            "Freshness requirement (" + rule.getFreshnessMonths() + " months) cannot be verified because issue date is missing",
                            null
                    );
                }
                if (issueDate.plusMonths(rule.getFreshnessMonths()).isBefore(today)) {
                    return new DocumentValidationResponse(
                            doc.getId(), typeCode, typeName, DocumentValidityStatus.EXPIRED,
                            issueDate, expiryDate, ruleDesc,
                            "Document fails freshness requirement: issued on " + issueDate + ", must be within last " + rule.getFreshnessMonths() + " months",
                            0L
                    );
                }
            }

            if (rule.getFreshnessDays() != null) {
                if (issueDate == null) {
                    return new DocumentValidationResponse(
                            doc.getId(), typeCode, typeName, DocumentValidityStatus.NEEDS_REVIEW,
                            null, expiryDate, ruleDesc,
                            "Freshness requirement (" + rule.getFreshnessDays() + " days) cannot be verified because issue date is missing",
                            null
                    );
                }
                if (issueDate.plusDays(rule.getFreshnessDays()).isBefore(today)) {
                    return new DocumentValidationResponse(
                            doc.getId(), typeCode, typeName, DocumentValidityStatus.EXPIRED,
                            issueDate, expiryDate, ruleDesc,
                            "Document fails freshness requirement: issued on " + issueDate + ", must be within last " + rule.getFreshnessDays() + " days",
                            0L
                    );
                }
            }
        }

        // 3. Determine effective expiry date based on dates and validity period
        LocalDate effectiveExpiry = expiryDate;

        if (rule != null) {
            if (rule.getValidityMonths() != null && issueDate != null) {
                LocalDate ruleExpiry = issueDate.plusMonths(rule.getValidityMonths());
                if (effectiveExpiry == null || ruleExpiry.isBefore(effectiveExpiry)) {
                    effectiveExpiry = ruleExpiry;
                }
            }
            if (rule.getValidityDays() != null && issueDate != null) {
                LocalDate ruleExpiry = issueDate.plusDays(rule.getValidityDays());
                if (effectiveExpiry == null || ruleExpiry.isBefore(effectiveExpiry)) {
                    effectiveExpiry = ruleExpiry;
                }
            }
        }

        // 4. Expiry check
        if (effectiveExpiry != null && effectiveExpiry.isBefore(today)) {
            String expMsg = (rule != null && rule.getValidityMonths() != null && expiryDate == null)
                    ? "Document expired based on " + rule.getValidityMonths() + "-month validity rule (expired on " + effectiveExpiry + ")"
                    : (rule != null && rule.getValidityDays() != null && expiryDate == null)
                    ? "Document expired based on " + rule.getValidityDays() + "-day validity rule (expired on " + effectiveExpiry + ")"
                    : "Document expired on " + effectiveExpiry;
            return new DocumentValidationResponse(
                    doc.getId(), typeCode, typeName, DocumentValidityStatus.EXPIRED,
                    issueDate, effectiveExpiry, ruleDesc,
                    expMsg,
                    0L
            );
        }

        // 5. Warning period check (EXPIRING_SOON)
        int warningDays = (rule != null && rule.getWarningPeriodDays() != null)
                ? rule.getWarningPeriodDays()
                : 30;

        if (effectiveExpiry != null && !effectiveExpiry.isBefore(today) && !effectiveExpiry.isAfter(today.plusDays(warningDays))) {
            long daysLeft = ChronoUnit.DAYS.between(today, effectiveExpiry);
            return new DocumentValidationResponse(
                    doc.getId(), typeCode, typeName, DocumentValidityStatus.EXPIRING_SOON,
                    issueDate, effectiveExpiry, ruleDesc,
                    "Document expires soon on " + effectiveExpiry + " (" + daysLeft + " days remaining, warning period: " + warningDays + " days)",
                    daysLeft
            );
        }

        // 6. Unknown validity check (NEEDS_REVIEW)
        if (rule != null && (rule.getValidityMonths() != null || rule.getValidityDays() != null)
                && issueDate == null && expiryDate == null) {
            return new DocumentValidationResponse(
                    doc.getId(), typeCode, typeName, DocumentValidityStatus.NEEDS_REVIEW,
                    null, null, ruleDesc,
                    "Document validity is unknown: issue date or expiry date is required to verify validity period",
                    null
            );
        }

        if (doc.getStatus() == DocumentStatus.ARCHIVED) {
            return new DocumentValidationResponse(
                    doc.getId(), typeCode, typeName, DocumentValidityStatus.NEEDS_REVIEW,
                    issueDate, effectiveExpiry, ruleDesc,
                    "Document is archived; requires review or re-activation",
                    null
            );
        }

        if (doc.getVerificationStatus() == DocumentVerificationStatus.PENDING) {
            return new DocumentValidationResponse(
                    doc.getId(), typeCode, typeName, DocumentValidityStatus.NEEDS_REVIEW,
                    issueDate, effectiveExpiry, ruleDesc,
                    "Document verification is pending review",
                    null
            );
        }

        // 7. Valid
        Long daysLeft = (effectiveExpiry != null) ? ChronoUnit.DAYS.between(today, effectiveExpiry) : null;
        String message = (effectiveExpiry != null)
                ? "Document is valid until " + effectiveExpiry + " (" + daysLeft + " days remaining)"
                : "Document is valid with no expiration date required";

        return new DocumentValidationResponse(
                doc.getId(), typeCode, typeName, DocumentValidityStatus.VALID,
                issueDate, effectiveExpiry, ruleDesc,
                message,
                daysLeft
        );
    }

    public DocumentValidityRule findApplicableRule(DocumentType documentType, UUID schemeId, String state) {
        if (documentType == null || documentType.getId() == null) {
            return null;
        }

        List<DocumentValidityRule> candidateRules = documentValidityRuleRepository.findByDocumentTypeIdAndActiveTrue(documentType.getId());
        if (candidateRules == null || candidateRules.isEmpty()) {
            candidateRules = documentValidityRuleRepository.findByDocumentTypeId(documentType.getId());
        }
        if ((candidateRules == null || candidateRules.isEmpty()) && documentType.getValidityRules() != null) {
            candidateRules = documentType.getValidityRules().stream()
                    .filter(DocumentValidityRule::isActive)
                    .toList();
        }

        return candidateRules.stream()
                .map(r -> new ScoredRule(r, calculateSpecificity(r, schemeId, state)))
                .filter(sr -> sr.score >= 0)
                .max(Comparator.comparingInt(sr -> sr.score))
                .map(sr -> sr.rule)
                .orElse(null);
    }

    private int calculateSpecificity(DocumentValidityRule rule, UUID schemeId, String state) {
        int score = 0;
        boolean hasScheme = rule.getScheme() != null || rule.getSchemeId() != null;
        boolean hasState = rule.getState() != null && !rule.getState().isBlank();

        if (hasScheme) {
            UUID ruleSchemeId = rule.getSchemeId();
            if (schemeId != null && schemeId.equals(ruleSchemeId)) {
                score += 10;
            } else {
                return -1; // Rule configured for a different scheme
            }
        }

        if (hasState) {
            if (state != null && rule.getState().equalsIgnoreCase(state.trim())) {
                score += 5;
            } else {
                return -1; // Rule configured for a different state
            }
        }

        return score; // Default generic rule has score 0
    }

    private record ScoredRule(DocumentValidityRule rule, int score) {}
}
