package in.swatva.document.service.ocr;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class DocumentOcrServiceTest {

    private DocumentOcrService ocrService;

    @BeforeEach
    void setUp() {
        ocrService = new DocumentOcrService();
    }

    @Test
    void extractTextFromPdfExtractsContentSuccessfully() throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage();
            document.addPage(page);
            try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
                contentStream.beginText();
                contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                contentStream.newLineAtOffset(50, 700);
                contentStream.showText("GOVERNMENT OF KARNATAKA");
                contentStream.newLineAtOffset(0, -20);
                contentStream.showText("Income Certificate RD00382910291");
                contentStream.endText();
            }
            document.save(baos);
        }

        byte[] pdfBytes = baos.toByteArray();
        String extracted = ocrService.extractText(pdfBytes, "application/pdf", "income_cert.pdf");

        assertThat(extracted).contains("GOVERNMENT OF KARNATAKA");
        assertThat(extracted).contains("Income Certificate RD00382910291");
    }

    @Test
    void extractTextFromPlainText() {
        String text = "Revenue Department Government of Karnataka\nAnnual Income: Rs. 65000";
        byte[] bytes = text.getBytes(StandardCharsets.UTF_8);

        String extracted = ocrService.extractText(bytes, "text/plain", "details.txt");
        assertThat(extracted).contains("Annual Income: Rs. 65000");
    }

    @Test
    void extractTextReturnsEmptyOnNullOrEmptyInput() {
        assertThat(ocrService.extractText(null, "application/pdf", "doc.pdf")).isEmpty();
        assertThat(ocrService.extractText(new byte[0], "application/pdf", "doc.pdf")).isEmpty();
    }

    @Test
    void extractTextReturnsEmptyOnCorruptedPdfWithoutThrowing() {
        byte[] corrupted = "not a valid pdf content".getBytes(StandardCharsets.UTF_8);
        String extracted = ocrService.extractText(corrupted, "application/pdf", "corrupted.pdf");
        assertThat(extracted).isEmpty();
    }
}
