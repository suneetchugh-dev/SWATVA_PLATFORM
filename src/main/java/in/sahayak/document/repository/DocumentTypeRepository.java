package in.sahayak.document.repository;

import in.sahayak.document.model.DocumentType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
public interface DocumentTypeRepository extends JpaRepository<DocumentType, UUID> { Optional<DocumentType> findByCode(String code); }
