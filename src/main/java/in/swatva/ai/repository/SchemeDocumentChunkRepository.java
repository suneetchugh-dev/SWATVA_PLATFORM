package in.swatva.ai.repository;

import in.swatva.ai.model.SchemeDocumentChunk;
import in.swatva.scheme.model.enums.GovernmentLevel;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SchemeDocumentChunkRepository extends JpaRepository<SchemeDocumentChunk, UUID> {

    List<SchemeDocumentChunk> findBySchemeId(UUID schemeId);

    List<SchemeDocumentChunk> findByGovernmentLevel(GovernmentLevel governmentLevel);

    List<SchemeDocumentChunk> findByState(String state);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteBySchemeId(UUID schemeId);

    boolean existsBySchemeId(UUID schemeId);

    @Query("SELECT c FROM SchemeDocumentChunk c WHERE LOWER(c.content) LIKE LOWER(CONCAT('%', :term, '%')) OR LOWER(c.schemeName) LIKE LOWER(CONCAT('%', :term, '%'))")
    List<SchemeDocumentChunk> searchByKeyword(@Param("term") String term);
}
