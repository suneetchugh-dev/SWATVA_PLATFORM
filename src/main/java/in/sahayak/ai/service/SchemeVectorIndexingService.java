package in.sahayak.ai.service;

import in.sahayak.ai.api.IndexResult;
import in.sahayak.ai.model.SchemeDocumentChunk;
import in.sahayak.ai.repository.SchemeDocumentChunkRepository;
import in.sahayak.scheme.model.Scheme;
import in.sahayak.scheme.repository.SchemeRepository;
import java.util.ArrayList;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
public class SchemeVectorIndexingService {

    private final SchemeRepository schemeRepository;
    private final SchemeChunkingService chunkingService;
    private final SchemeDocumentChunkRepository chunkRepository;
    private final VectorStore vectorStore;

    public SchemeVectorIndexingService(SchemeRepository schemeRepository,
                                       SchemeChunkingService chunkingService,
                                       SchemeDocumentChunkRepository chunkRepository,
                                       VectorStore vectorStore) {
        this.schemeRepository = schemeRepository;
        this.chunkingService = chunkingService;
        this.chunkRepository = chunkRepository;
        this.vectorStore = vectorStore;
    }

    @Transactional
    public IndexResult indexAllSchemes() {
        List<Scheme> schemes = schemeRepository.findAll();
        List<Document> allDocumentsToIndex = new ArrayList<>();
        int totalChunks = 0;

        for (Scheme scheme : schemes) {
            chunkRepository.deleteBySchemeId(scheme.getId());
            List<SchemeDocumentChunk> chunks = chunkingService.prepareChunks(scheme);
            List<SchemeDocumentChunk> savedChunks = chunkRepository.saveAll(chunks);
            totalChunks += savedChunks.size();

            for (SchemeDocumentChunk chunk : savedChunks) {
                allDocumentsToIndex.add(chunk.toSpringAiDocument());
            }
        }

        try {
            if (!allDocumentsToIndex.isEmpty()) {
                vectorStore.add(allDocumentsToIndex);
                log.info("Successfully pushed {} chunks into vector store across {} schemes",
                        allDocumentsToIndex.size(), schemes.size());
            }
        } catch (Exception ex) {
            log.warn("Vector store update encountered an error (chunks remain persisted in database): {}",
                    ex.getMessage());
        }

        return new IndexResult(schemes.size(), totalChunks,
                "Indexed " + schemes.size() + " schemes with " + totalChunks + " document chunks.");
    }

    @Transactional
    public int indexScheme(Scheme scheme) {
        chunkRepository.deleteBySchemeId(scheme.getId());
        List<SchemeDocumentChunk> chunks = chunkingService.prepareChunks(scheme);
        List<SchemeDocumentChunk> savedChunks = chunkRepository.saveAll(chunks);

        List<Document> documents = savedChunks.stream()
                .map(SchemeDocumentChunk::toSpringAiDocument)
                .toList();

        try {
            vectorStore.add(documents);
            log.info("Pushed {} chunks to vector store for scheme: {}", documents.size(), scheme.getName());
        } catch (Exception ex) {
            log.warn("Vector store update encountered an error for scheme {}: {}", scheme.getName(), ex.getMessage());
        }

        return savedChunks.size();
    }
}
