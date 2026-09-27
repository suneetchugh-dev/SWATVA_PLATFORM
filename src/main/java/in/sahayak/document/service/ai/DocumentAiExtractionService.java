package in.sahayak.document.service.ai;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import in.sahayak.document.api.ExtractedDocumentMetadata;
import in.sahayak.document.api.ExtractedField;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class DocumentAiExtractionService {

    private static final Logger log = LoggerFactory.getLogger(DocumentAiExtractionService.class);

    private final ChatModel chatModel;
    private final ObjectMapper objectMapper;

    @Autowired
    public DocumentAiExtractionService(@Autowired(required = false) ChatModel chatModel,
                                       ObjectMapper objectMapper) {
        this.chatModel = chatModel;
        this.objectMapper = objectMapper;
    }

    public ExtractedDocumentMetadata extractStructuredData(String ocrText, String hintDocumentType) {
        if (ocrText == null || ocrText.isBlank()) {
            return ExtractedDocumentMetadata.needsReview("No text could be extracted by OCR.");
        }

        if (chatModel != null) {
            try {
                return extractWithLlm(ocrText, hintDocumentType);
            } catch (Exception e) {
                log.warn("LLM structured extraction failed ({}), falling back to deterministic extraction: {}",
                        e.getClass().getSimpleName(), e.getMessage());
            }
        } else {
            log.info("ChatModel not configured; using deterministic structured extraction.");
        }

        return fallbackDeterministicExtractor(ocrText, hintDocumentType);
    }

    private ExtractedDocumentMetadata extractWithLlm(String ocrText, String hintDocumentType) throws Exception {
        String prompt = """
                You are Sahayak AI's document extraction engine for Indian citizen benefit schemes.
                Analyze the following OCR-extracted text from an official citizen document.
                
                [HINT DOCUMENT TYPE]: %s
                
                [DOCUMENT OCR TEXT]:
                %s
                
                CRITICAL INSTRUCTIONS:
                1. Extract the following fields when available in the text:
                   - "documentType": code from ["AADHAAR", "INCOME_CERTIFICATE", "CASTE_CERTIFICATE", "RATION_CARD", "RESIDENCE_PROOF", "BANK_ACCOUNT", "ELECTRICITY_CONNECTION", "EDUCATION_CERTIFICATE", "OFFICIAL_ID", "OTHER"]
                   - "holderName": full name of applicant or document holder
                   - "issueDate": issue date formatted strictly as YYYY-MM-DD (null if absent)
                   - "expiryDate": expiry date formatted strictly as YYYY-MM-DD (null if absent)
                   - "issuingAuthority": issuing authority or government department or bank branch
                   - "certificateNumber": unique certificate / registration / account / document number
                   - "annualIncome": numeric annual family income in INR (null if not an income document)
                   - "category": caste or social category (e.g., "SC", "ST", "OBC", "GENERAL", null if absent)
                   - "state": state name (e.g., "Karnataka", null if absent)
                   - "district": district name (null if absent)
                2. For every field, return an object containing:
                   - "value": the extracted value or null
                   - "confidence": confidence score between 0.0 and 1.0
                   - "reviewStatus": "AUTO_EXTRACTED" (if confidence >= 0.7), "LOW_CONFIDENCE" (if confidence < 0.7), or "NOT_FOUND"
                3. Overall metrics:
                   - "overallConfidence": average confidence of extracted non-null fields
                   - "extractionStatus": "SUCCESS" or "PARTIAL" or "NEEDS_REVIEW"
                4. NEVER claim official verification.
                5. Output strictly raw JSON ONLY. No markdown formatting, no explanations.
                """.formatted(hintDocumentType != null ? hintDocumentType : "UNKNOWN", ocrText);

        String response = chatModel.call(prompt);
        if (response == null || response.isBlank()) {
            throw new IllegalStateException("Empty response from ChatModel");
        }

        String cleanedJson = cleanJsonOutput(response);
        return parseLlmJson(cleanedJson, ocrText, hintDocumentType);
    }

    private String cleanJsonOutput(String raw) {
        String trimmed = raw.trim();
        if (trimmed.startsWith("```json")) {
            trimmed = trimmed.substring(7);
        } else if (trimmed.startsWith("```")) {
            trimmed = trimmed.substring(3);
        }
        if (trimmed.endsWith("```")) {
            trimmed = trimmed.substring(0, trimmed.length() - 3);
        }
        return trimmed.trim();
    }

    private ExtractedDocumentMetadata parseLlmJson(String json, String originalText, String hint) throws Exception {
        JsonNode root = objectMapper.readTree(json);

        ExtractedField<String> docType = parseStringField(root, "documentType", hint);
        ExtractedField<String> holderName = parseStringField(root, "holderName", null);
        ExtractedField<LocalDate> issueDate = parseDateField(root, "issueDate");
        ExtractedField<LocalDate> expiryDate = parseDateField(root, "expiryDate");
        ExtractedField<String> issuingAuthority = parseStringField(root, "issuingAuthority", null);
        ExtractedField<String> certNumber = parseStringField(root, "certificateNumber", null);
        ExtractedField<Double> annualIncome = parseDoubleField(root, "annualIncome");
        ExtractedField<String> category = parseStringField(root, "category", null);
        ExtractedField<String> state = parseStringField(root, "state", null);
        ExtractedField<String> district = parseStringField(root, "district", null);

        double overallConfidence = root.has("overallConfidence") ? root.get("overallConfidence").asDouble(0.8) : 0.8;
        String extractionStatus = root.has("extractionStatus") ? root.get("extractionStatus").asText("SUCCESS") : "SUCCESS";

        Map<String, Object> additional = new HashMap<>();
        additional.put("method", "LLM_AI");

        return new ExtractedDocumentMetadata(
                docType,
                holderName,
                issueDate,
                expiryDate,
                issuingAuthority,
                certNumber,
                annualIncome,
                category,
                state,
                district,
                overallConfidence,
                extractionStatus,
                false,
                ExtractedDocumentMetadata.DISCLAIMER_TEXT,
                additional
        );
    }

    private ExtractedField<String> parseStringField(JsonNode root, String fieldName, String fallback) {
        if (!root.has(fieldName) || root.get(fieldName).isNull()) {
            return (fallback != null) ? ExtractedField.of(fallback, 0.7, "AUTO_EXTRACTED") : ExtractedField.notFound();
        }
        JsonNode node = root.get(fieldName);
        if (node.isObject()) {
            String val = node.has("value") && !node.get("value").isNull() ? node.get("value").asText() : fallback;
            double conf = node.has("confidence") ? node.get("confidence").asDouble(0.8) : 0.8;
            String status = node.has("reviewStatus") ? node.get("reviewStatus").asText("AUTO_EXTRACTED") : "AUTO_EXTRACTED";
            return (val != null) ? ExtractedField.of(val, conf, status) : ExtractedField.notFound();
        } else {
            String val = node.asText();
            return (val != null && !val.isBlank() && !"null".equalsIgnoreCase(val))
                    ? ExtractedField.of(val, 0.8, "AUTO_EXTRACTED")
                    : ExtractedField.notFound();
        }
    }

    private ExtractedField<Double> parseDoubleField(JsonNode root, String fieldName) {
        if (!root.has(fieldName) || root.get(fieldName).isNull()) {
            return ExtractedField.notFound();
        }
        JsonNode node = root.get(fieldName);
        if (node.isObject()) {
            Double val = node.has("value") && !node.get("value").isNull() ? node.get("value").asDouble() : null;
            double conf = node.has("confidence") ? node.get("confidence").asDouble(0.8) : 0.8;
            String status = node.has("reviewStatus") ? node.get("reviewStatus").asText("AUTO_EXTRACTED") : "AUTO_EXTRACTED";
            return (val != null) ? ExtractedField.of(val, conf, status) : ExtractedField.notFound();
        } else if (node.isNumber()) {
            return ExtractedField.of(node.asDouble(), 0.8, "AUTO_EXTRACTED");
        }
        return ExtractedField.notFound();
    }

    private ExtractedField<LocalDate> parseDateField(JsonNode root, String fieldName) {
        if (!root.has(fieldName) || root.get(fieldName).isNull()) {
            return ExtractedField.notFound();
        }
        JsonNode node = root.get(fieldName);
        String dateStr = null;
        double conf = 0.8;
        String status = "AUTO_EXTRACTED";

        if (node.isObject()) {
            dateStr = node.has("value") && !node.get("value").isNull() ? node.get("value").asText() : null;
            conf = node.has("confidence") ? node.get("confidence").asDouble(0.8) : 0.8;
            status = node.has("reviewStatus") ? node.get("reviewStatus").asText("AUTO_EXTRACTED") : "AUTO_EXTRACTED";
        } else {
            dateStr = node.asText();
        }

        if (dateStr == null || dateStr.isBlank() || "null".equalsIgnoreCase(dateStr)) {
            return ExtractedField.notFound();
        }

        try {
            LocalDate parsed = LocalDate.parse(dateStr.trim(), DateTimeFormatter.ISO_LOCAL_DATE);
            return ExtractedField.of(parsed, conf, status);
        } catch (Exception e) {
            log.debug("Could not parse date string '{}' from LLM: {}", dateStr, e.getMessage());
            return ExtractedField.notFound();
        }
    }

    /**
     * Robust deterministic fallback parser when LLM is offline or unavailable.
     * Uses regex and pattern heuristics to extract high-accuracy metadata.
     */
    public ExtractedDocumentMetadata fallbackDeterministicExtractor(String text, String hintDocumentType) {
        String lower = text.toLowerCase();

        // 1. Document Type Detection
        String detectedType = detectDocumentType(lower, hintDocumentType);

        // 2. Certificate Number
        String certNumber = extractCertificateNumber(text);

        // 3. Holder Name
        String holderName = extractHolderName(text);

        // 4. Dates
        LocalDate issueDate = extractIssueDate(text);
        LocalDate expiryDate = extractExpiryDate(text);

        // 5. Issuing Authority
        String authority = extractAuthority(text);

        // 6. Annual Income
        Double annualIncome = extractAnnualIncome(text);

        // 7. Category
        String category = extractCategory(text);

        // 8. State & District
        String state = extractState(text);
        String district = extractDistrict(text);

        // Compute confidence and review status
        int foundFields = 0;
        if (certNumber != null) foundFields++;
        if (holderName != null) foundFields++;
        if (issueDate != null) foundFields++;
        if (authority != null) foundFields++;
        if (annualIncome != null) foundFields++;
        if (category != null) foundFields++;

        double overallConfidence = foundFields >= 3 ? 0.85 : (foundFields >= 1 ? 0.65 : 0.40);
        String extractionStatus = foundFields >= 2 ? "SUCCESS" : (foundFields == 1 ? "PARTIAL" : "NEEDS_REVIEW");

        Map<String, Object> additional = new HashMap<>();
        additional.put("method", "DETERMINISTIC_OCR_RULE_PARSER");

        return new ExtractedDocumentMetadata(
                ExtractedField.of(detectedType, 0.85, "AUTO_EXTRACTED"),
                holderName != null ? ExtractedField.of(holderName, 0.80, "AUTO_EXTRACTED") : ExtractedField.notFound(),
                issueDate != null ? ExtractedField.of(issueDate, 0.85, "AUTO_EXTRACTED") : ExtractedField.notFound(),
                expiryDate != null ? ExtractedField.of(expiryDate, 0.80, "AUTO_EXTRACTED") : ExtractedField.notFound(),
                authority != null ? ExtractedField.of(authority, 0.80, "AUTO_EXTRACTED") : ExtractedField.notFound(),
                certNumber != null ? ExtractedField.of(certNumber, 0.90, "AUTO_EXTRACTED") : ExtractedField.notFound(),
                annualIncome != null ? ExtractedField.of(annualIncome, 0.85, "AUTO_EXTRACTED") : ExtractedField.notFound(),
                category != null ? ExtractedField.of(category, 0.85, "AUTO_EXTRACTED") : ExtractedField.notFound(),
                state != null ? ExtractedField.of(state, 0.90, "AUTO_EXTRACTED") : ExtractedField.notFound(),
                district != null ? ExtractedField.of(district, 0.80, "AUTO_EXTRACTED") : ExtractedField.notFound(),
                overallConfidence,
                extractionStatus,
                false,
                ExtractedDocumentMetadata.DISCLAIMER_TEXT,
                additional
        );
    }

    private String detectDocumentType(String lower, String hint) {
        if (hint != null && !hint.isBlank() && !"DOCUMENT".equalsIgnoreCase(hint) && !"UNKNOWN".equalsIgnoreCase(hint)) {
            return hint.trim().toUpperCase();
        }
        if (lower.contains("income") || lower.contains("nadakacheri") || lower.contains("annual income") || lower.contains("income and asset")) {
            return "INCOME_CERTIFICATE";
        }
        if (lower.contains("caste") || lower.contains("community") || lower.contains("scheduled tribe") || lower.contains("scheduled caste")) {
            return "CASTE_CERTIFICATE";
        }
        if (lower.contains("aadhaar") || lower.contains("uidai") || lower.contains("unique identification")) {
            return "AADHAAR";
        }
        if (lower.contains("ration") || lower.contains("ahara") || lower.contains("food and civil supplies") || lower.contains("bpl card")) {
            return "RATION_CARD";
        }
        if (lower.contains("electricity") || lower.contains("bescom") || lower.contains("hescom") || lower.contains("mescom") || lower.contains("rr no")) {
            return "ELECTRICITY_CONNECTION";
        }
        if (lower.contains("bank") || lower.contains("passbook") || lower.contains("ifsc") || lower.contains("savings account")) {
            return "BANK_ACCOUNT";
        }
        if (lower.contains("residence") || lower.contains("domicile")) {
            return "RESIDENCE_PROOF";
        }
        if (lower.contains("marks card") || lower.contains("degree") || lower.contains("diploma") || lower.contains("sslc") || lower.contains("puc")) {
            return "EDUCATION_CERTIFICATE";
        }
        return "DOCUMENT";
    }

    private String extractCertificateNumber(String text) {
        // Matches Nadakacheri RD numbers: e.g. RD00382910291
        Matcher rdMatcher = Pattern.compile("\\b(RD\\d{8,15})\\b", Pattern.CASE_INSENSITIVE).matcher(text);
        if (rdMatcher.find()) {
            return rdMatcher.group(1);
        }
        // Matches Aadhaar 12-digit format: 1234 5678 9012 (only horizontal space, not newline)
        Matcher aadhaarMatcher = Pattern.compile("\\b(\\d{4}[ \\t]+\\d{4}[ \\t]+\\d{4})\\b").matcher(text);
        if (aadhaarMatcher.find()) {
            return aadhaarMatcher.group(1);
        }
        // Matches Bank A/C No: 1234567890
        Matcher acMatcher = Pattern.compile("(?:A/C|Account|Acc)[\\s.:#-]*No[.:\\s#-]*(\\d{9,18})|(?:A/C|Account|Acc)[\\s.:#-]+(\\d{9,18})", Pattern.CASE_INSENSITIVE).matcher(text);
        if (acMatcher.find()) {
            return acMatcher.group(1) != null ? acMatcher.group(1) : acMatcher.group(2);
        }
        // Matches generic Certificate No: XYZ123456
        Matcher certMatcher = Pattern.compile("(?:Certificate|Application|Document|Ack)\\s*(?:No|Number|ID)[:\\s.]*([A-Za-z0-9/-]{5,25})", Pattern.CASE_INSENSITIVE).matcher(text);
        if (certMatcher.find()) {
            return certMatcher.group(1).trim();
        }
        return null;
    }

    private String extractHolderName(String text) {
        Matcher nameMatcher = Pattern.compile("(?:Name|Holder|Applicant|Beneficiary|Sri/Smt)[\\s.:]*(?:of)?[:\\s]*([A-Za-z\\s.]{3,35})(?:\\r?\\n|,|\\.)", Pattern.CASE_INSENSITIVE).matcher(text);
        if (nameMatcher.find()) {
            String name = nameMatcher.group(1).trim();
            if (!name.equalsIgnoreCase("of") && name.length() >= 3) {
                return name;
            }
        }
        return null;
    }

    private LocalDate extractIssueDate(String text) {
        // Search for issue date keyword followed or preceded by date
        Matcher matcher = Pattern.compile("(?:Date\\s+of\\s+Issue|Issued\\s+On|Issue\\s+Date|Date|Dated)[\\s.:]*([0-3]?[0-9][-/\\.][0-1]?[0-9][-/\\.][12][0-9]{3})", Pattern.CASE_INSENSITIVE).matcher(text);
        if (matcher.find()) {
            return parseLocalDate(matcher.group(1));
        }
        // General date pattern DD/MM/YYYY
        Matcher genMatcher = Pattern.compile("\\b([0-3]?[0-9][-/\\.][0-1]?[0-9][-/\\.][12][0-9]{3})\\b").matcher(text);
        if (genMatcher.find()) {
            return parseLocalDate(genMatcher.group(1));
        }
        return null;
    }

    private LocalDate extractExpiryDate(String text) {
        Matcher matcher = Pattern.compile("(?:Valid\\s+Upto|Valid\\s+Until|Expiry\\s+Date|Expires\\s+On|Valid\\s+Through)[\\s.:]*([0-3]?[0-9][-/\\.][0-1]?[0-9][-/\\.][12][0-9]{3})", Pattern.CASE_INSENSITIVE).matcher(text);
        if (matcher.find()) {
            return parseLocalDate(matcher.group(1));
        }
        return null;
    }

    private LocalDate parseLocalDate(String raw) {
        if (raw == null) return null;
        String clean = raw.trim().replace(".", "-").replace("/", "-");
        String[] parts = clean.split("-");
        if (parts.length != 3) return null;
        try {
            int d, m, y;
            if (parts[0].length() == 4) {
                y = Integer.parseInt(parts[0]);
                m = Integer.parseInt(parts[1]);
                d = Integer.parseInt(parts[2]);
            } else {
                d = Integer.parseInt(parts[0]);
                m = Integer.parseInt(parts[1]);
                y = Integer.parseInt(parts[2]);
            }
            if (y >= 1950 && y <= 2050 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
                return LocalDate.of(y, m, d);
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private String extractAuthority(String text) {
        Matcher tMatcher = Pattern.compile("(?:Issued\\s+by|Issuing\\s+Authority)[:\\s]*([A-Za-z\\s,]{3,40})(?:\\r?\\n|$)", Pattern.CASE_INSENSITIVE).matcher(text);
        if (tMatcher.find()) {
            return tMatcher.group(1).trim();
        }
        Matcher matcher = Pattern.compile("\\b(Tahsildar|Revenue Department|Government of Karnataka|Government of India|UIDAI|Department of Food|State Bank of India|Canara Bank)\\b", Pattern.CASE_INSENSITIVE).matcher(text);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return null;
    }

    private Double extractAnnualIncome(String text) {
        Matcher matcher = Pattern.compile("(?:Annual\\s+Income|Family\\s+Income|Total\\s+Income|Income)[\\s.:₹Rs.]*(\\d[\\d,.]*)", Pattern.CASE_INSENSITIVE).matcher(text);
        if (matcher.find()) {
            String rawVal = matcher.group(1).replace(",", "").trim();
            try {
                return Double.parseDouble(rawVal);
            } catch (Exception ignored) {
            }
        }
        return null;
    }

    private String extractCategory(String text) {
        Matcher matcher = Pattern.compile("\\b(SC|ST|OBC|GENERAL|Cat-1|Cat-I|Category-1|2A|2B|3A|3B)\\b", Pattern.CASE_INSENSITIVE).matcher(text);
        if (matcher.find()) {
            String cat = matcher.group(1).toUpperCase();
            if (cat.startsWith("CAT")) return "OBC";
            return cat;
        }
        return null;
    }

    private String extractState(String text) {
        Matcher matcher = Pattern.compile("\\b(Karnataka|Maharashtra|Delhi|Tamil Nadu|Kerala|Andhra Pradesh|Telangana|Uttar Pradesh|Gujarat)\\b", Pattern.CASE_INSENSITIVE).matcher(text);
        if (matcher.find()) {
            return normalizeTitleCase(matcher.group(1));
        }
        return null;
    }

    private String extractDistrict(String text) {
        Matcher matcher = Pattern.compile("\\b(Bengaluru\\s*(?:Urban|Rural)?|Mysuru|Belagavi|Dharwad|Mangaluru|Shivamogga|Tumakuru)\\b", Pattern.CASE_INSENSITIVE).matcher(text);
        if (matcher.find()) {
            return normalizeTitleCase(matcher.group(1));
        }
        return null;
    }

    private String normalizeTitleCase(String input) {
        if (input == null || input.isBlank()) return input;
        String[] words = input.toLowerCase().split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String w : words) {
            if (!w.isEmpty()) {
                if (!sb.isEmpty()) sb.append(" ");
                sb.append(Character.toUpperCase(w.charAt(0))).append(w.substring(1));
            }
        }
        return sb.toString();
    }
}
