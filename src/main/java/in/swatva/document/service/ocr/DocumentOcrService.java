package in.swatva.document.service.ocr;

import java.nio.charset.StandardCharsets;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class DocumentOcrService implements OcrService {

    private static final Logger log = LoggerFactory.getLogger(DocumentOcrService.class);

    @Override
    public String extractText(byte[] documentBytes, String contentType, String filename) {
        return extractText(documentBytes, contentType, filename, null);
    }

    @Override
    public String extractText(byte[] documentBytes, String contentType, String filename, String password) {
        if (documentBytes == null || documentBytes.length == 0) {
            log.debug("Empty document bytes provided for text extraction");
            return "";
        }

        String type = (contentType != null) ? contentType.toLowerCase() : "";
        String name = (filename != null) ? filename.toLowerCase() : "";

        // 1. PDF Document Extraction via Apache PDFBox (supports encrypted PDFs)
        if (type.contains("pdf") || name.endsWith(".pdf")) {
            return extractTextFromPdf(documentBytes, password);
        }

        // 2. Plain Text / CSV / JSON Extraction
        if (type.contains("text") || type.contains("csv") || type.contains("json")
                || name.endsWith(".txt") || name.endsWith(".csv") || name.endsWith(".json")) {
            return new String(documentBytes, StandardCharsets.UTF_8).trim();
        }

        // 3. Fallback for image / other formats
        log.info("Processing non-PDF/non-text media (type={}, filename={}) for OCR text extraction", type, name);
        String asText = new String(documentBytes, StandardCharsets.UTF_8);
        if (isPrintableAscii(asText)) {
            return asText.trim();
        }

        return "";
    }

    private String extractTextFromPdf(byte[] pdfBytes, String password) {
        // If an explicit password was supplied, try decrypting with it first
        if (password != null && !password.isBlank()) {
            try (PDDocument document = Loader.loadPDF(pdfBytes, password.trim())) {
                PDFTextStripper stripper = new PDFTextStripper();
                String text = stripper.getText(document);
                if (text != null && !text.isBlank()) {
                    log.info("Successfully decrypted and extracted text from password-protected PDF");
                    return text.trim();
                }
            } catch (Exception e) {
                log.warn("Failed to decrypt PDF with provided password: {}", e.getMessage());
            }
        }

        // Standard load without password
        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(document);
            return (text != null) ? text.trim() : "";
        } catch (org.apache.pdfbox.pdmodel.encryption.InvalidPasswordException e) {
            log.warn("PDF is encrypted/password protected and requires valid password for decryption: {}", e.getMessage());
            return "";
        } catch (Exception e) {
            log.warn("Failed to extract text from PDF: {}", e.getMessage());
            return "";
        }
    }

    private boolean isPrintableAscii(String text) {
        if (text == null || text.isBlank() || text.length() < 10) {
            return false;
        }
        int printable = 0;
        int checkLen = Math.min(text.length(), 200);
        for (int i = 0; i < checkLen; i++) {
            char c = text.charAt(i);
            if ((c >= 32 && c <= 126) || c == '\n' || c == '\r' || c == '\t') {
                printable++;
            }
        }
        return ((double) printable / checkLen) > 0.85;
    }
}
