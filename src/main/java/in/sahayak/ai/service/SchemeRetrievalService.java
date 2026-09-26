package in.sahayak.ai.service;

import in.sahayak.ai.api.RetrievedChunkDto;
import in.sahayak.ai.model.SchemeDocumentChunk;
import in.sahayak.ai.repository.SchemeDocumentChunkRepository;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class SchemeRetrievalService {

    private final VectorStore vectorStore;
    private final SchemeDocumentChunkRepository chunkRepository;

    public SchemeRetrievalService(VectorStore vectorStore, SchemeDocumentChunkRepository chunkRepository) {
        this.vectorStore = vectorStore;
        this.chunkRepository = chunkRepository;
    }

    public List<RetrievedChunkDto> retrieveRelevantChunks(String query, String state, String category, int topK) {
        List<RetrievedChunkDto> results = new ArrayList<>();

        try {
            SearchRequest request = SearchRequest.builder()
                    .query(query)
                    .topK(Math.max(topK, 4))
                    .build();
            List<Document> vectorDocs = vectorStore.similaritySearch(request);
            if (vectorDocs != null && !vectorDocs.isEmpty()) {
                for (Document doc : vectorDocs) {
                    RetrievedChunkDto dto = mapDocumentToDto(doc);
                    results.add(dto);
                }
            }
        } catch (Exception ex) {
            log.warn("Vector search failed or not available ({}), falling back to database retrieval: {}",
                    ex.getClass().getSimpleName(), ex.getMessage());
        }

        // Fallback or augment from database chunks if vector search yielded nothing
        if (results.isEmpty()) {
            results = fallbackKeywordSearch(query, state, category, topK);
        }

        return results.stream()
                .limit(topK > 0 ? topK : 6)
                .toList();
    }

    public List<RetrievedChunkDto> retrieveChunksForScheme(UUID schemeId) {
        List<SchemeDocumentChunk> dbChunks = chunkRepository.findBySchemeId(schemeId);
        return dbChunks.stream()
                .map(this::mapChunkToDto)
                .toList();
    }

    private RetrievedChunkDto mapDocumentToDto(Document doc) {
        Map<String, Object> metadata = doc.getMetadata();
        UUID schemeId = null;
        if (metadata.get("schemeId") != null) {
            try {
                schemeId = UUID.fromString(metadata.get("schemeId").toString());
            } catch (Exception ignored) {}
        }
        String schemeName = metadata.getOrDefault("schemeName", "Unknown Scheme").toString();
        String docType = metadata.getOrDefault("documentType", "GENERAL").toString();
        String sourceUrl = metadata.getOrDefault("sourceUrl", "").toString();
        Double score = null;
        if (metadata.get("distance") instanceof Number num) {
            score = num.doubleValue();
        } else if (metadata.get("score") instanceof Number num) {
            score = num.doubleValue();
        }

        UUID chunkId = null;
        if (doc.getId() != null) {
            try {
                chunkId = UUID.fromString(doc.getId());
            } catch (Exception ignored) {}
        }

        return new RetrievedChunkDto(
                chunkId,
                schemeId,
                schemeName,
                docType,
                doc.getText(),
                sourceUrl,
                score
        );
    }

    private RetrievedChunkDto mapChunkToDto(SchemeDocumentChunk chunk) {
        return new RetrievedChunkDto(
                chunk.getId(),
                chunk.getSchemeId(),
                chunk.getSchemeName(),
                chunk.getDocumentType(),
                chunk.getContent(),
                chunk.getSourceUrl(),
                1.0
        );
    }

    private List<RetrievedChunkDto> fallbackKeywordSearch(String query, String state, String category, int topK) {
        Set<UUID> seenIds = new HashSet<>();
        List<RetrievedChunkDto> matches = new ArrayList<>();

        String[] tokens = query.toLowerCase().split("\\s+");
        for (String token : tokens) {
            String trimmed = token.replaceAll("[^a-zA-Z0-9]", "");
            if (trimmed.length() < 3) continue;

            List<SchemeDocumentChunk> chunks = chunkRepository.searchByKeyword(trimmed);
            for (SchemeDocumentChunk chunk : chunks) {
                if (state != null && !state.isBlank() && chunk.getState() != null
                        && !chunk.getState().equalsIgnoreCase(state.trim())) {
                    continue;
                }
                if (seenIds.add(chunk.getId())) {
                    matches.add(mapChunkToDto(chunk));
                }
            }
        }

        return matches.stream()
                .limit(topK > 0 ? topK : 6)
                .toList();
    }
}
