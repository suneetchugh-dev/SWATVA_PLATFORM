package in.swatva.scheme;

import in.swatva.scheme.model.Scheme;
import in.swatva.user.model.UserProfile;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class MonetaryBenefitEstimator {

    public record EstimatedBenefit(
            long annualAmount,
            String period,
            String description
    ) {}

    private static final Pattern PER_YEAR_PATTERN =
            Pattern.compile("₹?\\s*([0-9]{1,3}(?:,[0-9]{2,3})*|[0-9]+)\\s*(?:per|/)\\s*year", Pattern.CASE_INSENSITIVE);

    private static final Pattern PER_MONTH_PATTERN =
            Pattern.compile("₹?\\s*([0-9]{1,3}(?:,[0-9]{2,3})*|[0-9]+)\\s*(?:per|/)\\s*month", Pattern.CASE_INSENSITIVE);

    private static final Pattern ONE_TIME_PATTERN =
            Pattern.compile("₹?\\s*([0-9]{1,3}(?:,[0-9]{2,3})*|[0-9]+)\\s*(?:financial assistance|grant|one-time)", Pattern.CASE_INSENSITIVE);

    public Optional<EstimatedBenefit> estimateBenefit(Scheme scheme, UserProfile profile) {
        if (scheme == null) {
            return Optional.empty();
        }

        // 1. Check if structured monetary data is present in eligibilityData
        Map<String, Object> data = scheme.getEligibilityData();
        if (data != null) {
            if (data.get("estimatedAnnualBenefit") instanceof Number num) {
                String period = data.getOrDefault("benefitPeriod", "ANNUAL").toString();
                return Optional.of(new EstimatedBenefit(num.longValue(), period, scheme.getBenefitInformation()));
            }
            if (data.get("estimatedMonthlyBenefit") instanceof Number num) {
                return Optional.of(new EstimatedBenefit(num.longValue() * 12, "MONTHLY", scheme.getBenefitInformation()));
            }
        }

        // 2. Specific verified scheme rules
        String schemeName = scheme.getName() != null ? scheme.getName().trim() : "";

        if ("PM-KISAN".equalsIgnoreCase(schemeName)) {
            return Optional.of(new EstimatedBenefit(6000L, "ANNUAL", "Income support of ₹6,000 per year in three equal instalments."));
        }

        if ("Gruha Lakshmi".equalsIgnoreCase(schemeName)) {
            return Optional.of(new EstimatedBenefit(24000L, "MONTHLY", "₹2,000 per month financial assistance (₹24,000/year)."));
        }

        if ("Yuva Nidhi".equalsIgnoreCase(schemeName)) {
            boolean isDiploma = profile != null && profile.getEducation() != null
                    && profile.getEducation().trim().equalsIgnoreCase("DIPLOMA");
            long annual = isDiploma ? 1500L * 12 : 3000L * 12;
            String desc = isDiploma ? "₹1,500 per month for unemployed diploma holders (₹18,000/year)"
                    : "₹3,000 per month for unemployed graduates (₹36,000/year)";
            return Optional.of(new EstimatedBenefit(annual, "MONTHLY", desc));
        }

        if ("Scheduled Tribe Marriage Assistance Scheme".equalsIgnoreCase(schemeName)) {
            return Optional.of(new EstimatedBenefit(50000L, "ONE_TIME", "₹50,000 financial assistance for marriage."));
        }

        if ("SC Widow Re-Marriage Assistance Scheme".equalsIgnoreCase(schemeName)) {
            return Optional.of(new EstimatedBenefit(300000L, "ONE_TIME", "₹3,00,000 financial assistance."));
        }

        if ("UP Vridhavastha Pension Yojana".equalsIgnoreCase(schemeName)) {
            return Optional.of(new EstimatedBenefit(12000L, "MONTHLY", "₹1,000 per month social pension (₹12,000/year)."));
        }

        if ("UP Nirashrit Mahila Pension Yojana".equalsIgnoreCase(schemeName)) {
            return Optional.of(new EstimatedBenefit(12000L, "MONTHLY", "₹1,000 per month destitute widow pension (₹12,000/year)."));
        }

        if ("UP Divyangjan Pension Yojana".equalsIgnoreCase(schemeName)) {
            return Optional.of(new EstimatedBenefit(12000L, "MONTHLY", "₹1,000 per month disability pension (₹12,000/year)."));
        }

        if ("UP Shadi Anudan Yojana".equalsIgnoreCase(schemeName)) {
            return Optional.of(new EstimatedBenefit(20000L, "ONE_TIME", "₹20,000 financial grant for marriage."));
        }

        if ("UP Mukhyamantri Bal Seva Yojana".equalsIgnoreCase(schemeName)) {
            return Optional.of(new EstimatedBenefit(48000L, "MONTHLY", "₹4,000 per month maintenance allowance (₹48,000/year)."));
        }

        if ("Mukhyamantri Kanya Sumangala Yojana".equalsIgnoreCase(schemeName)) {
            return Optional.of(new EstimatedBenefit(25000L, "ONE_TIME", "Up to ₹25,000 milestone-based financial assistance."));
        }

        // 3. Fallback regex extraction from verified benefitInformation
        String benefitInfo = scheme.getBenefitInformation();
        if (benefitInfo == null || benefitInfo.isBlank()) {
            return Optional.empty();
        }

        // Check per month (e.g. ₹2,000 per month)
        Matcher monthMatcher = PER_MONTH_PATTERN.matcher(benefitInfo);
        if (monthMatcher.find()) {
            long monthly = parseAmount(monthMatcher.group(1));
            if (monthly > 0) {
                return Optional.of(new EstimatedBenefit(monthly * 12, "MONTHLY", benefitInfo));
            }
        }

        // Check per year (e.g. ₹6,000 per year)
        Matcher yearMatcher = PER_YEAR_PATTERN.matcher(benefitInfo);
        if (yearMatcher.find()) {
            long annual = parseAmount(yearMatcher.group(1));
            if (annual > 0) {
                return Optional.of(new EstimatedBenefit(annual, "ANNUAL", benefitInfo));
            }
        }

        // Check one-time financial assistance (e.g. ₹50,000 financial assistance)
        Matcher oneTimeMatcher = ONE_TIME_PATTERN.matcher(benefitInfo);
        if (oneTimeMatcher.find()) {
            long oneTime = parseAmount(oneTimeMatcher.group(1));
            if (oneTime > 0) {
                return Optional.of(new EstimatedBenefit(oneTime, "ONE_TIME", benefitInfo));
            }
        }

        // If monetary value is unknown or non-monetary (e.g. free units, bus travel), exclude it.
        return Optional.empty();
    }

    private long parseAmount(String text) {
        if (text == null) return 0;
        try {
            return Long.parseLong(text.replace(",", "").trim());
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
