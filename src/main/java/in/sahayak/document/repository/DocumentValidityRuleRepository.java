package in.sahayak.document.repository;

import in.sahayak.document.model.DocumentValidityRule;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
public interface DocumentValidityRuleRepository extends JpaRepository<DocumentValidityRule, UUID> { List<DocumentValidityRule> findByDocumentTypeId(UUID documentTypeId); }
