package in.swatva.document.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import in.swatva.common.exception.ResourceNotFoundException;
import in.swatva.document.api.DocumentRegistrationRequest;
import in.swatva.document.api.SchemeDocumentEvaluation;
import in.swatva.document.api.UserDocumentDto;
import in.swatva.document.model.DocumentType;
import in.swatva.document.model.UserDocument;
import in.swatva.document.model.enums.DocumentStatus;
import in.swatva.document.repository.DocumentTypeRepository;
import in.swatva.document.repository.UserDocumentRepository;
import in.swatva.scheme.model.Scheme;
import in.swatva.scheme.model.SchemeDocumentRequirement;
import in.swatva.scheme.repository.SchemeRepository;
import in.swatva.user.model.User;
import in.swatva.user.repository.UserRepository;
import java.io.InputStream;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class DocumentLockerServiceTest {

    private UserDocumentRepository userDocumentRepository;
    private DocumentTypeRepository documentTypeRepository;
    private UserRepository userRepository;
    private SchemeRepository schemeRepository;
    private StorageService storageService;
    private DocumentLockerService lockerService;

    private User testUser;
    private DocumentType aadhaarType;
    private DocumentType incomeCertType;
    private DocumentType rationCardType;

    @BeforeEach
    void setUp() {
        userDocumentRepository = mock(UserDocumentRepository.class);
        documentTypeRepository = mock(DocumentTypeRepository.class);
        userRepository = mock(UserRepository.class);
        schemeRepository = mock(SchemeRepository.class);
        storageService = mock(StorageService.class);
        ObjectMapper objectMapper = new ObjectMapper();

        lockerService = new DocumentLockerService(
                userDocumentRepository,
                documentTypeRepository,
                userRepository,
                schemeRepository,
                storageService,
                objectMapper
        );

        testUser = new User();
        testUser.setId(UUID.randomUUID());
        testUser.setEmail("citizen@example.com");

        aadhaarType = new DocumentType();
        aadhaarType.setId(UUID.randomUUID());
        aadhaarType.setCode("AADHAAR");
        aadhaarType.setName("Aadhaar Card");

        incomeCertType = new DocumentType();
        incomeCertType.setId(UUID.randomUUID());
        incomeCertType.setCode("INCOME_CERTIFICATE");
        incomeCertType.setName("Income Certificate");

        rationCardType = new DocumentType();
        rationCardType.setId(UUID.randomUUID());
        rationCardType.setCode("RATION_CARD");
        rationCardType.setName("Ration Card");

        when(userRepository.findByEmail("citizen@example.com")).thenReturn(Optional.of(testUser));
        when(documentTypeRepository.findByCode("AADHAAR")).thenReturn(Optional.of(aadhaarType));
        when(documentTypeRepository.findByCode("INCOME_CERTIFICATE")).thenReturn(Optional.of(incomeCertType));
        when(documentTypeRepository.findByCode("RATION_CARD")).thenReturn(Optional.of(rationCardType));
    }

    @Test
    void uploadDocumentWithMultipartFileStoresToS3AndDatabase() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "my_aadhaar.pdf",
                "application/pdf",
                "test file content".getBytes()
        );

        when(userDocumentRepository.save(any(UserDocument.class))).thenAnswer(invocation -> {
            UserDocument doc = invocation.getArgument(0);
            doc.setId(UUID.randomUUID());
            return doc;
        });

        UserDocumentDto result = lockerService.uploadDocument(
                "citizen@example.com",
                "AADHAAR",
                file,
                "my_aadhaar.pdf",
                LocalDate.of(2022, 1, 1),
                null,
                "UIDAI",
                "{\"verified\":true}",
                DocumentStatus.ACTIVE
        );

        assertThat(result).isNotNull();
        assertThat(result.documentType()).isEqualTo("AADHAAR");
        assertThat(result.filename()).isEqualTo("my_aadhaar.pdf");
        assertThat(result.issuingAuthority()).isEqualTo("UIDAI");
        assertThat(result.status()).isEqualTo(DocumentStatus.ACTIVE);
        assertThat(result.storageKey()).startsWith("documents/" + testUser.getId() + "/");

        verify(storageService).upload(anyString(), any(InputStream.class), anyLong(), eq("application/pdf"));
        verify(userDocumentRepository).save(any(UserDocument.class));
    }

    @Test
    void registerDocumentWithJsonMetadataPersistsCorrectly() {
        when(userDocumentRepository.save(any(UserDocument.class))).thenAnswer(invocation -> {
            UserDocument doc = invocation.getArgument(0);
            doc.setId(UUID.randomUUID());
            return doc;
        });

        DocumentRegistrationRequest request = new DocumentRegistrationRequest(
                "INCOME_CERTIFICATE",
                "income_cert_2024.pdf",
                "documents/pre-uploaded-key.pdf",
                LocalDate.of(2024, 4, 1),
                LocalDate.of(2025, 3, 31),
                "Revenue Department",
                Map.of("annualIncome", 120000),
                DocumentStatus.ACTIVE
        );

        UserDocumentDto result = lockerService.registerDocument("citizen@example.com", request);

        assertThat(result.documentType()).isEqualTo("INCOME_CERTIFICATE");
        assertThat(result.filename()).isEqualTo("income_cert_2024.pdf");
        assertThat(result.storageKey()).isEqualTo("documents/pre-uploaded-key.pdf");
        assertThat(result.issueDate()).isEqualTo(LocalDate.of(2024, 4, 1));
        assertThat(result.expiryDate()).isEqualTo(LocalDate.of(2025, 3, 31));
        assertThat(result.issuingAuthority()).isEqualTo("Revenue Department");
        assertThat(result.extractedMetadata()).containsEntry("annualIncome", 120000);
        assertThat(result.status()).isEqualTo(DocumentStatus.ACTIVE);
    }

    @Test
    void listDocumentsReturnsUserDocumentsOrderedByDate() {
        UserDocument doc1 = new UserDocument();
        doc1.setId(UUID.randomUUID());
        doc1.setUser(testUser);
        doc1.setDocumentType(aadhaarType);
        doc1.setFilename("aadhaar.pdf");
        doc1.setUploadDate(Instant.parse("2024-01-01T10:00:00Z"));
        doc1.setStatus(DocumentStatus.ACTIVE);

        UserDocument doc2 = new UserDocument();
        doc2.setId(UUID.randomUUID());
        doc2.setUser(testUser);
        doc2.setDocumentType(incomeCertType);
        doc2.setFilename("income.pdf");
        doc2.setUploadDate(Instant.parse("2024-06-01T10:00:00Z"));
        doc2.setStatus(DocumentStatus.ACTIVE);

        when(userDocumentRepository.findByUserId(testUser.getId())).thenReturn(List.of(doc1, doc2));

        List<UserDocumentDto> list = lockerService.getUserDocuments("citizen@example.com");

        assertThat(list).hasSize(2);
        assertThat(list.get(0).filename()).isEqualTo("income.pdf"); // More recent first
        assertThat(list.get(1).filename()).isEqualTo("aadhaar.pdf");
    }

    @Test
    void getDocumentByIdReturnsDocumentWhenFound() {
        UUID docId = UUID.randomUUID();
        UserDocument doc = new UserDocument();
        doc.setId(docId);
        doc.setUser(testUser);
        doc.setDocumentType(aadhaarType);
        doc.setFilename("aadhaar.pdf");
        doc.setStatus(DocumentStatus.ACTIVE);

        when(userDocumentRepository.findByIdAndUserId(docId, testUser.getId())).thenReturn(Optional.of(doc));

        UserDocumentDto dto = lockerService.getDocumentById("citizen@example.com", docId);
        assertThat(dto.id()).isEqualTo(docId);
        assertThat(dto.filename()).isEqualTo("aadhaar.pdf");
    }

    @Test
    void getDocumentByIdThrowsNotFoundForMissingOrOtherUser() {
        UUID docId = UUID.randomUUID();
        when(userDocumentRepository.findByIdAndUserId(docId, testUser.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> lockerService.getDocumentById("citizen@example.com", docId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Document not found");
    }

    @Test
    void deleteDocumentRemovesFromStorageAndRepository() {
        UUID docId = UUID.randomUUID();
        UserDocument doc = new UserDocument();
        doc.setId(docId);
        doc.setUser(testUser);
        doc.setDocumentType(aadhaarType);
        doc.setStorageKey("documents/user/test-key.pdf");

        when(userDocumentRepository.findByIdAndUserId(docId, testUser.getId())).thenReturn(Optional.of(doc));

        lockerService.deleteDocument("citizen@example.com", docId);

        verify(storageService).delete("documents/user/test-key.pdf");
        verify(userDocumentRepository).delete(doc);
    }

    @Test
    void evaluatesSchemeDocumentsIdentifyingAvailableMissingAndPotentiallyExpired() {
        // Scheme requiring 3 documents:
        // 1. AADHAAR (User has valid active)
        // 2. INCOME_CERTIFICATE (User has expired document)
        // 3. RATION_CARD (User has no document)
        Scheme scheme = new Scheme();
        scheme.setId(UUID.randomUUID());
        scheme.setName("Karnataka Farmer Benefit Scheme");

        SchemeDocumentRequirement reqAadhaar = new SchemeDocumentRequirement();
        reqAadhaar.setDocumentType(aadhaarType);
        reqAadhaar.setRequired(true);

        SchemeDocumentRequirement reqIncome = new SchemeDocumentRequirement();
        reqIncome.setDocumentType(incomeCertType);
        reqIncome.setRequired(true);

        SchemeDocumentRequirement reqRation = new SchemeDocumentRequirement();
        reqRation.setDocumentType(rationCardType);
        reqRation.setRequired(true);
        reqRation.setNotes("BPL or Antyodaya ration card required");

        scheme.setDocumentRequirements(List.of(reqAadhaar, reqIncome, reqRation));

        // User's locker:
        // 1. Valid Aadhaar
        UserDocument userAadhaar = new UserDocument();
        userAadhaar.setId(UUID.randomUUID());
        userAadhaar.setUser(testUser);
        userAadhaar.setDocumentType(aadhaarType);
        userAadhaar.setFilename("aadhaar_card.pdf");
        userAadhaar.setStatus(DocumentStatus.ACTIVE);
        userAadhaar.setExpiryDate(null); // Aadhaar doesn't expire

        // 2. Expired Income Certificate (expired in the past)
        UserDocument userIncome = new UserDocument();
        userIncome.setId(UUID.randomUUID());
        userIncome.setUser(testUser);
        userIncome.setDocumentType(incomeCertType);
        userIncome.setFilename("income_cert_2021.pdf");
        userIncome.setStatus(DocumentStatus.ACTIVE); // status column says ACTIVE, but expiryDate is past!
        userIncome.setExpiryDate(LocalDate.of(2022, 1, 1)); // EXPIRED! File presence alone is not validity.

        when(userDocumentRepository.findByUserId(testUser.getId())).thenReturn(List.of(userAadhaar, userIncome));
        when(schemeRepository.findById(scheme.getId())).thenReturn(Optional.of(scheme));

        SchemeDocumentEvaluation evaluation = lockerService.evaluateSchemeDocuments(scheme.getId(), "citizen@example.com");

        assertThat(evaluation.schemeId()).isEqualTo(scheme.getId());
        assertThat(evaluation.schemeName()).isEqualTo("Karnataka Farmer Benefit Scheme");

        // Available documents: Only Aadhaar
        assertThat(evaluation.availableDocuments()).hasSize(1);
        assertThat(evaluation.availableDocuments().get(0).documentTypeCode()).isEqualTo("AADHAAR");
        assertThat(evaluation.availableDocuments().get(0).filename()).isEqualTo("aadhaar_card.pdf");

        // Potentially expired documents: Income Certificate detected as expired
        assertThat(evaluation.potentiallyExpiredDocuments()).hasSize(1);
        assertThat(evaluation.potentiallyExpiredDocuments().get(0).documentTypeCode()).isEqualTo("INCOME_CERTIFICATE");
        assertThat(evaluation.potentiallyExpiredDocuments().get(0).filename()).isEqualTo("income_cert_2021.pdf");
        assertThat(evaluation.potentiallyExpiredDocuments().get(0).statusReason()).contains("file presence alone is not valid proof");

        // Missing documents: Income Certificate (due to expiration) and Ration Card (not uploaded)
        assertThat(evaluation.missingDocuments()).hasSize(2);
        List<String> missingCodes = evaluation.missingDocuments().stream()
                .map(SchemeDocumentEvaluation.DocumentItem::documentTypeCode)
                .toList();
        assertThat(missingCodes).containsExactlyInAnyOrder("INCOME_CERTIFICATE", "RATION_CARD");

        // Overall readiness: Not fully ready because required documents are missing or expired
        assertThat(evaluation.fullyReady()).isFalse();
    }

    @Test
    void evaluatesSchemeAsFullyReadyWhenAllRequiredDocumentsAreValid() {
        Scheme scheme = new Scheme();
        scheme.setId(UUID.randomUUID());
        scheme.setName("PM-KISAN");

        SchemeDocumentRequirement reqAadhaar = new SchemeDocumentRequirement();
        reqAadhaar.setDocumentType(aadhaarType);
        reqAadhaar.setRequired(true);
        scheme.setDocumentRequirements(List.of(reqAadhaar));

        UserDocument validAadhaar = new UserDocument();
        validAadhaar.setId(UUID.randomUUID());
        validAadhaar.setUser(testUser);
        validAadhaar.setDocumentType(aadhaarType);
        validAadhaar.setFilename("valid_aadhaar.pdf");
        validAadhaar.setStatus(DocumentStatus.ACTIVE);
        validAadhaar.setExpiryDate(LocalDate.now().plusYears(10));

        when(userDocumentRepository.findByUserId(testUser.getId())).thenReturn(List.of(validAadhaar));
        when(schemeRepository.findById(scheme.getId())).thenReturn(Optional.of(scheme));

        SchemeDocumentEvaluation evaluation = lockerService.evaluateSchemeDocuments(scheme.getId(), "citizen@example.com");

        assertThat(evaluation.availableDocuments()).hasSize(1);
        assertThat(evaluation.missingDocuments()).isEmpty();
        assertThat(evaluation.potentiallyExpiredDocuments()).isEmpty();
        assertThat(evaluation.fullyReady()).isTrue();
    }

    @Test
    void documentLockerIsReusableAcrossDifferentSchemes() {
        // User uploads Aadhaar once into Document Locker
        UserDocument validAadhaar = new UserDocument();
        validAadhaar.setId(UUID.randomUUID());
        validAadhaar.setUser(testUser);
        validAadhaar.setDocumentType(aadhaarType);
        validAadhaar.setFilename("valid_aadhaar.pdf");
        validAadhaar.setStatus(DocumentStatus.ACTIVE);

        when(userDocumentRepository.findByUserId(testUser.getId())).thenReturn(List.of(validAadhaar));

        // Scheme 1: PM-KISAN (Central) requires AADHAAR
        Scheme centralScheme = new Scheme();
        centralScheme.setId(UUID.randomUUID());
        centralScheme.setName("PM-KISAN");
        SchemeDocumentRequirement req1 = new SchemeDocumentRequirement();
        req1.setDocumentType(aadhaarType);
        req1.setRequired(true);
        centralScheme.setDocumentRequirements(List.of(req1));

        // Scheme 2: Gruha Jyothi (State) requires AADHAAR
        Scheme stateScheme = new Scheme();
        stateScheme.setId(UUID.randomUUID());
        stateScheme.setName("Gruha Jyothi");
        SchemeDocumentRequirement req2 = new SchemeDocumentRequirement();
        req2.setDocumentType(aadhaarType);
        req2.setRequired(true);
        stateScheme.setDocumentRequirements(List.of(req2));

        SchemeDocumentEvaluation eval1 = lockerService.evaluateSchemeDocuments(centralScheme, testUser.getId());
        SchemeDocumentEvaluation eval2 = lockerService.evaluateSchemeDocuments(stateScheme, testUser.getId());

        assertThat(eval1.availableDocuments()).hasSize(1);
        assertThat(eval1.availableDocuments().get(0).filename()).isEqualTo("valid_aadhaar.pdf");
        assertThat(eval1.fullyReady()).isTrue();

        assertThat(eval2.availableDocuments()).hasSize(1);
        assertThat(eval2.availableDocuments().get(0).filename()).isEqualTo("valid_aadhaar.pdf");
        assertThat(eval2.fullyReady()).isTrue();
    }
}
