package in.sahayak.ai.seed;

import in.sahayak.ai.repository.SchemeDocumentChunkRepository;
import in.sahayak.ai.service.SchemeVectorIndexingService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

@Configuration
public class SchemeChunkDataInitializer {

    @Bean
    @Order(200)
    CommandLineRunner chunkSeedRunner(SchemeVectorIndexingService indexingService,
                                      SchemeDocumentChunkRepository chunkRepository) {
        return args -> {
            if (chunkRepository.count() == 0) {
                indexingService.indexAllSchemes();
            }
        };
    }
}
