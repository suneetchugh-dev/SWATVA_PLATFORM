package in.swatva.scheme.repository;

import in.swatva.scheme.model.SchemeApplicationStep;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
public interface SchemeApplicationStepRepository extends JpaRepository<SchemeApplicationStep, UUID> { List<SchemeApplicationStep> findBySchemeIdOrderByStepNumber(UUID schemeId); }
