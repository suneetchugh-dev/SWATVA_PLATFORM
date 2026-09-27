package in.swatva.scheme.repository;

import in.swatva.scheme.model.Scheme;
import in.swatva.scheme.model.enums.GovernmentLevel;
import in.swatva.scheme.model.enums.SchemeStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SchemeRepository extends JpaRepository<Scheme, UUID> {
    List<Scheme> findByStatus(SchemeStatus status);
    List<Scheme> findByGovernmentLevelAndState(GovernmentLevel governmentLevel, String state);
    List<Scheme> findByGovernmentLevel(GovernmentLevel governmentLevel);
    List<Scheme> findByGovernmentLevelAndStateIgnoreCase(GovernmentLevel governmentLevel, String state);
    Optional<Scheme> findByName(String name);
}
