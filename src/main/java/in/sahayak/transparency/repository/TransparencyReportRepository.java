package in.sahayak.transparency.repository;

import in.sahayak.transparency.model.TransparencyReport;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TransparencyReportRepository extends JpaRepository<TransparencyReport, UUID> {

    List<TransparencyReport> findByStateIgnoreCase(String state);

    List<TransparencyReport> findByDistrictIgnoreCase(String district);

    List<TransparencyReport> findByDepartmentIgnoreCase(String department);

    List<TransparencyReport> findByStateIgnoreCaseAndDistrictIgnoreCase(String state, String district);
}
