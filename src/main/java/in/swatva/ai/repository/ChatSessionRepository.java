package in.swatva.ai.repository;

import in.swatva.ai.model.ChatSession;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatSessionRepository extends JpaRepository<ChatSession, UUID> {
    List<ChatSession> findByUserIdOrderByUpdatedAtDesc(UUID userId);
    Optional<ChatSession> findByIdAndUserId(UUID id, UUID userId);
}
