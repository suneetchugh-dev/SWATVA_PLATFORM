package in.sahayak.ai.service;

import in.sahayak.ai.api.RetrievedChunkDto;
import in.sahayak.ai.model.SchemeDocumentChunk;
import in.sahayak.ai.model.enums.ChunkDocumentType;
import in.sahayak.ai.repository.SchemeDocumentChunkRepository;
import in.sahayak.scheme.model.enums.GovernmentLevel;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SchemeRetrievalServiceTest {

    @Mock
    private VectorStore vectorStore;

    @Mock
    private SchemeDocumentChunkRepository chunkRepository;

    private SchemeRetrievalService retrievalService;

    @BeforeEach
    void setUp() {
        retrievalService = new SchemeRetrievalService(vectorStore, chunkRepository);
    }

    @Test
    void retrieveRelevantChunks_returnsVectorStoreResultsWhenAvailable() {
        UUID schemeId = UUID.randomUUID();
        Document doc = new Document("chunk-1", "Income support for farmers", Map.of(
                "schemeId", schemeId.toString(),
                "schemeName", "PM-KISAN",
                "documentType", "BENEFITS",
                "sourceUrl", "https://pmkisan.gov.in/",
                "score", 0.95
        ));

        when(vectorStore.similaritySearch(any(SearchRequest.class))).thenReturn(List.of(doc));

        List<RetrievedChunkDto> chunks = retrievalService.retrieveRelevantChunks("farmer support", null, null, 5);

        assertThat(chunks).hasSize(1);
        RetrievedChunkDto chunk = chunks.getFirst();
        assertThat(chunk.schemeId()).isEqualTo(schemeId);
        assertThat(chunk.schemeName()).isEqualTo("PM-KISAN");
        assertThat(chunk.content()).isEqualTo("Income support for farmers");
        assertThat(chunk.sourceUrl()).isEqualTo("https://pmkisan.gov.in/");
    }

    @Test
    void retrieveRelevantChunks_fallsBackToDatabaseWhenVectorStoreReturnsEmpty() {
        UUID schemeId = UUID.randomUUID();
        SchemeDocumentChunk dbChunk = new SchemeDocumentChunk();
        dbChunk.setId(UUID.randomUUID());
        dbChunk.setSchemeId(schemeId);
        dbChunk.setSchemeName("PM-KISAN");
        dbChunk.setDocumentType(ChunkDocumentType.BENEFITS.name());
        dbChunk.setContent("Direct income support of ₹6,000 for farmers.");
        dbChunk.setGovernmentLevel(GovernmentLevel.CENTRAL);
        dbChunk.setSourceUrl("https://pmkisan.gov.in/");

        when(vectorStore.similaritySearch(any(SearchRequest.class))).thenReturn(List.of());
        when(chunkRepository.searchByKeyword("farmer")).thenReturn(List.of(dbChunk));

        List<RetrievedChunkDto> chunks = retrievalService.retrieveRelevantChunks("farmer benefits", null, null, 5);

        assertThat(chunks).hasSize(1);
        assertThat(chunks.getFirst().schemeName()).isEqualTo("PM-KISAN");
        assertThat(chunks.getFirst().content()).contains("Direct income support");
    }

    @Test
    void retrieveChunksForScheme_returnsAllChunksFromRepository() {
        UUID schemeId = UUID.randomUUID();
        SchemeDocumentChunk dbChunk = new SchemeDocumentChunk();
        dbChunk.setId(UUID.randomUUID());
        dbChunk.setSchemeId(schemeId);
        dbChunk.setSchemeName("Gruha Jyothi");
        dbChunk.setDocumentType(ChunkDocumentType.BENEFITS.name());
        dbChunk.setContent("Up to 200 units free electricity");
        dbChunk.setGovernmentLevel(GovernmentLevel.STATE);
        dbChunk.setState("Karnataka");

        when(chunkRepository.findBySchemeId(schemeId)).thenReturn(List.of(dbChunk));

        List<RetrievedChunkDto> chunks = retrievalService.retrieveChunksForScheme(schemeId);

        assertThat(chunks).hasSize(1);
        assertThat(chunks.getFirst().schemeName()).isEqualTo("Gruha Jyothi");
        verify(chunkRepository).findBySchemeId(schemeId);
    }
}
