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
}
