package in.sahayak.document.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import in.sahayak.common.exception.GlobalExceptionHandler;
import in.sahayak.common.exception.ResourceNotFoundException;
import in.sahayak.document.api.SchemeDocumentEvaluation.DocumentItem;
import in.sahayak.document.model.enums.DocumentStatus;
import in.sahayak.document.service.DocumentLockerService;
import java.security.Principal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class DocumentControllerTest {

    private DocumentLockerService lockerService;
    private in.sahayak.document.service.DocumentValidityService validityService;
    private MockMvc mockMvc;
    private ObjectMapper objectMapper;
    private Principal principal;

    @BeforeEach
    void setUp() {
        lockerService = mock(DocumentLockerService.class);
        validityService = mock(in.sahayak.document.service.DocumentValidityService.class);
        DocumentController controller = new DocumentController(lockerService, validityService);
        objectMapper = new ObjectMapper()
                .findAndRegisterModules()
                .disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        org.springframework.http.converter.json.MappingJackson2HttpMessageConverter converter =
                new org.springframework.http.converter.json.MappingJackson2HttpMessageConverter(objectMapper);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setMessageConverters(converter)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        principal = new UsernamePasswordAuthenticationToken("user@example.com", null);
    }

    @Test
    void postDocumentsMultipartUploadsFileAndReturns201() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "aadhaar.pdf",
                "application/pdf",
                "content".getBytes()
        );

        UUID docId = UUID.randomUUID();
        UserDocumentDto dto = new UserDocumentDto(
                docId,
                "AADHAAR",
                "Aadhaar Card",
                "aadhaar.pdf",
                "documents/user123/doc.pdf",
                Instant.now(),
                LocalDate.of(2021, 5, 10),
                null,
                "UIDAI",
                Map.of("verified", true),
                DocumentStatus.ACTIVE
        );

        when(lockerService.uploadDocument(
                eq("user@example.com"),
                eq("AADHAAR"),
                any(),
                eq("aadhaar.pdf"),
                eq(LocalDate.of(2021, 5, 10)),
                eq(null),
                eq("UIDAI"),
                eq("{\"verified\":true}"),
                eq(DocumentStatus.ACTIVE)
        )).thenReturn(dto);

        mockMvc.perform(multipart("/api/documents")
                        .file(file)
                        .param("documentType", "AADHAAR")
                        .param("filename", "aadhaar.pdf")
                        .param("issueDate", "2021-05-10")
                        .param("issuingAuthority", "UIDAI")
                        .param("extractedMetadata", "{\"verified\":true}")
                        .param("status", "ACTIVE")
                        .principal(principal))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(docId.toString()))
                .andExpect(jsonPath("$.data.documentType").value("AADHAAR"))
                .andExpect(jsonPath("$.data.filename").value("aadhaar.pdf"))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    @Test
    void postDocumentsJsonRegistersDocumentAndReturns201() throws Exception {
        UUID docId = UUID.randomUUID();
        DocumentRegistrationRequest request = new DocumentRegistrationRequest(
                "INCOME_CERTIFICATE",
                "income.pdf",
                "documents/user123/income.pdf",
                LocalDate.of(2024, 1, 1),
                LocalDate.of(2025, 1, 1),
                "Tahsildar",
                Map.of("income", 80000),
                DocumentStatus.ACTIVE
        );

        UserDocumentDto dto = new UserDocumentDto(
                docId,
                "INCOME_CERTIFICATE",
                "Income Certificate",
                "income.pdf",
                "documents/user123/income.pdf",
                Instant.now(),
                LocalDate.of(2024, 1, 1),
                LocalDate.of(2025, 1, 1),
                "Tahsildar",
                Map.of("income", 80000),
                DocumentStatus.ACTIVE
        );

        when(lockerService.registerDocument(eq("user@example.com"), any(DocumentRegistrationRequest.class)))
                .thenReturn(dto);

        mockMvc.perform(post("/api/documents")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .principal(principal))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(docId.toString()))
                .andExpect(jsonPath("$.data.documentType").value("INCOME_CERTIFICATE"))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    @Test
    void getDocumentsReturnsUserDocumentList() throws Exception {
        UUID docId = UUID.randomUUID();
        UserDocumentDto dto = new UserDocumentDto(
                docId,
                "AADHAAR",
                "Aadhaar Card",
                "aadhaar.pdf",
                "documents/user123/doc.pdf",
                Instant.now(),
                LocalDate.of(2020, 1, 1),
                null,
                "UIDAI",
                Map.of(),
                DocumentStatus.ACTIVE
        );

        when(lockerService.getUserDocuments("user@example.com")).thenReturn(List.of(dto));

        mockMvc.perform(get("/api/documents").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value(docId.toString()))
                .andExpect(jsonPath("$.data[0].documentType").value("AADHAAR"))
                .andExpect(jsonPath("$.data[0].filename").value("aadhaar.pdf"));
    }

    @Test
    void getDocumentByIdReturnsSingleDocument() throws Exception {
        UUID docId = UUID.randomUUID();
        UserDocumentDto dto = new UserDocumentDto(
                docId,
                "AADHAAR",
                "Aadhaar Card",
                "aadhaar.pdf",
                "documents/user123/doc.pdf",
                Instant.now(),
                LocalDate.of(2020, 1, 1),
                null,
                "UIDAI",
                Map.of(),
                DocumentStatus.ACTIVE
        );

        when(lockerService.getDocumentById("user@example.com", docId)).thenReturn(dto);

        mockMvc.perform(get("/api/documents/" + docId).principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(docId.toString()))
                .andExpect(jsonPath("$.data.filename").value("aadhaar.pdf"));
    }

    @Test
    void getDocumentByIdReturns404WhenNotFound() throws Exception {
        UUID missingId = UUID.randomUUID();
        when(lockerService.getDocumentById("user@example.com", missingId))
                .thenThrow(new ResourceNotFoundException("Document not found"));

        mockMvc.perform(get("/api/documents/" + missingId).principal(principal))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("RESOURCE_NOT_FOUND"))
                .andExpect(jsonPath("$.error.message").value("Document not found"));
    }

    @Test
    void deleteDocumentRemovesDocumentAndReturns200() throws Exception {
        UUID docId = UUID.randomUUID();
        doNothing().when(lockerService).deleteDocument("user@example.com", docId);

        mockMvc.perform(delete("/api/documents/" + docId).principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.message").value("Document deleted successfully"))
                .andExpect(jsonPath("$.data.id").value(docId.toString()));
    }

    @Test
    void evaluateSchemeDocumentsReturnsReadinessAssessment() throws Exception {
        UUID schemeId = UUID.randomUUID();
        SchemeDocumentEvaluation eval = new SchemeDocumentEvaluation(
                schemeId,
                "PM-KISAN",
                List.of(DocumentItem.available("AADHAAR", "Aadhaar Card", true, UUID.randomUUID(), "aadhaar.pdf", null)),
                List.of(DocumentItem.missing("RATION_CARD", "Ration Card", true, "Ration card required")),
                List.of(DocumentItem.potentiallyExpired("INCOME_CERTIFICATE", "Income Certificate", true, UUID.randomUUID(), "income.pdf", LocalDate.of(2022, 1, 1), "Document expired")),
                false
        );

        when(lockerService.evaluateSchemeDocuments(schemeId, "user@example.com")).thenReturn(eval);

        mockMvc.perform(get("/api/documents/scheme/" + schemeId + "/evaluation").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.schemeId").value(schemeId.toString()))
                .andExpect(jsonPath("$.data.availableDocuments[0].documentTypeCode").value("AADHAAR"))
                .andExpect(jsonPath("$.data.missingDocuments[0].documentTypeCode").value("RATION_CARD"))
                .andExpect(jsonPath("$.data.potentiallyExpiredDocuments[0].documentTypeCode").value("INCOME_CERTIFICATE"))
                .andExpect(jsonPath("$.data.fullyReady").value(false));
    }

    @Test
    void validateDocumentReturnsValidationResponse() throws Exception {
        UUID docId = UUID.randomUUID();
        DocumentValidationResponse resp = new DocumentValidationResponse(
                docId,
                "INCOME_CERTIFICATE",
                "Income Certificate",
                in.sahayak.document.model.enums.DocumentValidityStatus.VALID,
                LocalDate.of(2024, 1, 1),
                LocalDate.of(2025, 1, 1),
                "Karnataka 1-year rule",
                "Document is valid",
                120L
        );

        when(validityService.validateDocument(eq(docId), eq("user@example.com"), any()))
                .thenReturn(resp);

        mockMvc.perform(post("/api/documents/" + docId + "/validate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}")
                        .principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.documentId").value(docId.toString()))
                .andExpect(jsonPath("$.data.documentType").value("INCOME_CERTIFICATE"))
                .andExpect(jsonPath("$.data.status").value("VALID"))
                .andExpect(jsonPath("$.data.daysUntilExpiry").value(120));
    }

    @Test
    void validateDocumentSupportsManualDateFallback() throws Exception {
        UUID docId = UUID.randomUUID();
        LocalDate manualIssue = LocalDate.now().minusMonths(2);
        LocalDate manualExpiry = LocalDate.now().plusMonths(10);

        DocumentValidationRequest manualReq = new DocumentValidationRequest(
                null,
                "Karnataka",
                manualIssue,
                manualExpiry
        );

        DocumentValidationResponse resp = new DocumentValidationResponse(
                docId,
                "INCOME_CERTIFICATE",
                "Income Certificate",
                in.sahayak.document.model.enums.DocumentValidityStatus.VALID,
                manualIssue,
                manualExpiry,
                "Manual date verified rule",
                "Document is valid with manual dates",
                300L
        );

        when(validityService.validateDocument(eq(docId), eq("user@example.com"), any(DocumentValidationRequest.class)))
                .thenReturn(resp);

        mockMvc.perform(post("/api/documents/" + docId + "/validate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(manualReq))
                        .principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("VALID"))
                .andExpect(jsonPath("$.data.issueDate").value(manualIssue.toString()));
    }

    @Test
    void validateDocumentReturns404WhenNotFound() throws Exception {
        UUID missingId = UUID.randomUUID();
        when(validityService.validateDocument(eq(missingId), eq("user@example.com"), any()))
                .thenThrow(new ResourceNotFoundException("Document not found"));

        mockMvc.perform(post("/api/documents/" + missingId + "/validate")
                        .principal(principal))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    void correctDocumentUpdatesMetadataAndReturns200() throws Exception {
        UUID docId = UUID.randomUUID();
        LocalDate issue = LocalDate.of(2025, 3, 1);
        LocalDate expiry = LocalDate.of(2028, 3, 1);

        DocumentCorrectionRequest request = new DocumentCorrectionRequest(
                "INCOME_CERTIFICATE",
                issue,
                expiry,
                "Updated Authority",
                "RD009988",
                DocumentStatus.ACTIVE,
                Map.of("note", "manually corrected")
        );

        UserDocumentDto updatedDto = new UserDocumentDto(
                docId,
                "INCOME_CERTIFICATE",
                "Income Certificate",
                "doc.pdf",
                "documents/key.pdf",
                Instant.now(),
                issue,
                expiry,
                "Updated Authority",
                Map.of("note", "manually corrected", "manualCorrectionApplied", true),
                DocumentStatus.ACTIVE
        );

        when(lockerService.correctDocument(eq("user@example.com"), eq(docId), any(DocumentCorrectionRequest.class)))
                .thenReturn(updatedDto);

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/documents/" + docId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.issuingAuthority").value("Updated Authority"))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    @Test
    void reExtractDocumentTriggersExtractionAndReturns200() throws Exception {
        UUID docId = UUID.randomUUID();

        UserDocumentDto extractedDto = new UserDocumentDto(
                docId,
                "INCOME_CERTIFICATE",
                "Income Certificate",
                "doc.pdf",
                "documents/key.pdf",
                Instant.now(),
                LocalDate.of(2024, 6, 1),
                LocalDate.of(2027, 6, 1),
                "Tahsildar",
                Map.of("extractionStatus", "SUCCESS"),
                DocumentStatus.ACTIVE
        );

        when(lockerService.reExtractDocument(eq("user@example.com"), eq(docId)))
                .thenReturn(extractedDto);

        mockMvc.perform(post("/api/documents/" + docId + "/extract")
                        .principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.documentType").value("INCOME_CERTIFICATE"))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }
}
