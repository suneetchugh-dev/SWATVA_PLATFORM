package in.swatva.ai.seed;

import in.swatva.ai.repository.SchemeDocumentChunkRepository;
import in.swatva.ai.service.SchemeVectorIndexingService;
import in.swatva.scheme.repository.SchemeRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

@Slf4j
@Configuration
public class SchemeChunkDataInitializer {

    @Bean
    @Order(200)
    CommandLineRunner chunkSeedRunner(SchemeVectorIndexingService indexingService,
                                      SchemeDocumentChunkRepository chunkRepository,
                                      SchemeRepository schemeRepository) {
        return args -> {
            long schemeCount = schemeRepository.count();
            long chunkCount = chunkRepository.count();
            long qdrantPoints = indexingService.getVectorCount();
            long expectedChunks = schemeCount * 6;

            log.info("Evaluating scheme chunk/vector state: {} schemes in DB, {} chunks in DB, {} vectors in Qdrant (expected chunks: {})",
                    schemeCount, chunkCount, qdrantPoints, expectedChunks);

            if (schemeCount > 0 && (chunkCount == 0 || chunkCount < expectedChunks || qdrantPoints < expectedChunks)) {
                log.info("Initiating scheme chunking and vector indexing for {} schemes...", schemeCount);
                indexingService.indexAllSchemes();
            } else {
                log.info("Scheme vectors and chunks are already up-to-date ({} schemes, {} vectors)",
                        schemeCount, qdrantPoints);
            }
        };
    }
}
