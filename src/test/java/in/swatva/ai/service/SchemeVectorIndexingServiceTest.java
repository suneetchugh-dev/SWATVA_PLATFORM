package in.swatva.ai.service;

import in.swatva.ai.api.IndexResult;
import in.swatva.ai.model.SchemeDocumentChunk;
import in.swatva.ai.model.enums.ChunkDocumentType;
import in.swatva.ai.repository.SchemeDocumentChunkRepository;
import in.swatva.scheme.model.Scheme;
import in.swatva.scheme.model.enums.GovernmentLevel;
import in.swatva.scheme.repository.SchemeRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.vectorstore.VectorStore;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SchemeVectorIndexingServiceTest {

    @Mock
    private SchemeRepository schemeRepository;

    @Mock
    private SchemeChunkingService chunkingService;

    @Mock
    private SchemeDocumentChunkRepository chunkRepository;

    @Mock
    private VectorStore vectorStore;

    private SchemeVectorIndexingService indexingService;

    @BeforeEach
    void setUp() {
        indexingService = new SchemeVectorIndexingService(
                schemeRepository,
                chunkingService,
                chunkRepository,
                vectorStore
        );
    }

    @Test
    void indexAllSchemes_chunksAllSchemesAndAddsToVectorStore() {
        UUID schemeId = UUID.randomUUID();
        Scheme scheme = new Scheme();
        scheme.setId(schemeId);
        scheme.setName("PM-KISAN");
        scheme.setGovernmentLevel(GovernmentLevel.CENTRAL);
        scheme.setCategory("Agriculture");
        scheme.setOfficialSourceUrl("https://pmkisan.gov.in/");

        SchemeDocumentChunk chunk = new SchemeDocumentChunk();
        chunk.setId(UUID.randomUUID());
        chunk.setSchemeId(schemeId);
        chunk.setSchemeName("PM-KISAN");
        chunk.setDocumentType(ChunkDocumentType.BENEFITS.name());
        chunk.setContent("Income support of ₹6,000");
        chunk.setGovernmentLevel(GovernmentLevel.CENTRAL);
        chunk.setCategory("Agriculture");
        chunk.setSourceUrl("https://pmkisan.gov.in/");

        when(schemeRepository.findAll()).thenReturn(List.of(scheme));
        when(chunkingService.prepareChunks(scheme)).thenReturn(List.of(chunk));
        when(chunkRepository.saveAll(anyList())).thenReturn(List.of(chunk));

        IndexResult result = indexingService.indexAllSchemes();

        assertThat(result.schemesIndexed()).isEqualTo(1);
        assertThat(result.chunksIndexed()).isEqualTo(1);
        verify(chunkRepository).deleteBySchemeId(schemeId);
        verify(chunkRepository).saveAll(anyList());
        verify(vectorStore).add(anyList());
    }
}
