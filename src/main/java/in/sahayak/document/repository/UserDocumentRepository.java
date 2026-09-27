package in.sahayak.document.repository;

import in.sahayak.document.model.UserDocument;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserDocumentRepository extends JpaRepository<UserDocument, UUID> {
    List<UserDocument> findByUserId(UUID userId);

    List<UserDocument> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<UserDocument> findByIdAndUserId(UUID id, UUID userId);

    List<UserDocument> findByUserIdAndDocumentTypeId(UUID userId, UUID documentTypeId);
}
