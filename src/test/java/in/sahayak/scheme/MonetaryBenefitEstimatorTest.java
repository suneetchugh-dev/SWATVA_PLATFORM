package in.sahayak.scheme;

import in.sahayak.scheme.MonetaryBenefitEstimator.EstimatedBenefit;
import in.sahayak.scheme.model.Scheme;
import in.sahayak.user.model.UserProfile;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class MonetaryBenefitEstimatorTest {

    private MonetaryBenefitEstimator estimator;

    @BeforeEach
    void setUp() {
        estimator = new MonetaryBenefitEstimator();
    }

    @Test
    void estimateBenefit_forPmKisan_returns6000PerYear() {
        Scheme scheme = new Scheme();
        scheme.setName("PM-KISAN");
        scheme.setBenefitInformation("Income support of ₹6,000 per year in three equal instalments.");

        Optional<EstimatedBenefit> benefit = estimator.estimateBenefit(scheme, null);

        assertThat(benefit).isPresent();
        assertThat(benefit.get().annualAmount()).isEqualTo(6000L);
        assertThat(benefit.get().period()).isEqualTo("ANNUAL");
    }

    @Test
    void estimateBenefit_forGruhaLakshmi_returns24000PerYear() {
        Scheme scheme = new Scheme();
        scheme.setName("Gruha Lakshmi");
        scheme.setBenefitInformation("₹2,000 per month financial assistance.");

        Optional<EstimatedBenefit> benefit = estimator.estimateBenefit(scheme, null);

        assertThat(benefit).isPresent();
        assertThat(benefit.get().annualAmount()).isEqualTo(24000L);
        assertThat(benefit.get().period()).isEqualTo("MONTHLY");
    }

    @Test
    void estimateBenefit_forYuvaNidhi_graduateProfile_returns36000PerYear() {
        Scheme scheme = new Scheme();
        scheme.setName("Yuva Nidhi");
        scheme.setBenefitInformation("₹3,000 per month for unemployed graduates and ₹1,500 per month for unemployed diploma holders.");

        UserProfile graduateProfile = new UserProfile();
        graduateProfile.setEducation("GRADUATE");

        Optional<EstimatedBenefit> benefit = estimator.estimateBenefit(scheme, graduateProfile);

        assertThat(benefit).isPresent();
        assertThat(benefit.get().annualAmount()).isEqualTo(36000L);
    }

    @Test
    void estimateBenefit_forYuvaNidhi_diplomaProfile_returns18000PerYear() {
        Scheme scheme = new Scheme();
        scheme.setName("Yuva Nidhi");
        scheme.setBenefitInformation("₹3,000 per month for unemployed graduates and ₹1,500 per month for unemployed diploma holders.");

        UserProfile diplomaProfile = new UserProfile();
        diplomaProfile.setEducation("DIPLOMA");

        Optional<EstimatedBenefit> benefit = estimator.estimateBenefit(scheme, diplomaProfile);

        assertThat(benefit).isPresent();
        assertThat(benefit.get().annualAmount()).isEqualTo(18000L);
    }

    @Test
    void estimateBenefit_forStMarriageAssistance_returns50000OneTime() {
        Scheme scheme = new Scheme();
        scheme.setName("Scheduled Tribe Marriage Assistance Scheme");
        scheme.setBenefitInformation("₹50,000 financial assistance for marriage.");

        Optional<EstimatedBenefit> benefit = estimator.estimateBenefit(scheme, null);

        assertThat(benefit).isPresent();
        assertThat(benefit.get().annualAmount()).isEqualTo(50000L);
        assertThat(benefit.get().period()).isEqualTo("ONE_TIME");
    }

    @Test
    void estimateBenefit_forNonMonetarySchemes_returnsEmpty() {
        Scheme electricityScheme = new Scheme();
        electricityScheme.setName("Gruha Jyothi");
        electricityScheme.setBenefitInformation("Free domestic electricity for eligible households up to 200 units per month.");

        Scheme busScheme = new Scheme();
        busScheme.setName("Shakti");
        busScheme.setBenefitInformation("Free bus travel in Karnataka government-run buses for eligible women and transgender persons.");

        Scheme kitScheme = new Scheme();
        kitScheme.setName("Madilu Kit");
        kitScheme.setBenefitInformation("Maternal and newborn-care kit benefit as specified in the official Karnataka scheme handbook.");

        assertThat(estimator.estimateBenefit(electricityScheme, null)).isEmpty();
        assertThat(estimator.estimateBenefit(busScheme, null)).isEmpty();
        assertThat(estimator.estimateBenefit(kitScheme, null)).isEmpty();
    }

    @Test
    void estimateBenefit_usesStructuredEligibilityData_whenPresent() {
        Scheme customScheme = new Scheme();
        customScheme.setName("State Farmer Grant");
        customScheme.setEligibilityData(Map.of(
                "estimatedAnnualBenefit", 12000L,
                "benefitPeriod", "ANNUAL"
        ));

        Optional<EstimatedBenefit> benefit = estimator.estimateBenefit(customScheme, null);

        assertThat(benefit).isPresent();
        assertThat(benefit.get().annualAmount()).isEqualTo(12000L);
    }
}
