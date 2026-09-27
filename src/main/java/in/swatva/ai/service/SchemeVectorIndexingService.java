package in.swatva.ai.service;

import in.swatva.ai.api.IndexResult;
import in.swatva.ai.config.QdrantProperties;
import in.swatva.ai.model.SchemeDocumentChunk;
import in.swatva.ai.repository.SchemeDocumentChunkRepository;
import in.swatva.scheme.model.Scheme;
import in.swatva.scheme.repository.SchemeRepository;
import io.qdrant.client.QdrantClient;
import io.qdrant.client.grpc.Collections;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
public class SchemeVectorIndexingService {

    private final SchemeRepository schemeRepository;
    private final SchemeChunkingService chunkingService;
    private final SchemeDocumentChunkRepository chunkRepository;
    private final VectorStore vectorStore;
    private final QdrantClient qdrantClient;
    private final EmbeddingModel embeddingModel;
    private final QdrantProperties qdrantProperties;

    public SchemeVectorIndexingService(SchemeRepository schemeRepository,
                                       SchemeChunkingService chunkingService,
                                       SchemeDocumentChunkRepository chunkRepository,
                                       VectorStore vectorStore) {
        this(schemeRepository, chunkingService, chunkRepository, vectorStore, null, null, null);
    }

    @Autowired
    public SchemeVectorIndexingService(SchemeRepository schemeRepository,
                                       SchemeChunkingService chunkingService,
                                       SchemeDocumentChunkRepository chunkRepository,
                                       VectorStore vectorStore,
                                       @Autowired(required = false) QdrantClient qdrantClient,
                                       @Autowired(required = false) EmbeddingModel embeddingModel,
                                       @Autowired(required = false) QdrantProperties qdrantProperties) {
        this.schemeRepository = schemeRepository;
        this.chunkingService = chunkingService;
        this.chunkRepository = chunkRepository;
        this.vectorStore = vectorStore;
        this.qdrantClient = qdrantClient;
        this.embeddingModel = embeddingModel;
        this.qdrantProperties = qdrantProperties;
    }

    public synchronized void ensureCollectionExists() {
        String collection = getCollectionName();
        int dimensions = getDimensions();

        // 1. Try QdrantClient (gRPC)
        if (qdrantClient != null) {
            try {
                Boolean exists = qdrantClient.collectionExistsAsync(collection).get(5, TimeUnit.SECONDS);
                if (Boolean.TRUE.equals(exists)) {
                    log.info("Qdrant collection '{}' already exists", collection);
                    return;
                }
                Collections.VectorParams vectorParams = Collections.VectorParams.newBuilder()
                        .setSize(dimensions)
                        .setDistance(Collections.Distance.Cosine)
                        .build();
                qdrantClient.createCollectionAsync(collection, vectorParams).get(10, TimeUnit.SECONDS);
                log.info("Automatically created Qdrant collection '{}' with dimension {} and Cosine distance",
                        collection, dimensions);
                return;
            } catch (Exception ex) {
                log.debug("QdrantClient collection check/create returned: {}, checking REST fallback", ex.getMessage());
            }
        }

        // 2. HTTP REST fallback on port 6333
        try {
            String host = (qdrantProperties != null && qdrantProperties.getHost() != null)
                    ? qdrantProperties.getHost() : "localhost";
            String url = "http://" + host + ":6333/collections/" + collection;
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest checkReq = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(3))
                    .GET()
                    .build();
            HttpResponse<String> checkResp = client.send(checkReq, HttpResponse.BodyHandlers.ofString());
            if (checkResp.statusCode() == 200) {
                log.info("Qdrant collection '{}' already exists (verified via REST)", collection);
                return;
            }

            String createJson = "{\"vectors\":{\"size\":" + dimensions + ",\"distance\":\"Cosine\"}}";
            HttpRequest createReq = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(5))
                    .PUT(HttpRequest.BodyPublishers.ofString(createJson))
                    .build();
            HttpResponse<String> createResp = client.send(createReq, HttpResponse.BodyHandlers.ofString());
            if (createResp.statusCode() == 200) {
                log.info("Automatically created Qdrant collection '{}' with dimension {} via REST", collection, dimensions);
            }
        } catch (Exception ex) {
            log.debug("REST collection check/create returned: {}", ex.getMessage());
        }
    }

    public long getVectorCount() {
        String collection = getCollectionName();
        if (qdrantClient != null) {
            try {
                Boolean exists = qdrantClient.collectionExistsAsync(collection).get(5, TimeUnit.SECONDS);
                if (Boolean.TRUE.equals(exists)) {
                    Long count = qdrantClient.countAsync(collection).get(5, TimeUnit.SECONDS);
                    return count != null ? count : 0L;
                }
            } catch (Exception ex) {
                log.debug("QdrantClient count check returned: {}", ex.getMessage());
            }
        }

        try {
            String host = (qdrantProperties != null && qdrantProperties.getHost() != null)
                    ? qdrantProperties.getHost() : "localhost";
            String url = "http://" + host + ":6333/collections/" + collection;
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(3))
                    .GET()
                    .build();
            HttpResponse<String> resp = client.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() == 200 && resp.body().contains("\"points_count\":")) {
                int idx = resp.body().indexOf("\"points_count\":");
                String sub = resp.body().substring(idx + 15).trim();
                int end = -1;
                for (int i = 0; i < sub.length(); i++) {
                    char c = sub.charAt(i);
                    if (!Character.isDigit(c)) {
                        end = i;
                        break;
                    }
                }
                if (end > 0) {
                    return Long.parseLong(sub.substring(0, end).trim());
                }
            }
        } catch (Exception ex) {
            log.debug("REST count check returned: {}", ex.getMessage());
        }
        return 0L;
    }

    @Transactional
    public IndexResult indexAllSchemes() {
        ensureCollectionExists();

        List<Scheme> schemes = schemeRepository.findAll();
        log.info("Total schemes found in PostgreSQL: {}", schemes.size());

        if (schemes.isEmpty()) {
            log.warn("No schemes found in PostgreSQL to index.");
            return new IndexResult(0, 0, "No schemes found in PostgreSQL.");
        }

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

        log.info("Total chunks created: {}", totalChunks);

        int totalVectorsStored = 0;
        try {
            if (!allDocumentsToIndex.isEmpty()) {
                vectorStore.add(allDocumentsToIndex);
                totalVectorsStored = allDocumentsToIndex.size();
            }
        } catch (Exception ex) {
            log.warn("Vector store update encountered an error (chunks remain persisted in database): {}",
                    ex.getMessage());
        }

        log.info("Total vectors stored: {}", totalVectorsStored);
        log.info("Indexing completed successfully: {} schemes, {} chunks, {} vectors stored in collection '{}'",
                schemes.size(), totalChunks, totalVectorsStored, getCollectionName());

        return new IndexResult(schemes.size(), totalChunks,
                "Indexed " + schemes.size() + " schemes with " + totalChunks + " document chunks (" + totalVectorsStored + " vectors stored).");
    }

    @Transactional
    public int indexScheme(Scheme scheme) {
        ensureCollectionExists();
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

    public String getCollectionName() {
        if (qdrantProperties != null && qdrantProperties.getCollectionName() != null && !qdrantProperties.getCollectionName().isBlank()) {
            return qdrantProperties.getCollectionName();
        }
        return "swatva_schemes";
    }

    public int getDimensions() {
        if (embeddingModel != null) {
            try {
                int dims = embeddingModel.dimensions();
                if (dims > 0) return dims;
            } catch (Exception ignored) {}
        }
        return 2048;
    }
}
