package in.swatva.document.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import in.swatva.document.api.DocumentCorrectionRequest;
import in.swatva.document.api.DocumentValidationResponse;
import in.swatva.document.api.ExtractedDocumentMetadata;
import in.swatva.document.api.ExtractedField;
import in.swatva.document.api.UserDocumentDto;
import in.swatva.document.model.DocumentType;
import in.swatva.document.model.UserDocument;
import in.swatva.document.model.enums.DocumentStatus;
import in.swatva.document.model.enums.DocumentValidityStatus;
import in.swatva.document.repository.DocumentTypeRepository;
import in.swatva.document.repository.UserDocumentRepository;
import in.swatva.document.service.ai.DocumentAiExtractionService;
import in.swatva.document.service.ocr.OcrService;
import in.swatva.scheme.repository.SchemeRepository;
import in.swatva.user.model.User;
import in.swatva.user.repository.UserRepository;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class DocumentLockerExtractionPipelineTest {

    private UserDocumentRepository userDocumentRepository;
    private DocumentTypeRepository documentTypeRepository;
    private UserRepository userRepository;
    private SchemeRepository schemeRepository;
    private StorageService storageService;
    private ObjectMapper objectMapper;
    private OcrService ocrService;
    private DocumentAiExtractionService aiExtractionService;
    private DocumentValidityService validityService;
    private DocumentLockerService lockerService;

    private User testUser;
    private DocumentType incomeDocType;

    @BeforeEach
    void setUp() {
        userDocumentRepository = mock(UserDocumentRepository.class);
        documentTypeRepository = mock(DocumentTypeRepository.class);
        userRepository = mock(UserRepository.class);
        schemeRepository = mock(SchemeRepository.class);
        storageService = mock(StorageService.class);
        objectMapper = new ObjectMapper().findAndRegisterModules();
        ocrService = mock(OcrService.class);
        aiExtractionService = mock(DocumentAiExtractionService.class);
        validityService = mock(DocumentValidityService.class);

        lockerService = new DocumentLockerService(
                userDocumentRepository,
                documentTypeRepository,
                userRepository,
                schemeRepository,
                storageService,
                objectMapper,
                ocrService,
                aiExtractionService,
                validityService
        );

        testUser = new User();
        testUser.setId(UUID.randomUUID());
        testUser.setEmail("citizen@example.com");

        incomeDocType = new DocumentType();
        incomeDocType.setId(UUID.randomUUID());
        incomeDocType.setCode("INCOME_CERTIFICATE");
        incomeDocType.setName("Income Certificate");

        when(userRepository.findByEmail("citizen@example.com")).thenReturn(Optional.of(testUser));
        when(documentTypeRepository.findByCode("INCOME_CERTIFICATE")).thenReturn(Optional.of(incomeDocType));
    }

    @Test
    void uploadDocumentTriggersOcrAiExtractionAndValidityChecking() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "income_cert.pdf",
                "application/pdf",
                "sample pdf bytes".getBytes(StandardCharsets.UTF_8)
        );

        when(ocrService.extractText(any(), anyString(), anyString())).thenReturn("Extracted Income Text");

        ExtractedDocumentMetadata aiResult = new ExtractedDocumentMetadata(
                ExtractedField.of("INCOME_CERTIFICATE", 0.95, "AUTO_EXTRACTED"),
                ExtractedField.of("Ramesh Kumar", 0.90, "AUTO_EXTRACTED"),
                ExtractedField.of(LocalDate.of(2024, 6, 1), 0.95, "AUTO_EXTRACTED"),
                ExtractedField.of(LocalDate.of(2027, 6, 1), 0.90, "AUTO_EXTRACTED"),
                ExtractedField.of("Tahsildar", 0.90, "AUTO_EXTRACTED"),
                ExtractedField.of("RD00998877", 0.95, "AUTO_EXTRACTED"),
                ExtractedField.of(60000.0, 0.90, "AUTO_EXTRACTED"),
                ExtractedField.of("OBC", 0.90, "AUTO_EXTRACTED"),
                ExtractedField.of("Karnataka", 0.95, "AUTO_EXTRACTED"),
                ExtractedField.notFound(),
                0.93,
                "SUCCESS",
                false,
                ExtractedDocumentMetadata.DISCLAIMER_TEXT,
                Map.of()
        );
        when(aiExtractionService.extractStructuredData(eq("Extracted Income Text"), eq("INCOME_CERTIFICATE")))
                .thenReturn(aiResult);

        when(validityService.validate(any(UserDocument.class), any(), any()))
                .thenReturn(new DocumentValidationResponse(
                        UUID.randomUUID(),
                        "INCOME_CERTIFICATE",
                        "Income Certificate",
                        DocumentValidityStatus.VALID,
                        LocalDate.of(2024, 6, 1),
                        LocalDate.of(2027, 6, 1),
                        "Valid Karnataka Certificate",
                        "Document is valid",
                        1000L
                ));

        when(userDocumentRepository.save(any(UserDocument.class))).thenAnswer(i -> {
            UserDocument d = i.getArgument(0);
            d.setId(UUID.randomUUID());
            return d;
        });

        UserDocumentDto result = lockerService.uploadDocument(
                "citizen@example.com",
                "INCOME_CERTIFICATE",
                file,
                "income_cert.pdf",
                null, // issueDate not passed -> AI extracted used
                null, // expiryDate not passed -> AI extracted used
                null, // issuingAuthority not passed -> AI extracted used
                null,
                null
        );

        assertThat(result).isNotNull();
        assertThat(result.issueDate()).isEqualTo(LocalDate.of(2024, 6, 1));
        assertThat(result.expiryDate()).isEqualTo(LocalDate.of(2027, 6, 1));
        assertThat(result.issuingAuthority()).isEqualTo("Tahsildar");
        assertThat(result.status()).isEqualTo(DocumentStatus.ACTIVE);
        assertThat(result.extractedMetadata()).containsEntry("officialVerificationClaimed", false);

        verify(ocrService).extractText(any(), eq("application/pdf"), eq("income_cert.pdf"));
        verify(aiExtractionService).extractStructuredData("Extracted Income Text", "INCOME_CERTIFICATE");
        verify(validityService).validate(any(UserDocument.class), any(), eq("Karnataka"));
    }

    @Test
    void manualInputOverridesAiExtractedValues() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "income_cert.pdf",
                "application/pdf",
                "sample pdf bytes".getBytes(StandardCharsets.UTF_8)
        );

        when(ocrService.extractText(any(), anyString(), anyString())).thenReturn("Extracted Income Text");

        ExtractedDocumentMetadata aiResult = new ExtractedDocumentMetadata(
                ExtractedField.of("INCOME_CERTIFICATE", 0.95, "AUTO_EXTRACTED"),
                ExtractedField.of("AI Name", 0.90, "AUTO_EXTRACTED"),
                ExtractedField.of(LocalDate.of(2020, 1, 1), 0.95, "AUTO_EXTRACTED"),
                ExtractedField.of(LocalDate.of(2021, 1, 1), 0.90, "AUTO_EXTRACTED"),
                ExtractedField.of("AI Authority", 0.90, "AUTO_EXTRACTED"),
                ExtractedField.notFound(),
                ExtractedField.notFound(),
                ExtractedField.notFound(),
                ExtractedField.notFound(),
                ExtractedField.notFound(),
                0.90,
                "SUCCESS",
                false,
                ExtractedDocumentMetadata.DISCLAIMER_TEXT,
                Map.of()
        );
        when(aiExtractionService.extractStructuredData(anyString(), anyString())).thenReturn(aiResult);

        when(validityService.validate(any(UserDocument.class), any(), any()))
                .thenReturn(new DocumentValidationResponse(
                        UUID.randomUUID(),
                        "INCOME_CERTIFICATE",
                        "Income Certificate",
                        DocumentValidityStatus.VALID,
                        LocalDate.of(2025, 1, 1),
                        LocalDate.of(2028, 1, 1),
                        "Rule",
                        "Valid",
                        900L
                ));

        when(userDocumentRepository.save(any(UserDocument.class))).thenAnswer(i -> {
            UserDocument d = i.getArgument(0);
            d.setId(UUID.randomUUID());
            return d;
        });

        LocalDate manualIssue = LocalDate.of(2025, 1, 1);
        LocalDate manualExpiry = LocalDate.of(2028, 1, 1);
        String manualAuthority = "Manual Tahsildar North";

        UserDocumentDto result = lockerService.uploadDocument(
                "citizen@example.com",
                "INCOME_CERTIFICATE",
                file,
                "income_cert.pdf",
                manualIssue,
                manualExpiry,
                manualAuthority,
                null,
                null
        );

        // Manual dates & authority must override AI
        assertThat(result.issueDate()).isEqualTo(manualIssue);
        assertThat(result.expiryDate()).isEqualTo(manualExpiry);
        assertThat(result.issuingAuthority()).isEqualTo(manualAuthority);
        assertThat(result.status()).isEqualTo(DocumentStatus.ACTIVE);
    }

    @Test
    void extractionFailureDoesNotBreakUploadFlowAndMarksNeedsReview() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "blurry_image.png",
                "image/png",
                new byte[]{1, 2, 3}
        );

        when(ocrService.extractText(any(), anyString(), anyString())).thenThrow(new RuntimeException("OCR unreadable image"));

        when(userDocumentRepository.save(any(UserDocument.class))).thenAnswer(i -> {
            UserDocument d = i.getArgument(0);
            d.setId(UUID.randomUUID());
            return d;
        });

        UserDocumentDto result = lockerService.uploadDocument(
                "citizen@example.com",
                "INCOME_CERTIFICATE",
                file,
                "blurry_image.png",
                null,
                null,
                null,
                null,
                null
        );

        assertThat(result).isNotNull();
        assertThat(result.status()).isEqualTo(DocumentStatus.NEEDS_REVIEW);
        assertThat(result.extractedMetadata()).containsEntry("extractionStatus", "NEEDS_REVIEW");
        assertThat(result.extractedMetadata()).containsEntry("officialVerificationClaimed", false);
    }

    @Test
    void correctDocumentAllowsManualCorrectionAndReEvaluatesValidity() {
        UUID docId = UUID.randomUUID();
        UserDocument existingDoc = new UserDocument();
        existingDoc.setId(docId);
        existingDoc.setUser(testUser);
        existingDoc.setDocumentType(incomeDocType);
        existingDoc.setStatus(DocumentStatus.NEEDS_REVIEW);
        existingDoc.setFilename("cert.pdf");

        when(userDocumentRepository.findByIdAndUserId(docId, testUser.getId())).thenReturn(Optional.of(existingDoc));
        when(userDocumentRepository.save(any(UserDocument.class))).thenAnswer(i -> i.getArgument(0));

        when(validityService.validate(any(UserDocument.class), any(), any()))
                .thenReturn(new DocumentValidationResponse(
                        docId,
                        "INCOME_CERTIFICATE",
                        "Income Certificate",
                        DocumentValidityStatus.VALID,
                        LocalDate.of(2025, 2, 1),
                        LocalDate.of(2028, 2, 1),
                        "Rule description",
                        "Document is valid",
                        800L
                ));

        LocalDate correctedIssue = LocalDate.of(2025, 2, 1);
        LocalDate correctedExpiry = LocalDate.of(2028, 2, 1);

        DocumentCorrectionRequest correction = new DocumentCorrectionRequest(
                "INCOME_CERTIFICATE",
                correctedIssue,
                correctedExpiry,
                "Corrected Tahsildar",
                "RD00991122",
                null,
                Map.of("userNote", "Corrected manual date")
        );

        UserDocumentDto corrected = lockerService.correctDocument("citizen@example.com", docId, correction);

        assertThat(corrected.issueDate()).isEqualTo(correctedIssue);
        assertThat(corrected.expiryDate()).isEqualTo(correctedExpiry);
        assertThat(corrected.issuingAuthority()).isEqualTo("Corrected Tahsildar");
        assertThat(corrected.status()).isEqualTo(DocumentStatus.ACTIVE);
        assertThat(corrected.extractedMetadata()).containsEntry("manualCorrectionApplied", true);
        assertThat(corrected.extractedMetadata()).containsEntry("officialVerificationClaimed", false);
    }

    @Test
    void reExtractDocumentDownloadsFileFromStorageAndReRunsPipeline() {
        UUID docId = UUID.randomUUID();
        UserDocument existingDoc = new UserDocument();
        existingDoc.setId(docId);
        existingDoc.setUser(testUser);
        existingDoc.setDocumentType(incomeDocType);
        existingDoc.setStorageKey("documents/" + testUser.getId() + "/cert.pdf");
        existingDoc.setFilename("cert.pdf");
        existingDoc.setContentType("application/pdf");
        existingDoc.setStatus(DocumentStatus.NEEDS_REVIEW);

        when(userDocumentRepository.findByIdAndUserId(docId, testUser.getId())).thenReturn(Optional.of(existingDoc));
        when(storageService.download("documents/" + testUser.getId() + "/cert.pdf")).thenReturn("pdf text content".getBytes(StandardCharsets.UTF_8));
        when(ocrService.extractText(any(), eq("application/pdf"), eq("cert.pdf"))).thenReturn("Re-extracted text");

        ExtractedDocumentMetadata aiResult = new ExtractedDocumentMetadata(
                ExtractedField.of("INCOME_CERTIFICATE", 0.95, "AUTO_EXTRACTED"),
                ExtractedField.of("Re-extracted Holder", 0.90, "AUTO_EXTRACTED"),
                ExtractedField.of(LocalDate.of(2024, 7, 1), 0.95, "AUTO_EXTRACTED"),
                ExtractedField.of(LocalDate.of(2027, 7, 1), 0.90, "AUTO_EXTRACTED"),
                ExtractedField.of("Tahsildar", 0.90, "AUTO_EXTRACTED"),
                ExtractedField.of("RD999999", 0.95, "AUTO_EXTRACTED"),
                ExtractedField.notFound(),
                ExtractedField.notFound(),
                ExtractedField.of("Karnataka", 0.90, "AUTO_EXTRACTED"),
                ExtractedField.notFound(),
                0.92,
                "SUCCESS",
                false,
                ExtractedDocumentMetadata.DISCLAIMER_TEXT,
                Map.of()
        );
        when(aiExtractionService.extractStructuredData("Re-extracted text", "INCOME_CERTIFICATE")).thenReturn(aiResult);

        when(validityService.validate(any(UserDocument.class), any(), eq("Karnataka")))
                .thenReturn(new DocumentValidationResponse(
                        docId,
                        "INCOME_CERTIFICATE",
                        "Income Certificate",
                        DocumentValidityStatus.VALID,
                        LocalDate.of(2024, 7, 1),
                        LocalDate.of(2027, 7, 1),
                        "Rule",
                        "Valid",
                        850L
                ));
        when(userDocumentRepository.save(any(UserDocument.class))).thenAnswer(i -> i.getArgument(0));

        UserDocumentDto reExtracted = lockerService.reExtractDocument("citizen@example.com", docId);

        assertThat(reExtracted).isNotNull();
        assertThat(reExtracted.issueDate()).isEqualTo(LocalDate.of(2024, 7, 1));
        assertThat(reExtracted.expiryDate()).isEqualTo(LocalDate.of(2027, 7, 1));
        assertThat(reExtracted.status()).isEqualTo(DocumentStatus.ACTIVE);
    }
}
