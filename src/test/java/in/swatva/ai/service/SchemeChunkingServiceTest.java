package in.swatva.ai.service;

import in.swatva.ai.model.SchemeDocumentChunk;
import in.swatva.ai.model.enums.ChunkDocumentType;
import in.swatva.document.model.DocumentType;
import in.swatva.scheme.model.Scheme;
import in.swatva.scheme.model.SchemeApplicationStep;
import in.swatva.scheme.model.SchemeDocumentRequirement;
import in.swatva.scheme.model.SchemeEligibilityRule;
import in.swatva.scheme.model.enums.GovernmentLevel;
import in.swatva.scheme.model.enums.SchemeStatus;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.document.Document;

import static org.assertj.core.api.Assertions.assertThat;

class SchemeChunkingServiceTest {

    private SchemeChunkingService chunkingService;
    private Scheme testScheme;

    @BeforeEach
    void setUp() {
        chunkingService = new SchemeChunkingService();

        testScheme = new Scheme();
        testScheme.setId(UUID.randomUUID());
        testScheme.setName("PM-KISAN");
        testScheme.setGovernmentLevel(GovernmentLevel.CENTRAL);
        testScheme.setCategory("Agriculture");
        testScheme.setIssuingAuthority("Ministry of Agriculture");
        testScheme.setBenefitInformation("₹6,000 per year in 3 instalments.");
        testScheme.setOfficialSourceUrl("https://pmkisan.gov.in/");
        testScheme.setRawSchemeTextReference("PM-KISAN Operational Guidelines 2026");
        testScheme.setStatus(SchemeStatus.ACTIVE);
        testScheme.setEligibilityData(Map.of(
                "criteria", "Landholding farmer families with cultivable land.",
                "seedNote", "Confirmed by official central portal."
        ));

        SchemeEligibilityRule rule = new SchemeEligibilityRule();
        rule.setRuleType("OCCUPATION");
        rule.setRuleValue("FARMER");
        rule.setRuleDescription("Applicant must be a farmer.");
        testScheme.getEligibilityRules().add(rule);

        DocumentType docType = new DocumentType();
        docType.setCode("AADHAAR");
        docType.setName("Aadhaar Card");

        SchemeDocumentRequirement req = new SchemeDocumentRequirement();
        req.setDocumentType(docType);
        req.setRequired(true);
        req.setNotes("Required for identity verification");
        testScheme.getDocumentRequirements().add(req);

        SchemeApplicationStep step = new SchemeApplicationStep();
        step.setStepNumber(1);
        step.setTitle("New Farmer Registration");
        step.setInstructions("Visit the official portal and submit Aadhaar.");
        step.setOfficialUrl("https://pmkisan.gov.in/registration");
        testScheme.getApplicationSteps().add(step);
    }

    @Test
    void prepareChunks_generatesAllSixRequiredChunks() {
        List<SchemeDocumentChunk> chunks = chunkingService.prepareChunks(testScheme);

        assertThat(chunks).hasSize(6);

        List<String> types = chunks.stream().map(SchemeDocumentChunk::getDocumentType).toList();
        assertThat(types).containsExactlyInAnyOrder(
                ChunkDocumentType.ELIGIBILITY_EXPLANATION.name(),
                ChunkDocumentType.BENEFITS.name(),
                ChunkDocumentType.REQUIRED_DOCUMENTS.name(),
                ChunkDocumentType.APPLICATION_PROCESS.name(),
                ChunkDocumentType.IMPORTANT_CONDITIONS.name(),
                ChunkDocumentType.FAQS_OR_RAW_TEXT.name()
        );
    }

    @Test
    void prepareChunks_populatesMetadataCorrectly() {
        List<SchemeDocumentChunk> chunks = chunkingService.prepareChunks(testScheme);

        for (SchemeDocumentChunk chunk : chunks) {
            assertThat(chunk.getSchemeId()).isEqualTo(testScheme.getId());
            assertThat(chunk.getSchemeName()).isEqualTo("PM-KISAN");
            assertThat(chunk.getGovernmentLevel()).isEqualTo(GovernmentLevel.CENTRAL);
            assertThat(chunk.getCategory()).isEqualTo("Agriculture");
            assertThat(chunk.getSourceUrl()).isEqualTo("https://pmkisan.gov.in/");
            assertThat(chunk.getContent()).isNotBlank();
        }
    }

    @Test
    void toSpringAiDocument_mapsRequiredMetadata() {
        List<SchemeDocumentChunk> chunks = chunkingService.prepareChunks(testScheme);
        SchemeDocumentChunk chunk = chunks.getFirst();

        Document aiDoc = chunk.toSpringAiDocument();

        assertThat(aiDoc.getText()).isEqualTo(chunk.getContent());
        assertThat(aiDoc.getMetadata())
                .containsEntry("schemeId", testScheme.getId().toString())
                .containsEntry("schemeName", "PM-KISAN")
                .containsEntry("governmentLevel", "CENTRAL")
                .containsEntry("category", "Agriculture")
                .containsEntry("documentType", chunk.getDocumentType())
                .containsEntry("sourceUrl", "https://pmkisan.gov.in/");
    }
}
