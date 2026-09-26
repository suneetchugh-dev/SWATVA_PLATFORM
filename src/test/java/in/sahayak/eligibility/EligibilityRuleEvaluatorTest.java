package in.sahayak.eligibility;

import static org.assertj.core.api.Assertions.assertThat;

import in.sahayak.scheme.model.SchemeEligibilityRule;
import in.sahayak.user.model.UserProfile;
import in.sahayak.user.model.enums.Gender;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class EligibilityRuleEvaluatorTest {
    private final EligibilityRuleEvaluator evaluator = new EligibilityRuleEvaluator();

    @Test
    void evaluatesSupportedRulesAgainstSuppliedProfileData() {
        UserProfile profile = new UserProfile();
        profile.setAge(28);
        profile.setAnnualIncome(new BigDecimal("250000"));
        profile.setState("Karnataka");
        profile.setGender(Gender.FEMALE);

        EligibilityRuleEvaluator.Evaluation result = evaluator.evaluate(List.of(
                rule("MIN_AGE", "18"), rule("MAX_AGE", "35"), rule("MAX_INCOME", "300000"),
                rule("STATE", "Karnataka"), rule("GENDER", "FEMALE|OTHER")), profile);

        assertThat(result.count(EligibilityRuleEvaluator.Outcome.SATISFIED)).isEqualTo(5);
        assertThat(result.count(EligibilityRuleEvaluator.Outcome.FAILED)).isZero();
        assertThat(result.count(EligibilityRuleEvaluator.Outcome.MISSING)).isZero();
    }

    @Test
    void treatsAbsentFieldsAsMissingAndKnownMismatchesAsFailures() {
        UserProfile profile = new UserProfile();
        profile.setAge(16);

        EligibilityRuleEvaluator.Evaluation result = evaluator.evaluate(List.of(
                rule("MIN_AGE", "18"), rule("MAX_INCOME", "300000"), rule("STATE", "Karnataka")), profile);

        assertThat(result.messages(EligibilityRuleEvaluator.Outcome.FAILED)).containsExactly("Minimum age of 18 not satisfied");
        assertThat(result.messages(EligibilityRuleEvaluator.Outcome.MISSING))
                .containsExactly("Income is missing (maximum income 300000)", "State information is missing");
    }

    @Test
    void ignoresNonDeterministicReferenceRules() {
        UserProfile profile = new UserProfile();
        EligibilityRuleEvaluator.Evaluation result = evaluator.evaluate(List.of(rule("OFFICIAL_CRITERIA", "https://example.gov.in")), profile);
        assertThat(result.total()).isZero();
    }

    @Test
    void evaluatesAllNineSupportedRuleTypesSuccessfully() {
        UserProfile profile = new UserProfile();
        profile.setAge(30);
        profile.setAnnualIncome(new BigDecimal("150000"));
        profile.setState("Karnataka");
        profile.setOccupation("Farmer");
        profile.setEducation("Graduate");
        profile.setCategory(in.sahayak.user.model.enums.SocialCategory.OBC);
        profile.setGender(Gender.MALE);
        profile.setDisabilityStatus(in.sahayak.user.model.enums.DisabilityStatus.NONE);

        List<SchemeEligibilityRule> rules = List.of(
                rule("MIN_AGE", "21"),
                rule("MAX_AGE", "60"),
                rule("MAX_INCOME", "200000"),
                rule("STATE", "Karnataka"),
                rule("OCCUPATION", "FARMER"),
                rule("EDUCATION", "GRADUATE"),
                rule("CATEGORY", "OBC|SC|ST"),
                rule("GENDER", "MALE|OTHER"),
                rule("DISABILITY_STATUS", "NONE")
        );

        EligibilityRuleEvaluator.Evaluation result = evaluator.evaluate(rules, profile);
        assertThat(result.count(EligibilityRuleEvaluator.Outcome.SATISFIED)).isEqualTo(9);
        assertThat(result.count(EligibilityRuleEvaluator.Outcome.FAILED)).isZero();
        assertThat(result.count(EligibilityRuleEvaluator.Outcome.MISSING)).isZero();
    }

    @Test
    void treatsUndisclosedGenderAndDisabilityAsMissingInformation() {
        UserProfile profile = new UserProfile();
        profile.setGender(Gender.PREFER_NOT_TO_SAY);
        profile.setDisabilityStatus(in.sahayak.user.model.enums.DisabilityStatus.NOT_DISCLOSED);

        List<SchemeEligibilityRule> rules = List.of(
                rule("GENDER", "FEMALE|OTHER"),
                rule("DISABILITY_STATUS", "PERSON_WITH_DISABILITY")
        );

        EligibilityRuleEvaluator.Evaluation result = evaluator.evaluate(rules, profile);
        assertThat(result.count(EligibilityRuleEvaluator.Outcome.FAILED)).isZero();
        assertThat(result.count(EligibilityRuleEvaluator.Outcome.MISSING)).isEqualTo(2);
        assertThat(result.messages(EligibilityRuleEvaluator.Outcome.MISSING))
                .containsExactly("Gender information is missing", "Disability status information is missing");
    }

    @Test
    void handlesNullProfileGracefullyWithoutThrowing() {
        List<SchemeEligibilityRule> rules = List.of(
                rule("MIN_AGE", "18"),
                rule("MAX_INCOME", "250000"),
                rule("STATE", "Karnataka"),
                rule("OCCUPATION", "FARMER"),
                rule("EDUCATION", "GRADUATE"),
                rule("CATEGORY", "SC"),
                rule("GENDER", "FEMALE"),
                rule("DISABILITY_STATUS", "PERSON_WITH_DISABILITY")
        );

        EligibilityRuleEvaluator.Evaluation result = evaluator.evaluate(rules, null);
        assertThat(result.total()).isEqualTo(8);
        assertThat(result.count(EligibilityRuleEvaluator.Outcome.MISSING)).isEqualTo(8);
        assertThat(result.count(EligibilityRuleEvaluator.Outcome.FAILED)).isZero();
        assertThat(result.count(EligibilityRuleEvaluator.Outcome.SATISFIED)).isZero();
    }

    @Test
    void resolvesAgeFromUserDateOfBirthWhenAgeNotSetOnProfile() {
        in.sahayak.user.model.User user = new in.sahayak.user.model.User();
        user.setDateOfBirth(java.time.LocalDate.now().minusYears(25));

        UserProfile profile = new UserProfile();
        profile.setUser(user);
        profile.setAge(null);

        List<SchemeEligibilityRule> rules = List.of(
                rule("MIN_AGE", "18"),
                rule("MAX_AGE", "30")
        );

        EligibilityRuleEvaluator.Evaluation result = evaluator.evaluate(rules, profile);
        assertThat(result.count(EligibilityRuleEvaluator.Outcome.SATISFIED)).isEqualTo(2);
        assertThat(result.count(EligibilityRuleEvaluator.Outcome.FAILED)).isZero();
    }

    @Test
    void matchesOccupationAndEducationTokens() {
        UserProfile profile = new UserProfile();
        profile.setOccupation("Self-Employed Small Farmer");
        profile.setEducation("Post Graduate in Science");

        List<SchemeEligibilityRule> rules = List.of(
                rule("OCCUPATION", "FARMER"),
                rule("EDUCATION", "GRADUATE")
        );

        EligibilityRuleEvaluator.Evaluation result = evaluator.evaluate(rules, profile);
        assertThat(result.count(EligibilityRuleEvaluator.Outcome.SATISFIED)).isEqualTo(2);
        assertThat(result.count(EligibilityRuleEvaluator.Outcome.FAILED)).isZero();
    }

    @Test
    void handlesDisabilityAliasesAndResilientNumberFormatting() {
        UserProfile profile = new UserProfile();
        profile.setDisabilityStatus(in.sahayak.user.model.enums.DisabilityStatus.PERSON_WITH_DISABILITY);
        profile.setAnnualIncome(new BigDecimal("200000"));
        profile.setAge(22);

        List<SchemeEligibilityRule> rules = List.of(
                rule("DISABILITY_STATUS", "PWD"),
                rule("MAX_INCOME", " 3,00,000 "),
                rule("MIN_AGE", " 18 ")
        );

        EligibilityRuleEvaluator.Evaluation result = evaluator.evaluate(rules, profile);
        assertThat(result.count(EligibilityRuleEvaluator.Outcome.SATISFIED)).isEqualTo(3);
        assertThat(result.count(EligibilityRuleEvaluator.Outcome.FAILED)).isZero();
    }

    private SchemeEligibilityRule rule(String type, String value) {
        SchemeEligibilityRule rule = new SchemeEligibilityRule();
        rule.setRuleType(type);
        rule.setRuleValue(value);
        return rule;
    }
}
