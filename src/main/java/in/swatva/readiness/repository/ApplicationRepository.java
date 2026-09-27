package in.swatva.readiness.repository;

import in.swatva.readiness.model.Application;
import in.swatva.readiness.model.enums.ApplicationStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ApplicationRepository extends JpaRepository<Application, UUID> { List<Application> findByUserId(UUID userId); List<Application> findByStatus(ApplicationStatus status); }
