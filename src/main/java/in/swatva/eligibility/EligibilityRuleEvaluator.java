package in.swatva.eligibility;

import in.swatva.scheme.model.SchemeEligibilityRule;
import in.swatva.user.model.UserProfile;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/** Deterministic evaluator for the structured SchemeEligibilityRule types stored in PostgreSQL. */
@Component
public class EligibilityRuleEvaluator {
    private static final Set<String> SUPPORTED_TYPES = Set.of(
            "MIN_AGE", "MAX_AGE", "MAX_INCOME", "STATE", "OCCUPATION", "EDUCATION", "CATEGORY", "GENDER", "DISABILITY_STATUS");

    public Evaluation evaluate(List<SchemeEligibilityRule> rules, UserProfile profile) {
        if (rules == null || rules.isEmpty()) {
            return new Evaluation(List.of());
        }
        List<Condition> conditions = rules.stream()
                .filter(rule -> rule != null && rule.getRuleType() != null && SUPPORTED_TYPES.contains(rule.getRuleType().trim().toUpperCase(Locale.ROOT)))
                .map(rule -> evaluate(rule, profile))
                .toList();
        return new Evaluation(conditions);
    }

    private Condition evaluate(SchemeEligibilityRule rule, UserProfile profile) {
        String type = rule.getRuleType().trim().toUpperCase(Locale.ROOT);
        return switch (type) {
            case "MIN_AGE" -> compareMinimumAge(rule, profile);
            case "MAX_AGE" -> compareMaximumAge(rule, profile);
            case "MAX_INCOME" -> compareMaximumIncome(rule, profile);
            case "STATE" -> compareText("State", profile == null ? null : profile.getState(), rule.getRuleValue());
            case "OCCUPATION" -> compareOccupation(rule, profile);
            case "EDUCATION" -> compareEducation(rule, profile);
            case "CATEGORY" -> compareCategory(rule, profile);
            case "GENDER" -> compareGender(rule, profile);
            case "DISABILITY_STATUS" -> compareDisabilityStatus(rule, profile);
            default -> throw new IllegalStateException("Unsupported rule type: " + type);
        };
    }

    private Condition compareMinimumAge(SchemeEligibilityRule rule, UserProfile profile) {
        Integer age = resolveAge(profile);
        int required = parseInteger(rule.getRuleValue(), 0);
        if (age == null) return missing("Age is missing (minimum age " + required + ")");
        return age >= required ? satisfied("Minimum age of " + required + " satisfied") : failed("Minimum age of " + required + " not satisfied");
    }

    private Condition compareMaximumAge(SchemeEligibilityRule rule, UserProfile profile) {
        Integer age = resolveAge(profile);
        int maximum = parseInteger(rule.getRuleValue(), Integer.MAX_VALUE);
        if (age == null) return missing("Age is missing (maximum age " + maximum + ")");
        return age <= maximum ? satisfied("Maximum age of " + maximum + " satisfied") : failed("Maximum age of " + maximum + " not satisfied");
    }

    private Condition compareMaximumIncome(SchemeEligibilityRule rule, UserProfile profile) {
        BigDecimal income = profile == null ? null : profile.getAnnualIncome();
        BigDecimal maximum = parseBigDecimal(rule.getRuleValue());
        if (maximum == null) return satisfied("Maximum income requirement satisfied");
        if (income == null) return missing("Income is missing (maximum income " + maximum.toPlainString() + ")");
        return income.compareTo(maximum) <= 0 ? satisfied("Maximum income requirement satisfied") : failed("Maximum income requirement not satisfied");
    }

    private Condition compareCategory(SchemeEligibilityRule rule, UserProfile profile) {
        if (profile == null || profile.getCategory() == null) {
            return missing("Category information is missing");
        }
        return compareText("Category", profile.getCategory().name(), rule.getRuleValue());
    }

    private Condition compareGender(SchemeEligibilityRule rule, UserProfile profile) {
        if (profile == null || profile.getGender() == null || profile.getGender() == in.swatva.user.model.enums.Gender.PREFER_NOT_TO_SAY) {
            return missing("Gender information is missing");
        }
        return compareText("Gender", profile.getGender().name(), rule.getRuleValue());
    }

