package in.sahayak.scheme;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import in.sahayak.common.exception.ResourceNotFoundException;
import in.sahayak.document.model.DocumentType;
import in.sahayak.eligibility.EligibilityRuleEvaluator;
import in.sahayak.scheme.api.ActionChecklist;
import in.sahayak.scheme.model.Scheme;
import in.sahayak.scheme.model.SchemeApplicationStep;
import in.sahayak.scheme.model.SchemeDocumentRequirement;
import in.sahayak.scheme.model.SchemeEligibilityRule;
import in.sahayak.scheme.model.enums.GovernmentLevel;
import in.sahayak.scheme.model.enums.SchemeStatus;
import in.sahayak.scheme.repository.SchemeRepository;
import in.sahayak.user.model.User;
import in.sahayak.user.model.UserProfile;
import in.sahayak.user.repository.UserProfileRepository;
import in.sahayak.user.repository.UserRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ChecklistServiceTest {
    private SchemeRepository schemes;
    private UserRepository users;
    private UserProfileRepository profiles;
    private EligibilityRuleEvaluator evaluator;
    private ChecklistService checklistService;

    @BeforeEach
    void setUp() {
        schemes = mock(SchemeRepository.class);
        users = mock(UserRepository.class);
        profiles = mock(UserProfileRepository.class);
        evaluator = new EligibilityRuleEvaluator();
        checklistService = new ChecklistService(schemes, users, profiles, evaluator);
    }

    @Test
    void throwsWhenSchemeNotFound() {
        UUID nonExistentId = UUID.randomUUID();
        when(schemes.findById(nonExistentId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> checklistService.getChecklist(nonExistentId, null))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Scheme not found");
    }

    @Test
    void generatesCompleteStructuredChecklistFromDatabaseData() {
        UUID schemeId = UUID.randomUUID();
        Scheme scheme = new Scheme();
        scheme.setId(schemeId);
        scheme.setName("PM-KISAN");
        scheme.setGovernmentLevel(GovernmentLevel.CENTRAL);
        scheme.setIssuingAuthority("Ministry of Agriculture");
        scheme.setOfficialSourceUrl("https://pmkisan.gov.in/");
        scheme.setStatus(SchemeStatus.ACTIVE);

        // Document Requirement
        DocumentType docType = new DocumentType();
        docType.setCode("AADHAAR");
        docType.setName("Aadhaar card");

        SchemeDocumentRequirement docReq = new SchemeDocumentRequirement();
        docReq.setDocumentType(docType);
        docReq.setRequired(true);
        docReq.setNotes("Identity proof required");
        scheme.setDocumentRequirements(List.of(docReq));

        // Application Step
        SchemeApplicationStep step = new SchemeApplicationStep();
        step.setStepNumber(1);
        step.setTitle("Register online");
        step.setInstructions("Visit the PM-KISAN portal and fill the form");
        step.setOfficialUrl("https://pmkisan.gov.in/registration");
        scheme.setApplicationSteps(List.of(step));

        // Rules
        SchemeEligibilityRule rule1 = new SchemeEligibilityRule();
        rule1.setRuleType("MIN_AGE");
        rule1.setRuleValue("18");
        rule1.setRuleDescription("Applicant must be at least 18 years old.");

        SchemeEligibilityRule rule2 = new SchemeEligibilityRule();
        rule2.setRuleType("OCCUPATION");
        rule2.setRuleValue("FARMER");
        rule2.setRuleDescription("Applicant must be a farmer.");
        scheme.setEligibilityRules(List.of(rule1, rule2));

        when(schemes.findById(schemeId)).thenReturn(Optional.of(scheme));

        // Authenticated user with missing occupation
        String email = "farmer@example.com";
        User user = new User();
        user.setEmail(email);
        UUID userId = UUID.randomUUID();
        user.setId(userId);

        UserProfile profile = new UserProfile();
        profile.setUser(user);
        profile.setAge(25);
        profile.setOccupation(null); // missing occupation

        when(users.findByEmail(email)).thenReturn(Optional.of(user));
        when(profiles.findByUserId(userId)).thenReturn(Optional.of(profile));

        ActionChecklist checklist = checklistService.getChecklist(schemeId, email);

        assertThat(checklist.schemeId()).isEqualTo(schemeId);
        assertThat(checklist.schemeName()).isEqualTo("PM-KISAN");
        assertThat(checklist.whereToApply()).isEqualTo("Ministry of Agriculture");
        assertThat(checklist.officialApplicationUrl()).isEqualTo("https://pmkisan.gov.in/");

        // 1. Required Documents
        assertThat(checklist.requiredDocuments()).hasSize(1);
        assertThat(checklist.requiredDocuments().get(0).code()).isEqualTo("AADHAAR");
        assertThat(checklist.requiredDocuments().get(0).name()).isEqualTo("Aadhaar card");
        assertThat(checklist.requiredDocuments().get(0).required()).isTrue();

        // 2. Application Steps
        assertThat(checklist.applicationSteps()).hasSize(1);
        assertThat(checklist.applicationSteps().get(0).stepNumber()).isEqualTo(1);
        assertThat(checklist.applicationSteps().get(0).title()).isEqualTo("Register online");
        assertThat(checklist.applicationSteps().get(0).instructions()).isEqualTo("Visit the PM-KISAN portal and fill the form");

        // 3. Important Conditions
        assertThat(checklist.importantConditions()).containsExactly(
                "Applicant must be at least 18 years old.",
                "Applicant must be a farmer."
        );

        // 4. Missing User Information
        assertThat(checklist.missingUserInformation()).containsExactly("Occupation information is missing");
    }

    @Test
    void generatesChecklistForUnauthenticatedUser() {
        UUID schemeId = UUID.randomUUID();
        Scheme scheme = new Scheme();
        scheme.setId(schemeId);
        scheme.setName("Gruha Jyothi");
        scheme.setIssuingAuthority("Energy Department, Government of Karnataka");
        scheme.setOfficialSourceUrl("https://karnataka.gov.in/");

        SchemeEligibilityRule rule = new SchemeEligibilityRule();
        rule.setRuleType("STATE");
        rule.setRuleValue("Karnataka");
        rule.setRuleDescription("Must be resident of Karnataka");
        scheme.setEligibilityRules(List.of(rule));

        when(schemes.findById(schemeId)).thenReturn(Optional.of(scheme));

        ActionChecklist checklist = checklistService.getChecklist(schemeId, null);

        assertThat(checklist.schemeName()).isEqualTo("Gruha Jyothi");
        assertThat(checklist.importantConditions()).containsExactly("Must be resident of Karnataka");
        assertThat(checklist.missingUserInformation()).containsExactly("State information is missing");
    }
}
