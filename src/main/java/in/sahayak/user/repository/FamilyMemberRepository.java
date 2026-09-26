package in.sahayak.user.repository;

import in.sahayak.user.model.FamilyMember;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

public interface FamilyMemberRepository extends JpaRepository<FamilyMember, UUID> {
    List<FamilyMember> findByProfileId(UUID profileId);

    @Transactional
    long deleteByProfileId(UUID profileId);
}
