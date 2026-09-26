package in.sahayak.scheme.repository;

import in.sahayak.scheme.model.SchemeEligibilityRule;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
public interface SchemeEligibilityRuleRepository extends JpaRepository<SchemeEligibilityRule, UUID> { List<SchemeEligibilityRule> findBySchemeId(UUID schemeId); }
