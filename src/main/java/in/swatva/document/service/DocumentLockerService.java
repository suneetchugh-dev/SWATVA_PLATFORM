package in.swatva.document.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import in.swatva.common.exception.ResourceNotFoundException;
import in.swatva.document.api.DocumentCorrectionRequest;
import in.swatva.document.api.DocumentRegistrationRequest;
import in.swatva.document.api.DocumentValidationResponse;
import in.swatva.document.api.ExtractedDocumentMetadata;
import in.swatva.document.api.SchemeDocumentEvaluation;
import in.swatva.document.api.SchemeDocumentEvaluation.DocumentItem;
import in.swatva.document.api.UserDocumentDto;
import in.swatva.document.model.DocumentType;
import in.swatva.document.model.UserDocument;
import in.swatva.document.model.enums.DocumentStatus;
import in.swatva.document.model.enums.DocumentValidityStatus;
import in.swatva.document.repository.DocumentTypeRepository;
import in.swatva.document.repository.UserDocumentRepository;
import in.swatva.document.service.ai.DocumentAiExtractionService;
import in.swatva.document.service.ocr.DocumentOcrService;
import in.swatva.document.service.ocr.OcrService;
import in.swatva.scheme.model.Scheme;
import in.swatva.scheme.model.SchemeDocumentRequirement;
import in.swatva.scheme.repository.SchemeRepository;
import in.swatva.user.model.User;
import in.swatva.user.repository.UserRepository;
import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class DocumentLockerService {
    private static final Logger log = LoggerFactory.getLogger(DocumentLockerService.class);

    private final UserDocumentRepository userDocumentRepository;
    private final DocumentTypeRepository documentTypeRepository;
    private final UserRepository userRepository;
    private final SchemeRepository schemeRepository;
    private final StorageService storageService;
    private final ObjectMapper objectMapper;
    private final OcrService ocrService;
    private final DocumentAiExtractionService aiExtractionService;
    private final DocumentValidityService validityService;

    public DocumentLockerService(UserDocumentRepository userDocumentRepository,
                                 DocumentTypeRepository documentTypeRepository,
                                 UserRepository userRepository,
                                 SchemeRepository schemeRepository,
                                 StorageService storageService,
                                 ObjectMapper objectMapper) {
        this(userDocumentRepository, documentTypeRepository, userRepository, schemeRepository,
                storageService, objectMapper, new DocumentOcrService(),
                new DocumentAiExtractionService(null, objectMapper), null);
    }

    @Autowired
    public DocumentLockerService(UserDocumentRepository userDocumentRepository,
                                 DocumentTypeRepository documentTypeRepository,
                                 UserRepository userRepository,
                                 SchemeRepository schemeRepository,
                                 StorageService storageService,
                                 ObjectMapper objectMapper,
                                 @Autowired(required = false) OcrService ocrService,
                                 @Autowired(required = false) DocumentAiExtractionService aiExtractionService,
                                 @Autowired(required = false) DocumentValidityService validityService) {
        this.userDocumentRepository = userDocumentRepository;
        this.documentTypeRepository = documentTypeRepository;
        this.userRepository = userRepository;
        this.schemeRepository = schemeRepository;
        this.storageService = storageService;
        this.objectMapper = objectMapper;
        this.ocrService = (ocrService != null) ? ocrService : new DocumentOcrService();
        this.aiExtractionService = (aiExtractionService != null) ? aiExtractionService : new DocumentAiExtractionService(null, objectMapper);
        this.validityService = validityService;
    }

    @Transactional
    public UserDocumentDto uploadDocument(String userEmail,
                                          String documentTypeCode,
                                          MultipartFile file,
                                          String filenameParam,
                                          LocalDate issueDate,
                                          LocalDate expiryDate,
                                          String issuingAuthority,
                                          String metadataJson,
                                          DocumentStatus statusParam) {
        return uploadDocument(userEmail, documentTypeCode, file, filenameParam, issueDate, expiryDate, issuingAuthority, metadataJson, statusParam, null);
    }

    @Transactional
    public UserDocumentDto uploadDocument(String userEmail,
                                          String documentTypeCode,
                                          MultipartFile file,
                                          String filenameParam,
                                          LocalDate issueDate,
                                          LocalDate expiryDate,
                                          String issuingAuthority,
                                          String metadataJson,
                                          DocumentStatus statusParam,
                                          String password) {
        User user = getUserByEmail(userEmail);
        DocumentType documentType = resolveDocumentType(documentTypeCode);

        String originalName = (filenameParam != null && !filenameParam.isBlank())
                ? filenameParam
                : (file != null ? file.getOriginalFilename() : "document.bin");

        String storageKey = "documents/" + user.getId() + "/" + UUID.randomUUID() + "-" + originalName;

        String contentType = "application/octet-stream";
        Long fileSize = null;
        byte[] fileBytes = null;

        if (file != null && !file.isEmpty()) {
            try {
                fileBytes = file.getBytes();
                contentType = file.getContentType() != null ? file.getContentType() : "application/octet-stream";
                fileSize = file.getSize();
                try {
                    storageService.upload(storageKey, file.getInputStream(), file.getSize(), contentType);
                } catch (Exception storageEx) {
                    log.warn("Storage upload to S3/MinIO failed (storage service may be offline): {}. Continuing with in-memory OCR and DB registration.", storageEx.getMessage());
                }
            } catch (IOException e) {
                log.error("Failed to read uploaded file for user {}: {}", userEmail, e.getMessage());
                throw new IllegalStateException("Failed to process file upload: " + e.getMessage(), e);
            }
        }

        String effectivePassword = resolveCandidatePassword(user, password, documentTypeCode);

        // Pipeline: Uploaded document -> OCR -> extracted text -> LLM structured extraction -> document metadata -> validity checker
        ExtractedDocumentMetadata extracted = null;
        String ocrText = null;

        if (fileBytes != null && fileBytes.length > 0) {
            try {
                if (effectivePassword != null && !effectivePassword.isBlank()) {
                    ocrText = ocrService.extractText(fileBytes, contentType, originalName, effectivePassword);
                } else {
                    ocrText = ocrService.extractText(fileBytes, contentType, originalName);
                }
            } catch (Exception e) {
                log.warn("OCR text extraction failed for uploaded document {}: {}", originalName, e.getMessage());
            }

            if (ocrText != null && !ocrText.isBlank()) {
                try {
                    extracted = aiExtractionService.extractStructuredData(ocrText, documentTypeCode);
                } catch (Exception e) {
                    log.warn("AI extraction failed for uploaded document {}: {}", originalName, e.getMessage());
                }
            }
        }

        if (extracted == null) {
            String reason = (fileBytes == null || fileBytes.length == 0)
                    ? "No file content uploaded for OCR."
                    : (ocrText == null || ocrText.isBlank()
                            ? "OCR could not detect readable text in the uploaded document."
                            : "AI extraction could not extract structured metadata.");
            extracted = ExtractedDocumentMetadata.needsReview(reason);
        }

        // Manual parameters take precedence (manual fallback remains fully functional)
        LocalDate effectiveIssueDate = (issueDate != null)
                ? issueDate
                : (extracted.issueDate() != null ? extracted.issueDate().value() : null);

        LocalDate effectiveExpiryDate = (expiryDate != null)
                ? expiryDate
                : (extracted.expiryDate() != null ? extracted.expiryDate().value() : null);

        String effectiveAuthority = (issuingAuthority != null && !issuingAuthority.isBlank())
                ? issuingAuthority
                : (extracted.issuingAuthority() != null ? extracted.issuingAuthority().value() : null);

        String certNumber = (extracted.certificateNumber() != null)
                ? extracted.certificateNumber().value()
                : null;

        DocumentType effectiveDocType = documentType;
        if ((documentTypeCode == null || documentTypeCode.isBlank() || "DOCUMENT".equalsIgnoreCase(documentTypeCode))
                && extracted.documentType() != null && extracted.documentType().value() != null
                && !"DOCUMENT".equalsIgnoreCase(extracted.documentType().value())) {
            effectiveDocType = resolveDocumentType(extracted.documentType().value());
        }

        Map<String, Object> metadata = new HashMap<>(parseMetadata(metadataJson));
        metadata.putAll(extracted.toMap());
        metadata.put("officialVerificationClaimed", false);
        metadata.put("disclaimer", ExtractedDocumentMetadata.DISCLAIMER_TEXT);

        UserDocument doc = new UserDocument();
        doc.setUser(user);
        doc.setDocumentType(effectiveDocType);
        doc.setFilename(originalName);
        doc.setStorageKey(storageKey);
        doc.setStorageReference(storageKey);
        doc.setUploadDate(Instant.now());
        doc.setIssueDate(effectiveIssueDate);
        doc.setExpiryDate(effectiveExpiryDate);
        doc.setIssuingAuthority(effectiveAuthority);
        doc.setDocumentNumber(certNumber);
        doc.setContentType(contentType);
        doc.setFileSize(fileSize);
        doc.setExtractedMetadata(metadata);

        // Run validity checker
        DocumentStatus finalStatus;
        if (statusParam != null) {
            finalStatus = statusParam;
        } else {
            String evalState = extracted.state() != null ? extracted.state().value() : null;
            if (validityService != null) {
                DocumentValidationResponse valResp = validityService.validate(doc, null, evalState);
                if (valResp != null) {
                    Map<String, Object> validityCheckMap = new HashMap<>();
                    validityCheckMap.put("status", valResp.status() != null ? valResp.status().name() : "NEEDS_REVIEW");
                    validityCheckMap.put("matchedRule", valResp.matchedRuleDescription() != null ? valResp.matchedRuleDescription() : "N/A");
                    validityCheckMap.put("message", valResp.message() != null ? valResp.message() : "");
                    validityCheckMap.put("daysUntilExpiry", valResp.daysUntilExpiry() != null ? valResp.daysUntilExpiry() : -1);
                    metadata.put("validityCheck", validityCheckMap);

                    if ("NEEDS_REVIEW".equalsIgnoreCase(extracted.extractionStatus()) || valResp.status() == DocumentValidityStatus.NEEDS_REVIEW) {
                        finalStatus = DocumentStatus.NEEDS_REVIEW;
                    } else if (valResp.status() == DocumentValidityStatus.EXPIRED) {
                        finalStatus = DocumentStatus.EXPIRED;
                    } else {
                        finalStatus = DocumentStatus.ACTIVE;
                    }
                } else {
                    finalStatus = "NEEDS_REVIEW".equalsIgnoreCase(extracted.extractionStatus())
                            ? DocumentStatus.NEEDS_REVIEW
                            : DocumentStatus.ACTIVE;
                }
            } else {
                if ("NEEDS_REVIEW".equalsIgnoreCase(extracted.extractionStatus())) {
                    finalStatus = DocumentStatus.NEEDS_REVIEW;
                } else if (effectiveExpiryDate != null && effectiveExpiryDate.isBefore(LocalDate.now())) {
                    finalStatus = DocumentStatus.EXPIRED;
                } else {
                    finalStatus = DocumentStatus.ACTIVE;
                }
            }
        }
        doc.setStatus(finalStatus);

        UserDocument saved = userDocumentRepository.save(doc);
        return UserDocumentDto.from(saved);
    }

    private String resolveCandidatePassword(User user, String providedPassword, String documentTypeCode) {
        if (providedPassword != null && !providedPassword.isBlank()) {
            return providedPassword.trim();
        }
        if ("AADHAAR".equalsIgnoreCase(documentTypeCode) && user != null && user.getFullName() != null && user.getDateOfBirth() != null) {
            String cleanName = user.getFullName().replaceAll("[^A-Za-z]", "");
            if (cleanName.length() >= 4) {
                String prefix = cleanName.substring(0, 4).toUpperCase();
                int year = user.getDateOfBirth().getYear();
                return prefix + year;
            }
        }
        return null;
    }

    @Transactional
    public UserDocumentDto correctDocument(String userEmail, UUID documentId, DocumentCorrectionRequest request) {
        User user = getUserByEmail(userEmail);
        UserDocument doc = userDocumentRepository.findByIdAndUserId(documentId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Document not found"));

        if (request.documentType() != null && !request.documentType().isBlank()) {
            doc.setDocumentType(resolveDocumentType(request.documentType()));
        }
        if (request.issueDate() != null) {
            doc.setIssueDate(request.issueDate());
        }
        if (request.expiryDate() != null) {
            doc.setExpiryDate(request.expiryDate());
        }
        if (request.issuingAuthority() != null) {
            doc.setIssuingAuthority(request.issuingAuthority());
        }
        if (request.documentNumber() != null) {
            doc.setDocumentNumber(request.documentNumber());
        }

        Map<String, Object> meta = new HashMap<>(doc.getExtractedMetadata());
        if (request.extractedMetadata() != null) {
            meta.putAll(request.extractedMetadata());
        }
        meta.put("manualCorrectionApplied", true);
        meta.put("lastCorrectedAt", Instant.now().toString());
        meta.put("officialVerificationClaimed", false);
        meta.put("disclaimer", ExtractedDocumentMetadata.DISCLAIMER_TEXT);
        doc.setExtractedMetadata(meta);

        // Re-evaluate validity
        if (request.status() != null) {
            doc.setStatus(request.status());
        } else if (validityService != null) {
            DocumentValidationResponse valResp = validityService.validate(doc, null, null);
            if (valResp != null) {
                Map<String, Object> validityCheckMap = new HashMap<>();
                validityCheckMap.put("status", valResp.status() != null ? valResp.status().name() : "NEEDS_REVIEW");
                validityCheckMap.put("matchedRule", valResp.matchedRuleDescription() != null ? valResp.matchedRuleDescription() : "N/A");
                validityCheckMap.put("message", valResp.message() != null ? valResp.message() : "");
                validityCheckMap.put("daysUntilExpiry", valResp.daysUntilExpiry() != null ? valResp.daysUntilExpiry() : -1);
                meta.put("validityCheck", validityCheckMap);

                if (valResp.status() == DocumentValidityStatus.EXPIRED) {
                    doc.setStatus(DocumentStatus.EXPIRED);
                } else if (valResp.status() == DocumentValidityStatus.NEEDS_REVIEW) {
                    doc.setStatus(DocumentStatus.NEEDS_REVIEW);
                } else {
                    doc.setStatus(DocumentStatus.ACTIVE);
                }
            } else {
                doc.setStatus(DocumentStatus.ACTIVE);
            }
        } else {
            LocalDate today = LocalDate.now();
            if (doc.getExpiryDate() != null && doc.getExpiryDate().isBefore(today)) {
                doc.setStatus(DocumentStatus.EXPIRED);
            } else {
                doc.setStatus(DocumentStatus.ACTIVE);
            }
        }

        UserDocument saved = userDocumentRepository.save(doc);
        return UserDocumentDto.from(saved);
    }

    @Transactional
    public UserDocumentDto reExtractDocument(String userEmail, UUID documentId) {
        User user = getUserByEmail(userEmail);
        UserDocument doc = userDocumentRepository.findByIdAndUserId(documentId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Document not found"));

        byte[] fileBytes = null;
        if (doc.getStorageKey() != null && !doc.getStorageKey().isBlank()) {
            try {
                fileBytes = storageService.download(doc.getStorageKey());
            } catch (Exception e) {
                log.warn("Could not download file {} from storage for re-extraction: {}", doc.getStorageKey(), e.getMessage());
            }
        }

        ExtractedDocumentMetadata extracted = null;
        String ocrText = null;
        if (fileBytes != null && fileBytes.length > 0) {
            try {
                String candidatePwd = resolveCandidatePassword(user, null, doc.getDocumentType() != null ? doc.getDocumentType().getCode() : null);
                if (candidatePwd != null && !candidatePwd.isBlank()) {
                    ocrText = ocrService.extractText(fileBytes, doc.getContentType(), doc.getFilename(), candidatePwd);
                } else {
                    ocrText = ocrService.extractText(fileBytes, doc.getContentType(), doc.getFilename());
                }
            } catch (Exception e) {
                log.warn("OCR failed during re-extraction: {}", e.getMessage());
            }

            if (ocrText != null && !ocrText.isBlank()) {
                String hint = doc.getDocumentType() != null ? doc.getDocumentType().getCode() : "DOCUMENT";
                extracted = aiExtractionService.extractStructuredData(ocrText, hint);
            }
        }

        if (extracted == null) {
            extracted = ExtractedDocumentMetadata.needsReview("No readable text found during re-extraction.");
        }

        // Apply extracted fields if missing on document
        if (doc.getIssueDate() == null && extracted.issueDate() != null && extracted.issueDate().value() != null) {
            doc.setIssueDate(extracted.issueDate().value());
        }
        if (doc.getExpiryDate() == null && extracted.expiryDate() != null && extracted.expiryDate().value() != null) {
            doc.setExpiryDate(extracted.expiryDate().value());
        }
        if ((doc.getIssuingAuthority() == null || doc.getIssuingAuthority().isBlank()) && extracted.issuingAuthority() != null && extracted.issuingAuthority().value() != null) {
            doc.setIssuingAuthority(extracted.issuingAuthority().value());
        }
        if ((doc.getDocumentNumber() == null || doc.getDocumentNumber().isBlank()) && extracted.certificateNumber() != null && extracted.certificateNumber().value() != null) {
            doc.setDocumentNumber(extracted.certificateNumber().value());
        }

        Map<String, Object> meta = new HashMap<>(doc.getExtractedMetadata());
        meta.putAll(extracted.toMap());
        meta.put("lastReExtractedAt", Instant.now().toString());
        meta.put("officialVerificationClaimed", false);
        meta.put("disclaimer", ExtractedDocumentMetadata.DISCLAIMER_TEXT);
        doc.setExtractedMetadata(meta);

        // Re-evaluate validity
        if (validityService != null) {
            String state = extracted.state() != null ? extracted.state().value() : null;
            DocumentValidationResponse valResp = validityService.validate(doc, null, state);
            if (valResp != null) {
                Map<String, Object> validityCheckMap = new HashMap<>();
                validityCheckMap.put("status", valResp.status() != null ? valResp.status().name() : "NEEDS_REVIEW");
                validityCheckMap.put("matchedRule", valResp.matchedRuleDescription() != null ? valResp.matchedRuleDescription() : "N/A");
                validityCheckMap.put("message", valResp.message() != null ? valResp.message() : "");
                validityCheckMap.put("daysUntilExpiry", valResp.daysUntilExpiry() != null ? valResp.daysUntilExpiry() : -1);
                meta.put("validityCheck", validityCheckMap);

                if ("NEEDS_REVIEW".equalsIgnoreCase(extracted.extractionStatus()) || valResp.status() == DocumentValidityStatus.NEEDS_REVIEW) {
                    doc.setStatus(DocumentStatus.NEEDS_REVIEW);
                } else if (valResp.status() == DocumentValidityStatus.EXPIRED) {
                    doc.setStatus(DocumentStatus.EXPIRED);
                } else {
                    doc.setStatus(DocumentStatus.ACTIVE);
                }
            } else {
                if ("NEEDS_REVIEW".equalsIgnoreCase(extracted.extractionStatus())) {
                    doc.setStatus(DocumentStatus.NEEDS_REVIEW);
                } else {
                    doc.setStatus(DocumentStatus.ACTIVE);
                }
            }
        }

        UserDocument saved = userDocumentRepository.save(doc);
        return UserDocumentDto.from(saved);
    }

    @Transactional
    public UserDocumentDto registerDocument(String userEmail, DocumentRegistrationRequest request) {
        User user = getUserByEmail(userEmail);
        DocumentType documentType = resolveDocumentType(request.documentType());

        String filename = (request.filename() != null && !request.filename().isBlank())
                ? request.filename()
                : "document.bin";

        String storageKey = (request.storageKey() != null && !request.storageKey().isBlank())
                ? request.storageKey()
                : "documents/" + user.getId() + "/" + UUID.randomUUID() + "-" + filename;

        DocumentStatus status = resolveStatus(request.status(), request.expiryDate());

        UserDocument doc = new UserDocument();
        doc.setUser(user);
        doc.setDocumentType(documentType);
        doc.setFilename(filename);
        doc.setStorageKey(storageKey);
        doc.setStorageReference(storageKey);
        doc.setUploadDate(Instant.now());
        doc.setIssueDate(request.issueDate());
        doc.setExpiryDate(request.expiryDate());
        doc.setIssuingAuthority(request.issuingAuthority());
        doc.setExtractedMetadata(request.extractedMetadata() != null ? request.extractedMetadata() : Map.of());
        doc.setStatus(status);

        UserDocument saved = userDocumentRepository.save(doc);
        return UserDocumentDto.from(saved);
    }

    @Transactional(readOnly = true)
    public List<UserDocumentDto> getUserDocuments(String userEmail) {
        User user = getUserByEmail(userEmail);
        return userDocumentRepository.findByUserId(user.getId())
                .stream()
                .sorted(Comparator.comparing(UserDocument::getUploadDate, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(UserDocumentDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public UserDocumentDto getDocumentById(String userEmail, UUID documentId) {
        User user = getUserByEmail(userEmail);
        UserDocument doc = userDocumentRepository.findByIdAndUserId(documentId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Document not found"));
        return UserDocumentDto.from(doc);
    }

    @Transactional
    public void deleteDocument(String userEmail, UUID documentId) {
        User user = getUserByEmail(userEmail);
        UserDocument doc = userDocumentRepository.findByIdAndUserId(documentId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Document not found"));

        if (doc.getStorageKey() != null && !doc.getStorageKey().isBlank()) {
            try {
                storageService.delete(doc.getStorageKey());
            } catch (Exception e) {
                log.warn("Could not delete storage object {} from S3: {}", doc.getStorageKey(), e.getMessage());
            }
        }
        userDocumentRepository.delete(doc);
    }

    @Transactional(readOnly = true)
    public SchemeDocumentEvaluation evaluateSchemeDocuments(UUID schemeId, String userEmail) {
        Scheme scheme = schemeRepository.findById(schemeId)
                .orElseThrow(() -> new ResourceNotFoundException("Scheme not found"));

        List<UserDocument> userDocs = List.of();
        if (userEmail != null && !userEmail.isBlank()) {
            User user = userRepository.findByEmail(userEmail).orElse(null);
            if (user != null) {
                userDocs = userDocumentRepository.findByUserId(user.getId());
            }
        }
        return evaluateDocuments(scheme, userDocs);
    }

    @Transactional(readOnly = true)
    public SchemeDocumentEvaluation evaluateSchemeDocuments(Scheme scheme, UUID userId) {
        List<UserDocument> userDocs = (userId != null)
                ? userDocumentRepository.findByUserId(userId)
                : List.of();
        return evaluateDocuments(scheme, userDocs);
    }

    public SchemeDocumentEvaluation evaluateDocuments(Scheme scheme, List<UserDocument> userDocs) {
        LocalDate today = LocalDate.now();
        List<DocumentItem> available = new ArrayList<>();
        List<DocumentItem> missing = new ArrayList<>();
        List<DocumentItem> potentiallyExpired = new ArrayList<>();

        Map<String, List<UserDocument>> docsByType = userDocs.stream()
                .filter(d -> d.getDocumentType() != null && d.getDocumentType().getCode() != null)
                .collect(Collectors.groupingBy(d -> d.getDocumentType().getCode().toUpperCase()));

        for (SchemeDocumentRequirement req : scheme.getDocumentRequirements()) {
            if (req.getDocumentType() == null) {
                continue;
            }
            String code = req.getDocumentType().getCode();
            String name = req.getDocumentType().getName();
            boolean required = req.isRequired();

            List<UserDocument> docs = docsByType.getOrDefault(code.toUpperCase(), List.of());

            // A document is valid only if ACTIVE and expiryDate is either null or in the future/today
            List<UserDocument> validDocs = docs.stream()
                    .filter(d -> d.getStatus() == DocumentStatus.ACTIVE)
                    .filter(d -> d.getExpiryDate() == null || !d.getExpiryDate().isBefore(today))
                    .toList();

            // A document is potentially expired if status == EXPIRED or expiryDate is before today
            List<UserDocument> expiredDocs = docs.stream()
                    .filter(d -> d.getStatus() == DocumentStatus.EXPIRED || (d.getExpiryDate() != null && d.getExpiryDate().isBefore(today)))
                    .toList();

            if (!validDocs.isEmpty()) {
                UserDocument chosen = validDocs.get(0);
                available.add(DocumentItem.available(code, name, required, chosen.getId(), chosen.getFilename(), chosen.getExpiryDate()));
            } else {
                if (!expiredDocs.isEmpty()) {
                    UserDocument expiredDoc = expiredDocs.get(0);
                    potentiallyExpired.add(DocumentItem.potentiallyExpired(
                            code,
                            name,
                            required,
                            expiredDoc.getId(),
                            expiredDoc.getFilename(),
                            expiredDoc.getExpiryDate(),
                            "Document expired on " + expiredDoc.getExpiryDate() + "; file presence alone is not valid proof of eligibility"
                    ));
                    missing.add(DocumentItem.missing(code, name, required, "Expired document in locker requires renewal or re-upload"));
                } else {
                    missing.add(DocumentItem.missing(code, name, required, req.getNotes()));
                }
            }
        }

        boolean fullyReady = scheme.getDocumentRequirements().stream()
                .filter(SchemeDocumentRequirement::isRequired)
                .allMatch(req -> req.getDocumentType() != null &&
                        available.stream().anyMatch(a -> a.documentTypeCode().equalsIgnoreCase(req.getDocumentType().getCode())));

        return new SchemeDocumentEvaluation(
                scheme.getId(),
                scheme.getName(),
                available,
                missing,
                potentiallyExpired,
                fullyReady
        );
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }

    private DocumentType resolveDocumentType(String code) {
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("Document type code is required");
        }
        String cleanCode = code.trim().toUpperCase();

        return documentTypeRepository.findByCode(cleanCode)
                .orElseGet(() -> {
                    try {
                        UUID typeId = UUID.fromString(code.trim());
                        return documentTypeRepository.findById(typeId)
                                .orElseGet(() -> createNewDocumentType(cleanCode));
                    } catch (IllegalArgumentException e) {
                        return createNewDocumentType(cleanCode);
                    }
                });
    }

    private DocumentType createNewDocumentType(String code) {
        DocumentType dt = new DocumentType();
        dt.setCode(code);
        dt.setName(formatNameFromCode(code));
        dt.setActive(true);
        return documentTypeRepository.save(dt);
    }

    private String formatNameFromCode(String code) {
        String[] words = code.toLowerCase().split("_");
        StringBuilder sb = new StringBuilder();
        for (String w : words) {
            if (!w.isEmpty()) {
                if (!sb.isEmpty()) sb.append(" ");
                sb.append(Character.toUpperCase(w.charAt(0))).append(w.substring(1));
            }
        }
        return sb.toString();
    }

    private DocumentStatus resolveStatus(DocumentStatus requestedStatus, LocalDate expiryDate) {
        if (requestedStatus != null) {
            return requestedStatus;
        }
        if (expiryDate != null && expiryDate.isBefore(LocalDate.now())) {
            return DocumentStatus.EXPIRED;
        }
        return DocumentStatus.ACTIVE;
    }

    private Map<String, Object> parseMetadata(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.warn("Failed to parse document metadata JSON: {}", e.getMessage());
            return Map.of("raw", json);
        }
    }
}
