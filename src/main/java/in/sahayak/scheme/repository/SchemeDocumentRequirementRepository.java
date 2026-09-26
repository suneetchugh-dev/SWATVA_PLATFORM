package in.sahayak.scheme.repository;

import in.sahayak.scheme.model.SchemeDocumentRequirement;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
public interface SchemeDocumentRequirementRepository extends JpaRepository<SchemeDocumentRequirement, UUID> { List<SchemeDocumentRequirement> findBySchemeId(UUID schemeId); }
