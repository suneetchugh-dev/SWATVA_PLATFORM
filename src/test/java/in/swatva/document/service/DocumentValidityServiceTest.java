package in.swatva.document.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class DocumentValidityServiceTest {

    private UserDocumentRepository userDocumentRepository;
    private DocumentValidityRuleRepository documentValidityRuleRepository;
    private SchemeRepository schemeRepository;
    private UserRepository userRepository;
    private DocumentValidityService validityService;

    private User user;
    private DocumentType incomeCert;
    private DocumentType aadhaar;

    @BeforeEach
    void setUp() {
        userDocumentRepository = mock(UserDocumentRepository.class);
        documentValidityRuleRepository = mock(DocumentValidityRuleRepository.class);
        schemeRepository = mock(SchemeRepository.class);
        userRepository = mock(UserRepository.class);

        validityService = new DocumentValidityService(
                userDocumentRepository,
                documentValidityRuleRepository,
                schemeRepository,
                userRepository
        );

        user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("user@example.com");

        incomeCert = new DocumentType();
        incomeCert.setId(UUID.randomUUID());
        incomeCert.setCode("INCOME_CERTIFICATE");
        incomeCert.setName("Income Certificate");

        aadhaar = new DocumentType();
        aadhaar.setId(UUID.randomUUID());
        aadhaar.setCode("AADHAAR");
        aadhaar.setName("Aadhaar Card");

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
    }

    private UserDocument createDoc(DocumentType docType, LocalDate issueDate, LocalDate expiryDate) {
        UserDocument doc = new UserDocument();
        doc.setId(UUID.randomUUID());
        doc.setUser(user);
        doc.setDocumentType(docType);
        doc.setFilename(docType.getCode().toLowerCase() + ".pdf");
        doc.setStatus(DocumentStatus.ACTIVE);
        doc.setVerificationStatus(DocumentVerificationStatus.VERIFIED);
        doc.setIssueDate(issueDate);
        doc.setExpiryDate(expiryDate);
        return doc;
    }

    private DocumentValidityRule createRule(DocumentType type, String state, Scheme scheme,
                                            Integer validityMonths, Integer freshnessMonths, Integer warningDays) {
        DocumentValidityRule rule = new DocumentValidityRule();
        rule.setId(UUID.randomUUID());
        rule.setDocumentType(type);
        rule.setState(state);
        rule.setScheme(scheme);
        rule.setValidityMonths(validityMonths);
        rule.setFreshnessMonths(freshnessMonths);
        rule.setWarningPeriodDays(warningDays);
        rule.setActive(true);
        rule.setRuleDescription("Validity rule: " + (state != null ? state : "Generic"));
        return rule;
    }

    @Test
    void validatesDocumentAsValidWhenWithinValidityPeriod() {
        // Generic rule: 12 months validity, 30 days warning
        DocumentValidityRule genericRule = createRule(incomeCert, null, null, 12, null, 30);
        when(documentValidityRuleRepository.findByDocumentTypeIdAndActiveTrue(incomeCert.getId()))
                .thenReturn(List.of(genericRule));

        // Issued 3 months ago (valid for 9 more months)
        UserDocument doc = createDoc(incomeCert, LocalDate.now().minusMonths(3), null);

        DocumentValidationResponse response = validityService.validate(doc, null, null);

        assertThat(response.status()).isEqualTo(DocumentValidityStatus.VALID);
        assertThat(response.daysUntilExpiry()).isGreaterThan(200);
        assertThat(response.message()).contains("Document is valid until");
    }

    @Test
    void validatesDocumentAsExpiringSoonWhenWithinWarningPeriod() {
        // Rule: 12 months validity, 30 days warning period
        DocumentValidityRule rule = createRule(incomeCert, null, null, 12, null, 30);
        when(documentValidityRuleRepository.findByDocumentTypeIdAndActiveTrue(incomeCert.getId()))
                .thenReturn(List.of(rule));

        // Issued 11 months and 20 days ago (expires in ~10 days, within 30-day warning)
        LocalDate issueDate = LocalDate.now().minusMonths(12).plusDays(10);
        UserDocument doc = createDoc(incomeCert, issueDate, null);

        DocumentValidationResponse response = validityService.validate(doc, null, null);

        assertThat(response.status()).isEqualTo(DocumentValidityStatus.EXPIRING_SOON);
        assertThat(response.daysUntilExpiry()).isLessThanOrEqualTo(30);
        assertThat(response.message()).contains("Document expires soon");
    }

    @Test
    void validatesDocumentAsExpiredWhenPastValidityPeriod() {
        // Rule: 12 months validity
        DocumentValidityRule rule = createRule(incomeCert, null, null, 12, null, 30);
        when(documentValidityRuleRepository.findByDocumentTypeIdAndActiveTrue(incomeCert.getId()))
                .thenReturn(List.of(rule));

        // Issued 14 months ago
        UserDocument doc = createDoc(incomeCert, LocalDate.now().minusMonths(14), null);

        DocumentValidationResponse response = validityService.validate(doc, null, null);

        assertThat(response.status()).isEqualTo(DocumentValidityStatus.EXPIRED);
        assertThat(response.daysUntilExpiry()).isEqualTo(0);
        assertThat(response.message()).contains("Document expired based on 12-month validity rule");
    }

    @Test
    void validatesDocumentAsExpiredWhenFailingFreshnessRequirement() {
        // Scheme requiring document issued within last 3 months (freshness requirement)
        DocumentValidityRule rule = createRule(incomeCert, null, null, 12, 3, 30);
        when(documentValidityRuleRepository.findByDocumentTypeIdAndActiveTrue(incomeCert.getId()))
                .thenReturn(List.of(rule));

        // Issued 5 months ago: still within 12-month validity, but fails 3-month freshness requirement!
        UserDocument doc = createDoc(incomeCert, LocalDate.now().minusMonths(5), null);

        DocumentValidationResponse response = validityService.validate(doc, null, null);

        assertThat(response.status()).isEqualTo(DocumentValidityStatus.EXPIRED);
        assertThat(response.message()).contains("Document fails freshness requirement: issued on");
        assertThat(response.message()).contains("must be within last 3 months");
    }

    @Test
    void validatesDocumentAsNeedsReviewWhenValidityCannotBeDetermined() {
        // Rule requires validity calculation, but no dates are provided
        DocumentValidityRule rule = createRule(incomeCert, null, null, 12, null, 30);
        when(documentValidityRuleRepository.findByDocumentTypeIdAndActiveTrue(incomeCert.getId()))
                .thenReturn(List.of(rule));

        UserDocument docNoDates = createDoc(incomeCert, null, null);

        DocumentValidationResponse response = validityService.validate(docNoDates, null, null);

        assertThat(response.status()).isEqualTo(DocumentValidityStatus.NEEDS_REVIEW);
        assertThat(response.message()).contains("Document validity is unknown");
    }

    @Test
    void configurableValidityRuleSelectsStateSpecificRuleOverGeneric() {
        // Karnataka rule: 36 months validity
        DocumentValidityRule karnatakaRule = createRule(incomeCert, "Karnataka", null, 36, null, 60);
        karnatakaRule.setRuleDescription("Karnataka Nadakacheri 36-month certificate");

        // Generic rule: 12 months validity
        DocumentValidityRule genericRule = createRule(incomeCert, null, null, 12, null, 30);
        genericRule.setRuleDescription("Generic 12-month certificate");

        when(documentValidityRuleRepository.findByDocumentTypeIdAndActiveTrue(incomeCert.getId()))
                .thenReturn(List.of(genericRule, karnatakaRule));

        // Document issued 18 months ago
        UserDocument doc = createDoc(incomeCert, LocalDate.now().minusMonths(18), null);

        // 1. Validating with state = "Karnataka" -> should use Karnataka rule (36 months) -> VALID
        DocumentValidationResponse karnatakaResponse = validityService.validate(doc, null, "Karnataka");
        assertThat(karnatakaResponse.status()).isEqualTo(DocumentValidityStatus.VALID);
        assertThat(karnatakaResponse.matchedRuleDescription()).isEqualTo("Karnataka Nadakacheri 36-month certificate");

        // 2. Validating with other state / null -> should fallback to Generic rule (12 months) -> EXPIRED
        DocumentValidationResponse genericResponse = validityService.validate(doc, null, "Maharashtra");
        assertThat(genericResponse.status()).isEqualTo(DocumentValidityStatus.EXPIRED);
        assertThat(genericResponse.matchedRuleDescription()).isEqualTo("Generic 12-month certificate");
    }

    @Test
    void configurableValidityRuleSelectsSchemeSpecificRuleOverStateRule() {
        Scheme specialScheme = new Scheme();
        specialScheme.setId(UUID.randomUUID());
        specialScheme.setName("Special Farmer Scheme");
        specialScheme.setState("Karnataka");

        // Scheme-specific rule: 6 months validity
        DocumentValidityRule schemeRule = createRule(incomeCert, "Karnataka", specialScheme, 6, null, 15);
        schemeRule.setRuleDescription("Special Farmer Scheme 6-month validity");

        // State rule: 36 months validity
        DocumentValidityRule stateRule = createRule(incomeCert, "Karnataka", null, 36, null, 60);
        stateRule.setRuleDescription("Karnataka 36-month rule");

        when(documentValidityRuleRepository.findByDocumentTypeIdAndActiveTrue(incomeCert.getId()))
                .thenReturn(List.of(stateRule, schemeRule));

        // Document issued 8 months ago
        UserDocument doc = createDoc(incomeCert, LocalDate.now().minusMonths(8), null);

        // Validating against specialScheme -> picks Scheme rule -> EXPIRED (since 8 > 6)
        DocumentValidationResponse schemeResp = validityService.validate(doc, specialScheme.getId(), "Karnataka");
        assertThat(schemeResp.status()).isEqualTo(DocumentValidityStatus.EXPIRED);
        assertThat(schemeResp.matchedRuleDescription()).isEqualTo("Special Farmer Scheme 6-month validity");

        // Validating against other scheme in Karnataka -> picks State rule -> VALID (since 8 < 36)
        UUID otherSchemeId = UUID.randomUUID();
        DocumentValidationResponse stateResp = validityService.validate(doc, otherSchemeId, "Karnataka");
        assertThat(stateResp.status()).isEqualTo(DocumentValidityStatus.VALID);
        assertThat(stateResp.matchedRuleDescription()).isEqualTo("Karnataka 36-month rule");
    }

    @Test
    void manualDateEntryFallbackAllowsDemonstrationWithoutOcr() {
        // Document has NO dates stored (as if uploaded without OCR)
        UserDocument docWithoutDates = createDoc(incomeCert, null, null);
        UUID docId = docWithoutDates.getId();

        DocumentValidityRule rule = createRule(incomeCert, null, null, 12, null, 30);
        when(documentValidityRuleRepository.findByDocumentTypeIdAndActiveTrue(incomeCert.getId()))
                .thenReturn(List.of(rule));
        when(userDocumentRepository.findByIdAndUserId(docId, user.getId()))
                .thenReturn(Optional.of(docWithoutDates));

        // User supplies manual issue date (issued 2 months ago)
        DocumentValidationRequest manualRequest = new DocumentValidationRequest(
                null,
                null,
                LocalDate.now().minusMonths(2),
                null
        );

        DocumentValidationResponse response = validityService.validateDocument(docId, "user@example.com", manualRequest);

        assertThat(response.status()).isEqualTo(DocumentValidityStatus.VALID);
        assertThat(response.issueDate()).isEqualTo(LocalDate.now().minusMonths(2));
        verify(userDocumentRepository).save(docWithoutDates);
        assertThat(docWithoutDates.getIssueDate()).isEqualTo(LocalDate.now().minusMonths(2));
    }

    @Test
    void permanentDocumentLikeAadhaarIsValidWithoutExpiration() {
        // No validity rule for Aadhaar
        when(documentValidityRuleRepository.findByDocumentTypeIdAndActiveTrue(aadhaar.getId()))
                .thenReturn(List.of());

        UserDocument aadhaarDoc = createDoc(aadhaar, LocalDate.of(2018, 5, 15), null);

        DocumentValidationResponse response = validityService.validate(aadhaarDoc, null, null);

        assertThat(response.status()).isEqualTo(DocumentValidityStatus.VALID);
        assertThat(response.message()).contains("no expiration date required");
    }

    @Test
    void throwsNotFoundWhenValidatingNonExistentDocument() {
        UUID nonExistent = UUID.randomUUID();
        when(userDocumentRepository.findByIdAndUserId(nonExistent, user.getId()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> validityService.validateDocument(nonExistent, "user@example.com", null))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Document not found");
    }
}
