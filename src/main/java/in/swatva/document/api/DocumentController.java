package in.swatva.document.api;

import in.swatva.common.api.ApiResponse;
import in.swatva.document.model.enums.DocumentStatus;
import in.swatva.document.service.DocumentLockerService;
import in.swatva.document.service.DocumentValidityService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {
    private final DocumentLockerService documentLockerService;
    private final DocumentValidityService documentValidityService;

    public DocumentController(DocumentLockerService documentLockerService) {
        this(documentLockerService, null);
    }

    @Autowired
    public DocumentController(DocumentLockerService documentLockerService,
                              @Autowired(required = false) DocumentValidityService documentValidityService) {
        this.documentLockerService = documentLockerService;
        this.documentValidityService = documentValidityService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<UserDocumentDto>> uploadDocument(
            Authentication authentication,
            @RequestParam(value = "documentType", required = false, defaultValue = "DOCUMENT") String documentType,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "filename", required = false) String filename,
            @RequestParam(value = "issueDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate issueDate,
            @RequestParam(value = "expiryDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate expiryDate,
            @RequestParam(value = "issuingAuthority", required = false) String issuingAuthority,
            @RequestParam(value = "extractedMetadata", required = false) String extractedMetadata,
            @RequestParam(value = "status", required = false) DocumentStatus status,
            @RequestParam(value = "password", required = false) String password
    ) {
        UserDocumentDto dto;
        if (password != null && !password.isBlank()) {
            dto = documentLockerService.uploadDocument(
                    authentication.getName(),
                    documentType,
                    file,
                    filename,
                    issueDate,
                    expiryDate,
                    issuingAuthority,
                    extractedMetadata,
                    status,
                    password
            );
        } else {
            dto = documentLockerService.uploadDocument(
                    authentication.getName(),
                    documentType,
                    file,
                    filename,
                    issueDate,
                    expiryDate,
                    issuingAuthority,
                    extractedMetadata,
                    status
            );
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(dto));
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiResponse<UserDocumentDto>> registerDocument(
            Authentication authentication,
            @Valid @RequestBody DocumentRegistrationRequest request
    ) {
        UserDocumentDto dto = documentLockerService.registerDocument(authentication.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(dto));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<UserDocumentDto>>> listDocuments(Authentication authentication) {
        List<UserDocumentDto> docs = documentLockerService.getUserDocuments(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(docs));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDocumentDto>> getDocument(
            Authentication authentication,
            @PathVariable("id") UUID id
    ) {
        UserDocumentDto doc = documentLockerService.getDocumentById(authentication.getName(), id);
        return ResponseEntity.ok(ApiResponse.success(doc));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, String>>> deleteDocument(
            Authentication authentication,
            @PathVariable("id") UUID id
    ) {
        documentLockerService.deleteDocument(authentication.getName(), id);
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "Document deleted successfully", "id", id.toString())));
    }

    @GetMapping("/scheme/{schemeId}/evaluation")
    public ResponseEntity<ApiResponse<SchemeDocumentEvaluation>> evaluateSchemeDocuments(
            Authentication authentication,
            @PathVariable("schemeId") UUID schemeId
    ) {
        String email = (authentication != null) ? authentication.getName() : null;
        SchemeDocumentEvaluation evaluation = documentLockerService.evaluateSchemeDocuments(schemeId, email);
        return ResponseEntity.ok(ApiResponse.success(evaluation));
    }

    @PostMapping("/{id}/validate")
    public ResponseEntity<ApiResponse<DocumentValidationResponse>> validateDocument(
            Authentication authentication,
            @PathVariable("id") UUID id,
            @RequestBody(required = false) DocumentValidationRequest request
    ) {
        DocumentValidationResponse response = documentValidityService.validateDocument(
                id,
                authentication.getName(),
                request
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDocumentDto>> correctDocument(
            Authentication authentication,
            @PathVariable("id") UUID id,
            @Valid @RequestBody DocumentCorrectionRequest request
    ) {
        UserDocumentDto dto = documentLockerService.correctDocument(authentication.getName(), id, request);
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @PostMapping("/{id}/extract")
    public ResponseEntity<ApiResponse<UserDocumentDto>> reExtractDocument(
            Authentication authentication,
            @PathVariable("id") UUID id
    ) {
        UserDocumentDto dto = documentLockerService.reExtractDocument(authentication.getName(), id);
        return ResponseEntity.ok(ApiResponse.success(dto));
    }
}