    private Condition compareDisabilityStatus(SchemeEligibilityRule rule, UserProfile profile) {
        if (profile == null || profile.getDisabilityStatus() == null || profile.getDisabilityStatus() == in.swatva.user.model.enums.DisabilityStatus.NOT_DISCLOSED) {
            return missing("Disability status information is missing");
        }
        Set<String> expected = splitValues(rule.getRuleValue());
        if (expected.isEmpty() || expected.contains("ALL") || expected.contains("ANY") || expected.contains("*")) {
            return satisfied("Disability status requirement satisfied");
        }
        boolean requiresDisability = expected.contains("PERSON_WITH_DISABILITY") || expected.contains("YES") || expected.contains("TRUE") || expected.contains("PWD");
        boolean requiresNoDisability = expected.contains("NONE") || expected.contains("NO") || expected.contains("FALSE");

        if (profile.getDisabilityStatus() == in.swatva.user.model.enums.DisabilityStatus.PERSON_WITH_DISABILITY) {
            return (requiresDisability || expected.contains(profile.getDisabilityStatus().name()))
                    ? satisfied("Disability status requirement satisfied")
                    : failed("Disability status requirement not satisfied");
        } else if (profile.getDisabilityStatus() == in.swatva.user.model.enums.DisabilityStatus.NONE) {
            return (requiresNoDisability || expected.contains(profile.getDisabilityStatus().name()))
                    ? satisfied("Disability status requirement satisfied")
                    : failed("Disability status requirement not satisfied");
        }
        return compareText("Disability status", profile.getDisabilityStatus().name(), rule.getRuleValue());
    }

    private Condition compareOccupation(SchemeEligibilityRule rule, UserProfile profile) {
        String actual = profile == null ? null : profile.getOccupation();
        return compareTokenOrExact("Occupation", actual, rule.getRuleValue());
    }

    private Condition compareEducation(SchemeEligibilityRule rule, UserProfile profile) {
        String actual = profile == null ? null : profile.getEducation();
        return compareTokenOrExact("Education", actual, rule.getRuleValue());
    }

    private Condition compareTokenOrExact(String field, String actual, String expectedValues) {
        if (actual == null || actual.isBlank()) return missing(field + " information is missing");
        Set<String> expected = splitValues(expectedValues);
        if (expected.isEmpty() || expected.contains("ALL") || expected.contains("ANY") || expected.contains("*")) {
            return satisfied(field + " requirement satisfied");
        }
        String normalizedActual = actual.trim().toUpperCase(Locale.ROOT);
        if (expected.contains(normalizedActual)) {
            return satisfied(field + " requirement satisfied");
        }
        boolean wordMatches = java.util.Arrays.stream(normalizedActual.split("[^A-Z0-9]+"))
                .filter(w -> !w.isBlank())
                .anyMatch(expected::contains);
        if (wordMatches) {
            return satisfied(field + " requirement satisfied");
        }
        return failed(field + " requirement not satisfied");
    }

    private Condition compareText(String field, String actual, String expectedValues) {
        if (actual == null || actual.isBlank()) return missing(field + " information is missing");
        Set<String> expected = splitValues(expectedValues);
        if (expected.isEmpty() || expected.contains("ALL") || expected.contains("ANY") || expected.contains("*")) {
            return satisfied(field + " requirement satisfied");
        }
        boolean matches = expected.contains(actual.trim().toUpperCase(Locale.ROOT));
        return matches ? satisfied(field + " requirement satisfied") : failed(field + " requirement not satisfied");
    }

    private Integer resolveAge(UserProfile profile) {
        if (profile == null) return null;
        if (profile.getAge() != null) return profile.getAge();
        if (profile.getUser() != null && profile.getUser().getDateOfBirth() != null) {
            return java.time.Period.between(profile.getUser().getDateOfBirth(), java.time.LocalDate.now()).getYears();
        }
        return null;
    }

    private int parseInteger(String value, int defaultValue) {
        if (value == null || value.isBlank()) return defaultValue;
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    private BigDecimal parseBigDecimal(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return new BigDecimal(value.trim().replace(",", ""));
        } catch (Exception e) {
            return null;
        }
    }

    private Set<String> splitValues(String values) {
        if (values == null || values.isBlank()) return Set.of();
        return java.util.Arrays.stream(values.split("[\\|,;]"))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(value -> value.toUpperCase(Locale.ROOT))
                .collect(Collectors.toSet());
    }

    private Condition satisfied(String message) { return new Condition(Outcome.SATISFIED, message); }
    private Condition failed(String message) { return new Condition(Outcome.FAILED, message); }
    private Condition missing(String message) { return new Condition(Outcome.MISSING, message); }

    public enum Outcome { SATISFIED, FAILED, MISSING }
    public record Condition(Outcome outcome, String message) { }
    public record Evaluation(List<Condition> conditions) {
        public List<String> messages(Outcome outcome) {
            return conditions.stream().filter(condition -> condition.outcome() == outcome).map(Condition::message).toList();
        }
        public int total() { return conditions.size(); }
        public int count(Outcome outcome) { return (int) conditions.stream().filter(condition -> condition.outcome() == outcome).count(); }
    }
}
