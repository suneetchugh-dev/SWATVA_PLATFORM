package in.swatva.document.service.ocr;

public interface OcrService {

    /**
     * Extracts text content from raw document bytes.
     *
     * @param documentBytes raw file bytes
     * @param contentType MIME type (e.g. application/pdf, text/plain, image/png)
     * @param filename original filename
     * @return extracted text string, or empty string if no text could be extracted
     */
    String extractText(byte[] documentBytes, String contentType, String filename);

    /**
     * Extracts text content from raw document bytes with an optional password for encrypted documents (e.g. e-Aadhaar).
     *
     * @param documentBytes raw file bytes
     * @param contentType MIME type (e.g. application/pdf, text/plain, image/png)
     * @param filename original filename
     * @param password optional ephemeral decryption password
     * @return extracted text string, or empty string if decryption fails or no text could be extracted
     */
    default String extractText(byte[] documentBytes, String contentType, String filename, String password) {
        return extractText(documentBytes, contentType, filename);
    }
}
