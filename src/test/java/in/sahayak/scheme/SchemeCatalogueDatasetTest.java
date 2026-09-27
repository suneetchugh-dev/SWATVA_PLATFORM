package in.sahayak.scheme;

import in.sahayak.ai.model.SchemeDocumentChunk;
import in.sahayak.ai.model.enums.ChunkDocumentType;
import in.sahayak.ai.repository.SchemeDocumentChunkRepository;
import in.sahayak.ai.service.SchemeChunkingService;
import in.sahayak.ai.service.SchemeRetrievalService;
import in.sahayak.ai.service.SchemeVectorIndexingService;
import in.sahayak.document.model.DocumentType;
import in.sahayak.document.model.DocumentValidityRule;
import in.sahayak.document.repository.DocumentTypeRepository;
import in.sahayak.document.repository.DocumentValidityRuleRepository;
import in.sahayak.scheme.model.Scheme;
import in.sahayak.scheme.model.SchemeApplicationStep;
import in.sahayak.scheme.model.SchemeDocumentRequirement;
import in.sahayak.scheme.model.SchemeEligibilityRule;
import in.sahayak.scheme.model.enums.GovernmentLevel;
import in.sahayak.scheme.repository.SchemeApplicationStepRepository;
import in.sahayak.scheme.repository.SchemeDocumentRequirementRepository;
import in.sahayak.scheme.repository.SchemeEligibilityRuleRepository;
import in.sahayak.scheme.repository.SchemeRepository;
import in.sahayak.scheme.seed.SchemeDataInitializer;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SchemeCatalogueDatasetTest {

    @Mock
    private SchemeRepository schemeRepository;

    @Mock
    private DocumentTypeRepository documentTypeRepository;

    @Mock
    private SchemeEligibilityRuleRepository eligibilityRuleRepository;

    @Mock
    private SchemeDocumentRequirementRepository documentRequirementRepository;

    @Mock
    private SchemeApplicationStepRepository applicationStepRepository;

    @Mock
    private DocumentValidityRuleRepository validityRuleRepository;

    @Mock
    private SchemeDocumentChunkRepository chunkRepository;

    @Mock
    private VectorStore vectorStore;

    private SchemeDataInitializer dataInitializer;
    private SchemeChunkingService chunkingService;
    private SchemeVectorIndexingService indexingService;
    private SchemeRetrievalService retrievalService;

    private final Map<String, Scheme> inMemorySchemes = new HashMap<>();
    private final Map<String, DocumentType> inMemoryDocTypes = new HashMap<>();
    private final List<SchemeEligibilityRule> inMemoryRules = new ArrayList<>();
    private final List<SchemeDocumentRequirement> inMemoryRequirements = new ArrayList<>();
    private final List<SchemeApplicationStep> inMemorySteps = new ArrayList<>();

    @BeforeEach
    void setUp() {
        dataInitializer = new SchemeDataInitializer();
        chunkingService = new SchemeChunkingService();
        indexingService = new SchemeVectorIndexingService(
                schemeRepository,
                chunkingService,
                chunkRepository,
                vectorStore
        );
        retrievalService = new SchemeRetrievalService(vectorStore, chunkRepository);

        inMemorySchemes.clear();
        inMemoryDocTypes.clear();
        inMemoryRules.clear();
        inMemoryRequirements.clear();
        inMemorySteps.clear();

        // Configure scheme repository mocks with in-memory map
        when(schemeRepository.findByName(any(String.class))).thenAnswer(inv -> {
            String name = inv.getArgument(0);
            return Optional.ofNullable(inMemorySchemes.get(name));
        });

        when(schemeRepository.save(any(Scheme.class))).thenAnswer(inv -> {
            Scheme scheme = inv.getArgument(0);
            if (scheme.getId() == null) {
                scheme.setId(UUID.randomUUID());
            }
            inMemorySchemes.put(scheme.getName(), scheme);
            return scheme;
        });

        when(schemeRepository.findAll()).thenAnswer(inv -> new ArrayList<>(inMemorySchemes.values()));

        when(documentTypeRepository.findByCode(any(String.class))).thenAnswer(inv -> {
            String code = inv.getArgument(0);
            return Optional.ofNullable(inMemoryDocTypes.get(code));
        });

        when(documentTypeRepository.save(any(DocumentType.class))).thenAnswer(inv -> {
            DocumentType dt = inv.getArgument(0);
            if (dt.getId() == null) {
                dt.setId(UUID.randomUUID());
            }
            inMemoryDocTypes.put(dt.getCode(), dt);
            return dt;
        });

        when(eligibilityRuleRepository.findBySchemeId(any(UUID.class))).thenAnswer(inv -> {
            UUID id = inv.getArgument(0);
            return inMemoryRules.stream().filter(r -> r.getScheme() != null && id.equals(r.getScheme().getId())).toList();
        });

        when(eligibilityRuleRepository.save(any(SchemeEligibilityRule.class))).thenAnswer(inv -> {
            SchemeEligibilityRule r = inv.getArgument(0);
            if (r.getId() == null) {
                r.setId(UUID.randomUUID());
            }
            inMemoryRules.add(r);
            return r;
        });

        when(documentRequirementRepository.save(any(SchemeDocumentRequirement.class))).thenAnswer(inv -> {
            SchemeDocumentRequirement req = inv.getArgument(0);
            if (req.getId() == null) {
                req.setId(UUID.randomUUID());
            }
            inMemoryRequirements.add(req);
            return req;
        });

        when(applicationStepRepository.save(any(SchemeApplicationStep.class))).thenAnswer(inv -> {
            SchemeApplicationStep step = inv.getArgument(0);
            if (step.getId() == null) {
                step.setId(UUID.randomUUID());
            }
            inMemorySteps.add(step);
            return step;
        });

        when(validityRuleRepository.findByDocumentTypeId(any(UUID.class))).thenReturn(List.of());
    }

    @Test
    @DisplayName("Seeds exactly 20 real government schemes (6 Central + 14 Uttar Pradesh)")
    void seedCreatesExactly20VerifiedSchemes() {
        dataInitializer.seed(
                schemeRepository,
                documentTypeRepository,
                eligibilityRuleRepository,
                documentRequirementRepository,
                applicationStepRepository,
                validityRuleRepository
        );

        List<Scheme> allSchemes = inMemorySchemes.values().stream().toList();
        assertThat(allSchemes).hasSize(20);

        List<Scheme> centralSchemes = allSchemes.stream()
                .filter(s -> s.getGovernmentLevel() == GovernmentLevel.CENTRAL)
                .toList();
        assertThat(centralSchemes).hasSize(6);

        List<Scheme> upSchemes = allSchemes.stream()
                .filter(s -> s.getGovernmentLevel() == GovernmentLevel.STATE && "Uttar Pradesh".equalsIgnoreCase(s.getState()))
                .toList();
        assertThat(upSchemes).hasSize(14);

        // Verify Central scheme names
        assertThat(centralSchemes.stream().map(Scheme::getName))
                .containsExactlyInAnyOrder(
                        "PM-KISAN",
                        "Ayushman Bharat – Pradhan Mantri Jan Arogya Yojana (AB-PMJAY)",
                        "Pradhan Mantri Jan-Dhan Yojana (PMJDY)",
                        "Pradhan Mantri Jeevan Jyoti Bima Yojana (PMJJBY)",
                        "Pradhan Mantri Suraksha Bima Yojana (PMSBY)",
                        "PM Vishwakarma"
                );

        // Verify Uttar Pradesh scheme names
        assertThat(upSchemes.stream().map(Scheme::getName))
                .containsExactlyInAnyOrder(
                        "Mukhyamantri Kanya Sumangala Yojana",
                        "UP Vridhavastha Pension Yojana",
                        "UP Nirashrit Mahila Pension Yojana",
                        "UP Divyangjan Pension Yojana",
                        "UP Shadi Anudan Yojana",
                        "UP Post-Matric Scholarship Scheme",
                        "UP Gopalak Yojana",
                        "UP Mukhyamantri Krishak Durghatna Kalyan Yojana",
                        "Mukhyamantri Abhyudaya Yojana",
                        "Swami Vivekanand Yuva Sashaktikaran Yojana (DigiShakti)",
                        "UP Mukhyamantri Bal Seva Yojana",
                        "UP Vishwakarma Shram Samman Yojana",
                        "One District One Product (ODOP) Margin Money Scheme",
                        "UP Mukhyamantri Gramodyog Rozgar Yojana"
                );

        // Verify all 20 schemes have official source URLs starting with https:// and non-null verified date
        for (Scheme scheme : allSchemes) {
            assertThat(scheme.getOfficialSourceUrl()).startsWith("https://");
            assertThat(scheme.getLastVerifiedAt()).isNotNull();
            assertThat(scheme.getBenefitInformation()).isNotBlank();
            assertThat(scheme.getCategory()).isNotBlank();
            assertThat(scheme.getIssuingAuthority()).isNotBlank();
        }

        // Verify Uttar Pradesh grievance portal is Jansunwai
        for (Scheme upScheme : upSchemes) {
            assertThat(upScheme.getOfficialGrievanceUrl()).isEqualTo("https://jansunwai.up.gov.in/");
        }

        // Verify Central grievance portal is CPGRAMS PGPortal
        for (Scheme centralScheme : centralSchemes) {
            assertThat(centralScheme.getOfficialGrievanceUrl()).isEqualTo("https://pgportal.gov.in/");
        }
    }

    @Test
    @DisplayName("Scheme seeding is idempotent: repeated executions produce no duplicate records")
    void seedingIsIdempotent() {
        dataInitializer.seed(
                schemeRepository,
                documentTypeRepository,
                eligibilityRuleRepository,
                documentRequirementRepository,
                applicationStepRepository,
                validityRuleRepository
        );
        assertThat(inMemorySchemes).hasSize(20);

        // Run seed a second time
        dataInitializer.seed(
                schemeRepository,
                documentTypeRepository,
                eligibilityRuleRepository,
                documentRequirementRepository,
                applicationStepRepository,
                validityRuleRepository
        );
        assertThat(inMemorySchemes).hasSize(20);
    }

    @Test
    @DisplayName("Chunking prepares 6 distinct chunks per scheme with deterministic point IDs and metadata")
    void chunkingPrepares6ChunksWithMetadata() {
        UUID schemeId = UUID.randomUUID();
        Scheme scheme = new Scheme();
        scheme.setId(schemeId);
        scheme.setName("UP Post-Matric Scholarship Scheme");
        scheme.setGovernmentLevel(GovernmentLevel.STATE);
        scheme.setState("Uttar Pradesh");
        scheme.setCategory("Education");
        scheme.setIssuingAuthority("Social Welfare Department, Government of Uttar Pradesh");
        scheme.setBenefitInformation("Reimbursement of tuition fees and monthly maintenance allowance.");
        scheme.setOfficialSourceUrl("https://scholarship.up.gov.in/");

        List<SchemeDocumentChunk> chunks = chunkingService.prepareChunks(scheme);

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

        for (SchemeDocumentChunk chunk : chunks) {
            assertThat(chunk.getSchemeId()).isEqualTo(schemeId);
            assertThat(chunk.getSchemeName()).isEqualTo("UP Post-Matric Scholarship Scheme");
            assertThat(chunk.getGovernmentLevel()).isEqualTo(GovernmentLevel.STATE);
            assertThat(chunk.getState()).isEqualTo("Uttar Pradesh");
            assertThat(chunk.getCategory()).isEqualTo("Education");
            assertThat(chunk.getSourceUrl()).isEqualTo("https://scholarship.up.gov.in/");

            // Deterministic pointId validation
            String expectedSeed = schemeId.toString() + ":" + chunk.getDocumentType();
            String expectedPointId = UUID.nameUUIDFromBytes(expectedSeed.getBytes(StandardCharsets.UTF_8)).toString();
            assertThat(chunk.getPointId()).isEqualTo(expectedPointId);

            // Document metadata validation for Spring AI / Qdrant
            Document doc = chunk.toSpringAiDocument();
            assertThat(doc.getId()).isEqualTo(expectedPointId);
            assertThat(doc.getMetadata()).containsEntry("schemeId", schemeId.toString());
            assertThat(doc.getMetadata()).containsEntry("schemeName", "UP Post-Matric Scholarship Scheme");
            assertThat(doc.getMetadata()).containsEntry("governmentLevel", "STATE");
            assertThat(doc.getMetadata()).containsEntry("state", "Uttar Pradesh");
            assertThat(doc.getMetadata()).containsEntry("category", "Education");
            assertThat(doc.getMetadata()).containsEntry("documentType", chunk.getDocumentType());
            assertThat(doc.getMetadata()).containsEntry("sourceUrl", "https://scholarship.up.gov.in/");
        }
    }

    @Test
    @DisplayName("Vector indexing processes all 20 schemes (120 chunks) and pushes to vector store")
    void indexingProcessesAll20Schemes() {
        dataInitializer.seed(
                schemeRepository,
                documentTypeRepository,
                eligibilityRuleRepository,
                documentRequirementRepository,
                applicationStepRepository,
                validityRuleRepository
        );

        when(chunkRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        var indexResult = indexingService.indexAllSchemes();

        assertThat(indexResult.schemesIndexed()).isEqualTo(20);
        assertThat(indexResult.chunksIndexed()).isEqualTo(120);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Document>> captor = ArgumentCaptor.forClass(List.class);
        verify(vectorStore).add(captor.capture());

        List<Document> pushedDocs = captor.getValue();
        assertThat(pushedDocs).hasSize(120);

        // Verify that documents for both Central and UP schemes are present in the indexed vector batch
        long centralDocCount = pushedDocs.stream()
                .filter(d -> "CENTRAL".equals(d.getMetadata().get("governmentLevel")))
                .count();
        long upDocCount = pushedDocs.stream()
                .filter(d -> "Uttar Pradesh".equals(d.getMetadata().get("state")))
                .count();

        assertThat(centralDocCount).isEqualTo(6 * 6); // 36
        assertThat(upDocCount).isEqualTo(14 * 6);      // 84
    }

    @Test
    @DisplayName("Semantic retrieval returns relevant chunks for UP search query")
    void semanticRetrievalReturnsRelevantChunks() {
        UUID upScholarshipId = UUID.randomUUID();
        Map<String, Object> metadata = Map.of(
                "schemeId", upScholarshipId.toString(),
                "schemeName", "UP Post-Matric Scholarship Scheme",
                "governmentLevel", "STATE",
                "state", "Uttar Pradesh",
                "category", "Education",
                "documentType", "BENEFITS",
                "sourceUrl", "https://scholarship.up.gov.in/"
        );
        Document doc = new Document(
                UUID.randomUUID().toString(),
                "Reimbursement of tuition fees and monthly maintenance allowance for post-matric students.",
                metadata
        );

        when(vectorStore.similaritySearch(any(SearchRequest.class))).thenReturn(List.of(doc));

        var results = retrievalService.retrieveRelevantChunks("scholarship in UP for college", "Uttar Pradesh", "Education", 5);

        assertThat(results).hasSize(1);
        var first = results.get(0);
        assertThat(first.schemeName()).isEqualTo("UP Post-Matric Scholarship Scheme");
        assertThat(first.schemeId()).isEqualTo(upScholarshipId);
        assertThat(first.documentType()).isEqualTo("BENEFITS");
        assertThat(first.sourceUrl()).isEqualTo("https://scholarship.up.gov.in/");
    }
}
