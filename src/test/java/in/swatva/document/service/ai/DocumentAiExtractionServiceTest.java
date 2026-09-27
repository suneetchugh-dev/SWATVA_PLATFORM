package in.swatva.document.service.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import in.swatva.document.api.ExtractedDocumentMetadata;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.model.ChatModel;

class DocumentAiExtractionServiceTest {

    private ObjectMapper objectMapper;
    private ChatModel chatModel;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper().findAndRegisterModules();
        chatModel = mock(ChatModel.class);
    }

    @Test
    void extractStructuredDataWithChatModelParsesStructuredJson() {
        String mockLlmJson = """
                {
                  "documentType": { "value": "INCOME_CERTIFICATE", "confidence": 0.95, "reviewStatus": "AUTO_EXTRACTED" },
                  "holderName": { "value": "Ramesh Kumar", "confidence": 0.92, "reviewStatus": "AUTO_EXTRACTED" },
                  "issueDate": { "value": "2024-05-15", "confidence": 0.90, "reviewStatus": "AUTO_EXTRACTED" },
                  "expiryDate": { "value": "2027-05-15", "confidence": 0.88, "reviewStatus": "AUTO_EXTRACTED" },
                  "issuingAuthority": { "value": "Tahsildar Bengaluru North", "confidence": 0.90, "reviewStatus": "AUTO_EXTRACTED" },
                  "certificateNumber": { "value": "RD00382910291", "confidence": 0.98, "reviewStatus": "AUTO_EXTRACTED" },
                  "annualIncome": { "value": 75000.0, "confidence": 0.94, "reviewStatus": "AUTO_EXTRACTED" },
                  "category": { "value": "OBC", "confidence": 0.85, "reviewStatus": "AUTO_EXTRACTED" },
                  "state": { "value": "Karnataka", "confidence": 0.95, "reviewStatus": "AUTO_EXTRACTED" },
                  "district": { "value": "Bengaluru Urban", "confidence": 0.90, "reviewStatus": "AUTO_EXTRACTED" },
                  "overallConfidence": 0.92,
                  "extractionStatus": "SUCCESS"
                }
                """;

        when(chatModel.call(anyString())).thenReturn(mockLlmJson);

        DocumentAiExtractionService service = new DocumentAiExtractionService(chatModel, objectMapper);
        ExtractedDocumentMetadata result = service.extractStructuredData("sample ocr text", "INCOME_CERTIFICATE");

        assertThat(result).isNotNull();
        assertThat(result.documentType().value()).isEqualTo("INCOME_CERTIFICATE");
        assertThat(result.holderName().value()).isEqualTo("Ramesh Kumar");
        assertThat(result.issueDate().value()).isEqualTo(LocalDate.of(2024, 5, 15));
        assertThat(result.expiryDate().value()).isEqualTo(LocalDate.of(2027, 5, 15));
        assertThat(result.issuingAuthority().value()).isEqualTo("Tahsildar Bengaluru North");
        assertThat(result.certificateNumber().value()).isEqualTo("RD00382910291");
        assertThat(result.annualIncome().value()).isEqualTo(75000.0);
        assertThat(result.category().value()).isEqualTo("OBC");
        assertThat(result.state().value()).isEqualTo("Karnataka");
        assertThat(result.district().value()).isEqualTo("Bengaluru Urban");
        assertThat(result.extractionStatus()).isEqualTo("SUCCESS");
        assertThat(result.officialVerificationClaimed()).isFalse();
        assertThat(result.disclaimer()).contains("Not an official government verification");
    }

    @Test
    void extractStructuredDataFallbackHandlesIncomeCertificate() {
        // Without ChatModel
        DocumentAiExtractionService service = new DocumentAiExtractionService(null, objectMapper);

        String ocrText = """
                GOVERNMENT OF KARNATAKA
                REVENUE DEPARTMENT - NADAKACHERI
                INCOME CERTIFICATE
                Application No: RD00382910291
                Name of Applicant: Ramesh Kumar
                Annual Family Income: Rs. 65,000/-
                Category: OBC (Cat-2A)
                Date of Issue: 12/04/2024
                Valid Upto: 12/04/2027
                Issued by: Tahsildar, Bengaluru North
                State: Karnataka
                """;

        ExtractedDocumentMetadata result = service.extractStructuredData(ocrText, null);

        assertThat(result.documentType().value()).isEqualTo("INCOME_CERTIFICATE");
        assertThat(result.certificateNumber().value()).isEqualTo("RD00382910291");
        assertThat(result.annualIncome().value()).isEqualTo(65000.0);
        assertThat(result.category().value()).isEqualTo("OBC");
        assertThat(result.issueDate().value()).isEqualTo(LocalDate.of(2024, 4, 12));
        assertThat(result.expiryDate().value()).isEqualTo(LocalDate.of(2027, 4, 12));
        assertThat(result.issuingAuthority().value()).contains("Tahsildar");
        assertThat(result.state().value()).isEqualTo("Karnataka");
        assertThat(result.officialVerificationClaimed()).isFalse();
        assertThat(result.disclaimer()).isNotBlank();
    }

    @Test
    void extractStructuredDataFallbackHandlesAadhaar() {
        DocumentAiExtractionService service = new DocumentAiExtractionService(null, objectMapper);

        String ocrText = """
                Unique Identification Authority of India (UIDAI)
                Government of India
                Name: Sunita Devi
                Date of Issue: 01/01/2020
                1234 5678 9012
                Mera Aadhaar, Meri Pehchan
                """;

        ExtractedDocumentMetadata result = service.extractStructuredData(ocrText, "AADHAAR");

        assertThat(result.documentType().value()).isEqualTo("AADHAAR");
        assertThat(result.certificateNumber().value()).isEqualTo("1234 5678 9012");
        assertThat(result.issuingAuthority().value()).isEqualTo("UIDAI");
        assertThat(result.issueDate().value()).isEqualTo(LocalDate.of(2020, 1, 1));
        assertThat(result.officialVerificationClaimed()).isFalse();
    }

    @Test
    void extractStructuredDataFallbackHandlesBankPassbook() {
        DocumentAiExtractionService service = new DocumentAiExtractionService(null, objectMapper);

        String ocrText = """
                State Bank of India
                Savings Bank Passbook
                Account No: 123456789012
                Name: Suresh Patel
                Date: 15/08/2023
                """;

        ExtractedDocumentMetadata result = service.extractStructuredData(ocrText, null);

        assertThat(result.documentType().value()).isEqualTo("BANK_ACCOUNT");
        assertThat(result.certificateNumber().value()).isEqualTo("123456789012");
        assertThat(result.issuingAuthority().value()).isEqualTo("State Bank of India");
        assertThat(result.issueDate().value()).isEqualTo(LocalDate.of(2023, 8, 15));
        assertThat(result.officialVerificationClaimed()).isFalse();
    }

    @Test
    void extractStructuredDataFallbackHandlesElectricityConnection() {
        DocumentAiExtractionService service = new DocumentAiExtractionService(null, objectMapper);

        String ocrText = """
                BESCOM - Bangalore Electricity Supply Company Limited
                Domestic Power Connection Receipt
                RR No: RD99887766
                Date of Issue: 10/05/2024
                Consumer Name: Priya Sharma
                """;

        ExtractedDocumentMetadata result = service.extractStructuredData(ocrText, null);

        assertThat(result.documentType().value()).isEqualTo("ELECTRICITY_CONNECTION");
        assertThat(result.certificateNumber().value()).isEqualTo("RD99887766");
        assertThat(result.issueDate().value()).isEqualTo(LocalDate.of(2024, 5, 10));
        assertThat(result.officialVerificationClaimed()).isFalse();
    }

    @Test
    void extractStructuredDataReturnsNeedsReviewOnEmptyOrUnreadableText() {
        DocumentAiExtractionService service = new DocumentAiExtractionService(null, objectMapper);

        ExtractedDocumentMetadata result = service.extractStructuredData("", null);
        assertThat(result.extractionStatus()).isEqualTo("NEEDS_REVIEW");
        assertThat(result.overallConfidence()).isEqualTo(0.0);
        assertThat(result.officialVerificationClaimed()).isFalse();
    }

    @Test
    void extractStructuredDataFallsBackWhenChatModelThrows() {
        when(chatModel.call(anyString())).thenThrow(new RuntimeException("OpenAI API rate limit exceeded"));

        DocumentAiExtractionService service = new DocumentAiExtractionService(chatModel, objectMapper);

        String ocrText = """
                Revenue Department Karnataka
                Income Certificate
                RD0011223344
                Annual Income: Rs. 40,000
                Date of Issue: 01/01/2024
                """;

        ExtractedDocumentMetadata result = service.extractStructuredData(ocrText, "INCOME_CERTIFICATE");
        assertThat(result.documentType().value()).isEqualTo("INCOME_CERTIFICATE");
        assertThat(result.certificateNumber().value()).isEqualTo("RD0011223344");
        assertThat(result.annualIncome().value()).isEqualTo(40000.0);
        assertThat(result.officialVerificationClaimed()).isFalse();
    }
}
