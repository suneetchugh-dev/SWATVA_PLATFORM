package in.swatva.document.repository;

import in.swatva.document.model.DocumentType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
public interface DocumentTypeRepository extends JpaRepository<DocumentType, UUID> { Optional<DocumentType> findByCode(String code); }
