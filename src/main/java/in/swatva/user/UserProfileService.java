package in.swatva.user;

import in.swatva.common.exception.ResourceNotFoundException;
import in.swatva.user.api.UserProfileController.FamilyMemberRequest;
import in.swatva.user.api.UserProfileController.ProfileUpdateRequest;
import in.swatva.user.model.FamilyMember;
import in.swatva.user.model.User;
import in.swatva.user.model.UserProfile;
import in.swatva.user.repository.FamilyMemberRepository;
import in.swatva.user.repository.UserProfileRepository;
import in.swatva.user.repository.UserRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserProfileService {
    private final UserRepository users;
    private final UserProfileRepository profiles;
    private final FamilyMemberRepository familyMembers;

    public UserProfileService(UserRepository users, UserProfileRepository profiles, FamilyMemberRepository familyMembers) {
        this.users = users;
        this.profiles = profiles;
        this.familyMembers = familyMembers;
    }

    @Transactional(readOnly = true)
    public UserProfile loadProfile(String email) {
        User user = user(email);
        return profiles.findByUserId(user.getId()).orElse(null);
    }

    @Transactional(readOnly = true)
    public User loadUser(String email) {
        return user(email);
    }

    @Transactional
    public UserProfile updateProfile(String email, ProfileUpdateRequest request) {
        User user = user(email);
        UserProfile profile = profiles.findByUserId(user.getId()).orElseGet(() -> {
            UserProfile created = new UserProfile();
            created.setUser(user);
            return profiles.save(created);
        });
        if (request.age() != null) profile.setAge(request.age());
        if (request.income() != null) profile.setAnnualIncome(request.income());
        if (request.state() != null) profile.setState(request.state().trim());
        if (request.district() != null) profile.setDistrict(request.district().trim());
        if (request.occupation() != null) profile.setOccupation(request.occupation().trim());
        if (request.education() != null) profile.setEducation(request.education().trim());
        if (request.category() != null) profile.setCategory(request.category());
        if (request.gender() != null) profile.setGender(request.gender());
        if (request.disabilityStatus() != null) profile.setDisabilityStatus(request.disabilityStatus());
        if (request.familyMembers() != null) replaceFamilyMembers(profile, request.familyMembers());
        return profiles.save(profile);
    }

    private void replaceFamilyMembers(UserProfile profile, List<FamilyMemberRequest> requestedMembers) {
        familyMembers.deleteByProfileId(profile.getId());
        requestedMembers.forEach(request -> {
            FamilyMember member = new FamilyMember();
            member.setProfile(profile);
            member.setFullName(request.fullName().trim());
            member.setRelationship(request.relationship());
            member.setAge(request.age());
            member.setGender(request.gender());
            member.setAnnualIncome(request.annualIncome());
            member.setOccupation(trimOrNull(request.occupation()));
            familyMembers.save(member);
        });
        profile.setHouseholdSize(requestedMembers.size() + 1);
    }

    private User user(String email) {
        return users.findByEmail(email).orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private String trimOrNull(String value) { return value == null ? null : value.trim(); }
}
