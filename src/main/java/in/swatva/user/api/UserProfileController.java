package in.swatva.user.api;

import in.swatva.common.api.ApiResponse;
import in.swatva.user.UserProfileService;
import in.swatva.user.model.FamilyMember;
import in.swatva.user.model.User;
import in.swatva.user.model.UserProfile;
import in.swatva.user.model.enums.DisabilityStatus;
import in.swatva.user.model.enums.FamilyRelationship;
import in.swatva.user.model.enums.Gender;
import in.swatva.user.model.enums.SocialCategory;
import in.swatva.user.repository.FamilyMemberRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users/me")
public class UserProfileController {
    private final UserProfileService profiles;
    private final FamilyMemberRepository familyMembers;

    public UserProfileController(UserProfileService profiles, FamilyMemberRepository familyMembers) {
        this.profiles = profiles;
        this.familyMembers = familyMembers;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<CurrentUserResponse>> me(Authentication authentication) {
        User user = profiles.loadUser(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(CurrentUserResponse.from(user, profiles.loadProfile(user.getEmail()), familyMembers)));
    }

    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<CurrentUserResponse>> updateProfile(Authentication authentication,
                                                                            @Valid @RequestBody ProfileUpdateRequest request) {
        User user = profiles.loadUser(authentication.getName());
        UserProfile profile = profiles.updateProfile(user.getEmail(), request);
        return ResponseEntity.ok(ApiResponse.success(CurrentUserResponse.from(user, profile, familyMembers)));
    }

    /** All fields are optional. A non-null familyMembers list replaces the stored list; omission keeps it unchanged. */
    public record ProfileUpdateRequest(
            @Min(0) @Max(130) Integer age,
            @DecimalMin(value = "0.00", inclusive = true) BigDecimal income,
            @Size(max = 100) String state,
            @Size(max = 100) String district,
            @Size(max = 120) String occupation,
            @Size(max = 120) String education,
            SocialCategory category,
            Gender gender,
            DisabilityStatus disabilityStatus,
            List<@Valid FamilyMemberRequest> familyMembers) { }

    public record FamilyMemberRequest(
            @NotBlank @Size(max = 100) String fullName,
            @NotNull FamilyRelationship relationship,
            @Min(0) @Max(130) Integer age,
            Gender gender,
            @DecimalMin(value = "0.00", inclusive = true) BigDecimal annualIncome,
            @Size(max = 120) String occupation) { }

    public record CurrentUserResponse(String email, String fullName, boolean active, ProfileResponse profile) {
        static CurrentUserResponse from(User user, UserProfile profile, FamilyMemberRepository familyMembers) {
            return new CurrentUserResponse(user.getEmail(), user.getFullName(), user.isActive(),
                    profile == null ? null : ProfileResponse.from(profile, familyMembers.findByProfileId(profile.getId())));
        }
    }

    public record ProfileResponse(Integer age, BigDecimal income, String state, String district, String occupation,
                                  String education, SocialCategory category, Gender gender, DisabilityStatus disabilityStatus,
                                  Integer householdSize, List<FamilyMemberResponse> familyMembers) {
        static ProfileResponse from(UserProfile profile, List<FamilyMember> family) {
            return new ProfileResponse(profile.getAge(), profile.getAnnualIncome(), profile.getState(), profile.getDistrict(),
                    profile.getOccupation(), profile.getEducation(), profile.getCategory(), profile.getGender(), profile.getDisabilityStatus(),
                    profile.getHouseholdSize(), family.stream().map(FamilyMemberResponse::from).toList());
        }
    }

    public record FamilyMemberResponse(String fullName, FamilyRelationship relationship, Integer age, Gender gender,
                                       BigDecimal annualIncome, String occupation) {
        static FamilyMemberResponse from(FamilyMember member) {
            return new FamilyMemberResponse(member.getFullName(), member.getRelationship(), member.getAge(), member.getGender(),
                    member.getAnnualIncome(), member.getOccupation());
        }
    }
}
