package in.swatva.scheme.api;

import java.util.List;

public record MissedBenefitsResponse(
        long totalEstimatedAnnualBenefit,
        long central,
        long state,
        int totalMissedBenefits,
        String headlineMessage,
        String disclaimer,
        List<SchemeBenefitValue> breakdown
) {
    public static MissedBenefitsResponse of(
            long central,
            long state,
            List<SchemeBenefitValue> breakdown
    ) {
        long total = central + state;
        int count = breakdown != null ? breakdown.size() : 0;
        String headline = total > 0
                ? "You may be missing benefits worth approximately ₹" + String.format("%,d", total) + "/year."
                : "You do not have any unclaimed monetary benefits estimated at this time.";
        String disclaimer = "This is an estimate, NOT a guaranteed payout. Actual disbursement is subject to official government eligibility verification and application approval.";
        return new MissedBenefitsResponse(
                total,
                central,
                state,
                count,
                headline,
                disclaimer,
                breakdown != null ? breakdown : List.of()
        );
    }
}
