package in.swatva.readiness.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import in.swatva.common.exception.ResourceNotFoundException;
import in.swatva.document.model.DocumentType;
import in.swatva.document.model.DocumentValidityRule;
import in.swatva.document.model.UserDocument;
import in.swatva.document.model.enums.DocumentStatus;
import in.swatva.document.model.enums.DocumentVerificationStatus;
import in.swatva.document.repository.DocumentValidityRuleRepository;
import in.swatva.document.repository.UserDocumentRepository;
import in.swatva.readiness.api.ApplicationReadinessResponse;
import in.swatva.readiness.model.enums.ReadinessTrafficLight;
import in.swatva.scheme.model.Scheme;
import in.swatva.scheme.model.SchemeDocumentRequirement;
import in.swatva.scheme.repository.SchemeRepository;
import in.swatva.user.model.User;
import in.swatva.user.repository.UserRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ApplicationReadinessServiceTest {

    private SchemeRepository schemeRepository;
    private UserRepository userRepository;
    private UserDocumentRepository userDocumentRepository;
    private DocumentValidityRuleRepository documentValidityRuleRepository;
    private ApplicationReadinessService readinessService;

    private User testUser;
    private DocumentType aadhaar;
    private DocumentType bankAccount;
    private DocumentType incomeCert;
    private DocumentType rationCard;

    @BeforeEach
    void setUp() {
        schemeRepository = mock(SchemeRepository.class);
        userRepository = mock(UserRepository.class);
        userDocumentRepository = mock(UserDocumentRepository.class);
        documentValidityRuleRepository = mock(DocumentValidityRuleRepository.class);

        readinessService = new ApplicationReadinessService(
                schemeRepository,
                userRepository,
                userDocumentRepository,
                documentValidityRuleRepository
        );

        testUser = new User();
        testUser.setId(UUID.randomUUID());
        testUser.setEmail("citizen@example.com");

        aadhaar = createDocType("AADHAAR", "Aadhaar Card");
        bankAccount = createDocType("BANK_ACCOUNT", "Bank Account Details");
        incomeCert = createDocType("INCOME_CERTIFICATE", "Income Certificate");
        rationCard = createDocType("RATION_CARD", "Ration Card");
    }

    private DocumentType createDocType(String code, String name) {
        DocumentType type = new DocumentType();
        type.setId(UUID.randomUUID());
        type.setCode(code);
        type.setName(name);
        return type;
    }

    private SchemeDocumentRequirement requirement(DocumentType type, boolean required) {
        SchemeDocumentRequirement req = new SchemeDocumentRequirement();
        req.setId(UUID.randomUUID());
        req.setDocumentType(type);
        req.setRequired(required);
        req.setNotes("Required for verification");
        return req;
    }

    private UserDocument userDoc(DocumentType type, DocumentStatus status, LocalDate issueDate, LocalDate expiryDate) {
        UserDocument doc = new UserDocument();
        doc.setId(UUID.randomUUID());
        doc.setUser(testUser);
        doc.setDocumentType(type);
        doc.setFilename(type.getCode().toLowerCase() + ".pdf");
        doc.setStatus(status);
        doc.setIssueDate(issueDate);
        doc.setExpiryDate(expiryDate);
        doc.setVerificationStatus(DocumentVerificationStatus.VERIFIED);
        return doc;
    }

    @Test
    void calculateReadinessMatchesPromptExampleOf75PercentYellow() {
        // Scheme with 4 required documents
        Scheme scheme = new Scheme();
        scheme.setId(UUID.randomUUID());
        scheme.setName("Comprehensive Welfare Scheme");
        scheme.setDocumentRequirements(List.of(
                requirement(aadhaar, true),
                requirement(bankAccount, true),
                requirement(incomeCert, true),
                requirement(rationCard, true)
        ));

        // User has:
        // 1. Aadhaar (available and valid = complete)
        // 2. Bank Account (available and valid = complete)
        // 3. Income Certificate (available and valid = complete)
        // 4. Ration Card (missing)
        UserDocument docAadhaar = userDoc(aadhaar, DocumentStatus.ACTIVE, LocalDate.of(2020, 1, 1), null);
        UserDocument docBank = userDoc(bankAccount, DocumentStatus.ACTIVE, LocalDate.of(2021, 6, 1), null);
        UserDocument docIncome = userDoc(incomeCert, DocumentStatus.ACTIVE, LocalDate.now().minusMonths(2), LocalDate.now().plusMonths(10));

        when(schemeRepository.findById(scheme.getId())).thenReturn(Optional.of(scheme));
        when(userRepository.findByEmail("citizen@example.com")).thenReturn(Optional.of(testUser));
        when(userDocumentRepository.findByUserId(testUser.getId())).thenReturn(List.of(docAadhaar, docBank, docIncome));

        ApplicationReadinessResponse response = readinessService.calculateReadiness(scheme.getId(), "citizen@example.com");

        assertThat(response.schemeId()).isEqualTo(scheme.getId());
        assertThat(response.schemeName()).isEqualTo("Comprehensive Welfare Scheme");
        assertThat(response.readinessPercentage()).isEqualTo(75);
        assertThat(response.status()).isEqualTo(ReadinessTrafficLight.YELLOW);
        assertThat(response.totalRequiredDocuments()).isEqualTo(4);
        assertThat(response.completedDocuments()).isEqualTo(3);
        assertThat(response.missingDocuments()).isEqualTo(1);
        assertThat(response.invalidDocuments()).isEqualTo(0);
        assertThat(response.documentsNeedingReview()).isEqualTo(0);

        assertThat(response.completed()).hasSize(3);
        assertThat(response.missing()).hasSize(1);
        assertThat(response.missing().get(0).documentTypeCode()).isEqualTo("RATION_CARD");
        assertThat(response.invalid()).isEmpty();
        assertThat(response.needsReview()).isEmpty();
    }

    @Test
    void evaluatesExpiredDocumentAsInvalidAndIncompleteYieldingRedStatus() {
        // Scheme with 3 required documents
        Scheme scheme = new Scheme();
        scheme.setId(UUID.randomUUID());
        scheme.setName("Pension Scheme");
        scheme.setDocumentRequirements(List.of(
                requirement(aadhaar, true),
                requirement(incomeCert, true),
                requirement(rationCard, true)
        ));

        // User has:
        // 1. Valid Aadhaar -> complete
        // 2. Expired Income Certificate -> invalid (incomplete)
        // 3. No Ration Card -> missing (incomplete)
        UserDocument docAadhaar = userDoc(aadhaar, DocumentStatus.ACTIVE, null, null);
        UserDocument docExpiredIncome = userDoc(incomeCert, DocumentStatus.ACTIVE, LocalDate.of(2020, 1, 1), LocalDate.of(2021, 1, 1)); // Expired!

        when(schemeRepository.findById(scheme.getId())).thenReturn(Optional.of(scheme));
        when(userRepository.findByEmail("citizen@example.com")).thenReturn(Optional.of(testUser));
        when(userDocumentRepository.findByUserId(testUser.getId())).thenReturn(List.of(docAadhaar, docExpiredIncome));

        ApplicationReadinessResponse response = readinessService.calculateReadiness(scheme.getId(), "citizen@example.com");

        // 1 out of 3 = 33% -> RED (0-40)
        assertThat(response.readinessPercentage()).isEqualTo(33);
        assertThat(response.status()).isEqualTo(ReadinessTrafficLight.RED);
        assertThat(response.totalRequiredDocuments()).isEqualTo(3);
        assertThat(response.completedDocuments()).isEqualTo(1);
        assertThat(response.missingDocuments()).isEqualTo(1);
        assertThat(response.invalidDocuments()).isEqualTo(1);
        assertThat(response.documentsNeedingReview()).isEqualTo(0);

        assertThat(response.completed().get(0).documentTypeCode()).isEqualTo("AADHAAR");
        assertThat(response.invalid().get(0).documentTypeCode()).isEqualTo("INCOME_CERTIFICATE");
        assertThat(response.invalid().get(0).reason()).contains("Document expired on 2021-01-01");
        assertThat(response.missing().get(0).documentTypeCode()).isEqualTo("RATION_CARD");
    }

    @Test
    void evaluatesUnknownValidityDocumentAsNeedsReview() {
        Scheme scheme = new Scheme();
        scheme.setId(UUID.randomUUID());
        scheme.setName("Scholarship Scheme");
        scheme.setDocumentRequirements(List.of(
                requirement(incomeCert, true)
        ));

        // Income certificate has a validity rule of 12 months
        DocumentValidityRule rule = new DocumentValidityRule();
        rule.setValidityMonths(12);
        rule.setRuleType("VALIDITY_PERIOD");
        rule.setRuleDescription("Valid for 12 months from issuance");
        when(documentValidityRuleRepository.findByDocumentTypeId(incomeCert.getId())).thenReturn(List.of(rule));

        // User uploaded income certificate with NO dates recorded (issueDate == null, expiryDate == null)
        UserDocument docUnknown = userDoc(incomeCert, DocumentStatus.ACTIVE, null, null);
        docUnknown.setVerificationStatus(DocumentVerificationStatus.VERIFIED);

        when(schemeRepository.findById(scheme.getId())).thenReturn(Optional.of(scheme));
        when(userRepository.findByEmail("citizen@example.com")).thenReturn(Optional.of(testUser));
        when(userDocumentRepository.findByUserId(testUser.getId())).thenReturn(List.of(docUnknown));

        ApplicationReadinessResponse response = readinessService.calculateReadiness(scheme.getId(), "citizen@example.com");

        // 0 completed out of 1 -> 0%, RED
        assertThat(response.readinessPercentage()).isEqualTo(0);
        assertThat(response.status()).isEqualTo(ReadinessTrafficLight.RED);
        assertThat(response.totalRequiredDocuments()).isEqualTo(1);
        assertThat(response.completedDocuments()).isEqualTo(0);
        assertThat(response.documentsNeedingReview()).isEqualTo(1);
        assertThat(response.needsReview().get(0).documentTypeCode()).isEqualTo("INCOME_CERTIFICATE");
        assertThat(response.needsReview().get(0).reason()).contains("Document validity is unknown");
    }

    @Test
    void evaluatesPendingVerificationStatusAsNeedsReview() {
        Scheme scheme = new Scheme();
        scheme.setId(UUID.randomUUID());
        scheme.setName("Direct Benefit Transfer Scheme");
        scheme.setDocumentRequirements(List.of(
                requirement(aadhaar, true)
        ));

        UserDocument pendingAadhaar = userDoc(aadhaar, DocumentStatus.ACTIVE, null, null);
        pendingAadhaar.setVerificationStatus(DocumentVerificationStatus.PENDING);

        when(schemeRepository.findById(scheme.getId())).thenReturn(Optional.of(scheme));
        when(userRepository.findByEmail("citizen@example.com")).thenReturn(Optional.of(testUser));
        when(userDocumentRepository.findByUserId(testUser.getId())).thenReturn(List.of(pendingAadhaar));

        ApplicationReadinessResponse response = readinessService.calculateReadiness(scheme.getId(), "citizen@example.com");

        assertThat(response.readinessPercentage()).isEqualTo(0);
        assertThat(response.documentsNeedingReview()).isEqualTo(1);
        assertThat(response.needsReview().get(0).reason()).contains("verification is pending review");
    }

    @Test
    void evaluatesValidityRuleCalculatedExpirationAsInvalid() {
        Scheme scheme = new Scheme();
        scheme.setId(UUID.randomUUID());
        scheme.setName("Agriculture Assistance");
        scheme.setDocumentRequirements(List.of(
                requirement(incomeCert, true)
        ));

        DocumentValidityRule rule = new DocumentValidityRule();
        rule.setValidityMonths(6);
        when(documentValidityRuleRepository.findByDocumentTypeId(incomeCert.getId())).thenReturn(List.of(rule));

        // Issued 10 months ago -> expired by validity rule even without explicit expiryDate
        UserDocument doc = userDoc(incomeCert, DocumentStatus.ACTIVE, LocalDate.now().minusMonths(10), null);

        when(schemeRepository.findById(scheme.getId())).thenReturn(Optional.of(scheme));
        when(userRepository.findByEmail("citizen@example.com")).thenReturn(Optional.of(testUser));
        when(userDocumentRepository.findByUserId(testUser.getId())).thenReturn(List.of(doc));

        ApplicationReadinessResponse response = readinessService.calculateReadiness(scheme.getId(), "citizen@example.com");

        assertThat(response.readinessPercentage()).isEqualTo(0);
        assertThat(response.invalidDocuments()).isEqualTo(1);
        assertThat(response.invalid().get(0).reason()).contains("Document expired based on 6-month validity rule");
    }

    @Test
    void trafficLightLevelTransitionsAccurately() {
        assertThat(ReadinessTrafficLight.fromScore(0)).isEqualTo(ReadinessTrafficLight.RED);
        assertThat(ReadinessTrafficLight.fromScore(40)).isEqualTo(ReadinessTrafficLight.RED);
        assertThat(ReadinessTrafficLight.fromScore(41)).isEqualTo(ReadinessTrafficLight.YELLOW);
        assertThat(ReadinessTrafficLight.fromScore(75)).isEqualTo(ReadinessTrafficLight.YELLOW);
        assertThat(ReadinessTrafficLight.fromScore(80)).isEqualTo(ReadinessTrafficLight.YELLOW);
        assertThat(ReadinessTrafficLight.fromScore(81)).isEqualTo(ReadinessTrafficLight.GREEN);
        assertThat(ReadinessTrafficLight.fromScore(100)).isEqualTo(ReadinessTrafficLight.GREEN);
    }

    @Test
    void allCompletedDocumentsGives100PercentGreenStatus() {
        Scheme scheme = new Scheme();
        scheme.setId(UUID.randomUUID());
        scheme.setName("100% Ready Scheme");
        scheme.setDocumentRequirements(List.of(
                requirement(aadhaar, true),
                requirement(bankAccount, true)
        ));

        UserDocument docAadhaar = userDoc(aadhaar, DocumentStatus.ACTIVE, null, null);
        UserDocument docBank = userDoc(bankAccount, DocumentStatus.ACTIVE, null, null);

        when(schemeRepository.findById(scheme.getId())).thenReturn(Optional.of(scheme));
        when(userRepository.findByEmail("citizen@example.com")).thenReturn(Optional.of(testUser));
        when(userDocumentRepository.findByUserId(testUser.getId())).thenReturn(List.of(docAadhaar, docBank));

        ApplicationReadinessResponse response = readinessService.calculateReadiness(scheme.getId(), "citizen@example.com");

        assertThat(response.readinessPercentage()).isEqualTo(100);
        assertThat(response.status()).isEqualTo(ReadinessTrafficLight.GREEN);
        assertThat(response.completedDocuments()).isEqualTo(2);
        assertThat(response.missingDocuments()).isEqualTo(0);
        assertThat(response.invalidDocuments()).isEqualTo(0);
        assertThat(response.documentsNeedingReview()).isEqualTo(0);
    }

    @Test
    void throwsNotFoundWhenSchemeDoesNotExist() {
        UUID nonExistentId = UUID.randomUUID();
        when(schemeRepository.findById(nonExistentId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> readinessService.calculateReadiness(nonExistentId, "citizen@example.com"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Scheme not found");
    }

    @Test
    void throwsNotFoundWhenUserDoesNotExist() {
        UUID schemeId = UUID.randomUUID();
        Scheme scheme = new Scheme();
        scheme.setId(schemeId);

        when(schemeRepository.findById(schemeId)).thenReturn(Optional.of(scheme));
        when(userRepository.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> readinessService.calculateReadiness(schemeId, "unknown@example.com"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("User not found");
    }

    @Test
    void evaluatesDocumentStatusNeedsReviewAsNeedsReview() {
        Scheme scheme = new Scheme();
        scheme.setId(UUID.randomUUID());
        scheme.setName("Post-Matric Scholarship");
        scheme.setDocumentRequirements(List.of(
                requirement(incomeCert, true)
        ));

        UserDocument doc = userDoc(incomeCert, DocumentStatus.NEEDS_REVIEW, LocalDate.of(2024, 1, 1), LocalDate.of(2027, 1, 1));

        when(schemeRepository.findById(scheme.getId())).thenReturn(Optional.of(scheme));
        when(userRepository.findByEmail("citizen@example.com")).thenReturn(Optional.of(testUser));
        when(userDocumentRepository.findByUserId(testUser.getId())).thenReturn(List.of(doc));

        ApplicationReadinessResponse response = readinessService.calculateReadiness(scheme.getId(), "citizen@example.com");

        assertThat(response.readinessPercentage()).isEqualTo(0);
        assertThat(response.documentsNeedingReview()).isEqualTo(1);
        assertThat(response.needsReview().get(0).reason()).contains("requires citizen review");
    }
}
