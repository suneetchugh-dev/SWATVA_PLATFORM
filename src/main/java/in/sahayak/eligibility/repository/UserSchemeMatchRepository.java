package in.sahayak.eligibility.repository;

import in.sahayak.eligibility.model.UserSchemeMatch;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
public interface UserSchemeMatchRepository extends JpaRepository<UserSchemeMatch, UUID> { List<UserSchemeMatch> findByUserId(UUID userId); }
