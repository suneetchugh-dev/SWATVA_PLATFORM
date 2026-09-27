package in.swatva.document.repository;

import in.swatva.document.model.DocumentValidityRule;
import in.swatva.scheme.model.Scheme;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentValidityRuleRepository extends JpaRepository<DocumentValidityRule, UUID> {

    List<DocumentValidityRule> findByDocumentTypeId(UUID documentTypeId);

    List<DocumentValidityRule> findByDocumentTypeIdAndActiveTrue(UUID documentTypeId);

    List<DocumentValidityRule> findByDocumentTypeCodeIgnoreCaseAndActiveTrue(String code);

    List<DocumentValidityRule> findByDocumentTypeIdAndScheme(UUID documentTypeId, Scheme scheme);

    List<DocumentValidityRule> findByDocumentTypeIdAndScheme_Id(UUID documentTypeId, UUID schemeId);

    List<DocumentValidityRule> findByDocumentTypeIdAndStateIgnoreCase(UUID documentTypeId, String state);
}
