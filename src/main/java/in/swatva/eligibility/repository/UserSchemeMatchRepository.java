package in.swatva.eligibility.repository;

import in.swatva.eligibility.model.UserSchemeMatch;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
public interface UserSchemeMatchRepository extends JpaRepository<UserSchemeMatch, UUID> { List<UserSchemeMatch> findByUserId(UUID userId); }
