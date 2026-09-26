package in.sahayak.scheme.seed;

import in.sahayak.document.model.DocumentType;
import in.sahayak.document.repository.DocumentTypeRepository;
import in.sahayak.scheme.model.Scheme;
import in.sahayak.scheme.model.SchemeApplicationStep;
import in.sahayak.scheme.model.SchemeDocumentRequirement;
import in.sahayak.scheme.model.SchemeEligibilityRule;
import in.sahayak.scheme.model.enums.GovernmentLevel;
import in.sahayak.scheme.model.enums.SchemeStatus;
import in.sahayak.scheme.repository.SchemeApplicationStepRepository;
import in.sahayak.scheme.repository.SchemeDocumentRequirementRepository;
import in.sahayak.scheme.repository.SchemeEligibilityRuleRepository;
import in.sahayak.scheme.repository.SchemeRepository;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.annotation.Transactional;

/** Seeds only catalogue data backed by the linked official sources. */
@Configuration
class SchemeDataInitializer {
    private static final Instant VERIFIED_AT = Instant.parse("2026-09-26T00:00:00Z");
    private static final String KARNATAKA_HANDBOOK =
            "https://cdnbbsr.s3waas.gov.in/s3ec027486cef2522ee03547cfb970a404/uploads/2023/09/2025070385.pdf";
    private static final String KARNATAKA_GUARANTEES =
            "https://fpibengaluru.karnataka.gov.in/uploads/media_to_upload1762775113.pdf";

    @Bean
    CommandLineRunner schemeSeedRunner(SchemeRepository schemes, DocumentTypeRepository documentTypes,
                                       SchemeEligibilityRuleRepository rules,
                                       SchemeDocumentRequirementRepository requirements,
                                       SchemeApplicationStepRepository steps) {
        return args -> seed(schemes, documentTypes, rules, requirements, steps);
    }

    @Transactional
    void seed(SchemeRepository schemes, DocumentTypeRepository documentTypes, SchemeEligibilityRuleRepository rules,
              SchemeDocumentRequirementRepository requirements, SchemeApplicationStepRepository steps) {
        Map<String, DocumentType> docs = documentTypes(documentTypes);

        // Central Government catalogue (official portals listed per scheme).
        add(schemes, rules, requirements, steps, docs, central("PM-KISAN", "Agriculture", "Department of Agriculture and Farmers Welfare, Ministry of Agriculture and Farmers Welfare",
                "Income support of ₹6,000 per year in three equal instalments.", "All landholding farmer families with cultivable land in their names; higher-economic-status categories in the official guidelines are excluded.",
                "https://pmkisan.gov.in/", List.of("AADHAAR", "BANK_ACCOUNT"), "Use the New Farmer Registration service on the official PM-KISAN portal."));
        add(schemes, rules, requirements, steps, docs, central("Ayushman Bharat – Pradhan Mantri Jan Arogya Yojana (AB-PMJAY)", "Health", "National Health Authority, Ministry of Health and Family Welfare",
                "Cashless secondary and tertiary hospitalisation cover of up to ₹5 lakh per eligible family per year.", "Beneficiary families are identified using SECC 2011 deprivation and occupational criteria; citizens aged 70 and above have the expanded benefit described by the National Health Authority.",
                "https://nha.gov.in/PM-JAY", List.of("AADHAAR"), "Check beneficiary eligibility on the official PM-JAY portal or at an empanelled facility."));
        add(schemes, rules, requirements, steps, docs, central("Pradhan Mantri Jan-Dhan Yojana (PMJDY)", "Financial inclusion", "Department of Financial Services, Ministry of Finance",
                "Basic banking access, including a RuPay debit card with inbuilt accident insurance cover as described on the official portal.", "National mission for financial inclusion, with at least one basic banking account for every household.",
                "https://pmjdy.gov.in/about", List.of("AADHAAR"), "Follow the account-opening guidance on the official PMJDY portal."));
        add(schemes, rules, requirements, steps, docs, central("Pradhan Mantri Jeevan Jyoti Bima Yojana (PMJJBY)", "Insurance", "Department of Financial Services, Ministry of Finance",
                "₹2 lakh life cover for death due to any cause; annual premium ₹436.", "Indian citizen aged 18–50 with an Aadhaar-linked Jan-Dhan or savings bank account and consent for auto-debit.",
                "https://www.beta.eshram.gov.in/social-security-welfare-schemes", List.of("AADHAAR", "BANK_ACCOUNT"), "Enroll through a participating bank or post office as described by the official scheme information."));
        add(schemes, rules, requirements, steps, docs, central("Pradhan Mantri Suraksha Bima Yojana (PMSBY)", "Insurance", "Department of Financial Services, Ministry of Finance",
                "₹2 lakh for accidental death or full disability and ₹1 lakh for partial disability; annual premium ₹20.", "Indian citizen aged 18–70 with an Aadhaar-linked Jan-Dhan or savings bank account and consent for auto-debit.",
                "https://www.beta.eshram.gov.in/social-security-welfare-schemes", List.of("AADHAAR", "BANK_ACCOUNT"), "Enroll through a participating bank or post office as described by the official scheme information."));
        add(schemes, rules, requirements, steps, docs, central("PM Vishwakarma", "Livelihood", "Ministry of Micro, Small and Medium Enterprises",
                "End-to-end support for artisans and craftspeople working in the 18 notified trades.", "Artisans and craftspeople of the 18 notified trades who work with their hands and tools.",
                "https://www.dge.gov.in/index.php/schemes_programmes", List.of("AADHAAR"), "Use the official PM Vishwakarma application journey and submit the details it requests."));

        // Karnataka catalogue. Entries retain the primary official Karnataka source in rawSchemeTextReference.
        add(schemes, rules, requirements, steps, docs, state("Gruha Jyothi", "Utilities", "Energy Department, Government of Karnataka",
                "Free domestic electricity for eligible households up to 200 units per month.", "Permanent Karnataka resident with a domestic electricity connection and monthly consumption below 200 units.",
                KARNATAKA_HANDBOOK, List.of("AADHAAR", "ELECTRICITY_CONNECTION", "RESIDENCE_PROOF"), "Register through Seva Sindhu and submit the electricity connection details."));
        add(schemes, rules, requirements, steps, docs, state("Gruha Lakshmi", "Women and child development", "Department of Women and Child Development, Government of Karnataka",
                "₹2,000 per month financial assistance.", "Karnataka woman head of household holding an Antyodaya, BPL, or APL card; income-tax-paying husband or GST-return-filing household head is ineligible.",
                KARNATAKA_HANDBOOK, List.of("AADHAAR", "RATION_CARD", "RESIDENCE_PROOF", "BANK_ACCOUNT"), "Register on Seva Sindhu, complete personal, contact and bank details, upload documents, and submit."));
        add(schemes, rules, requirements, steps, docs, state("Anna Bhagya", "Food security", "Food, Civil Supplies and Consumer Affairs Department, Government of Karnataka",
                "₹34 per kg in place of 5 kg rice per person.", "Permanent Karnataka resident in the BPL or Antyodaya Anna Card category.",
                KARNATAKA_HANDBOOK, List.of("RATION_CARD", "AADHAAR", "RESIDENCE_PROOF"), "Eligible beneficiaries receive the benefit automatically; visit the nearest ration shop with the ration card."));
        add(schemes, rules, requirements, steps, docs, state("Yuva Nidhi", "Employment", "Department of Skill Development, Entrepreneurship and Livelihood, Government of Karnataka",
                "₹3,000 per month for unemployed graduates and ₹1,500 per month for unemployed diploma holders.", "Karnataka graduate or diploma holder unemployed for at least 180 days after passing; students continuing higher education and employed or self-employed people are ineligible.",
                KARNATAKA_HANDBOOK, List.of("AADHAAR", "EDUCATION_CERTIFICATE", "BANK_ACCOUNT", "RESIDENCE_PROOF"), "Register and apply through Seva Sindhu, then provide qualification and bank details."));
        add(schemes, rules, requirements, steps, docs, state("Shakti", "Transport", "Transport Department, Government of Karnataka",
                "Free bus travel in Karnataka government-run buses for eligible women and transgender persons.", "Women, girls, and transgender persons domiciled in Karnataka; men and women not domiciled in Karnataka are excluded.",
                "https://fpibengaluru.karnataka.gov.in/storage/pdf-files/Technical%20Reports/FinalcopyofFiscaleffectsofShaktiScheme_04072024.pdf", List.of("OFFICIAL_ID"), "Present the required official identification when using the eligible government bus service."));
        add(schemes, rules, requirements, steps, docs, state("Scheduled Tribe Marriage Assistance Scheme", "Social welfare", "Department of Scheduled Tribe Welfare, Government of Karnataka",
                "₹50,000 financial assistance for marriage.", "Bride belonging to the Scheduled Tribe category and the couple must be permanent residents of Karnataka.",
                KARNATAKA_HANDBOOK, List.of("CASTE_CERTIFICATE", "RESIDENCE_PROOF", "OFFICIAL_APPLICATION_FORM"), "Submit the official scheme application form to the Department of Scheduled Tribe Welfare."));
        add(schemes, rules, requirements, steps, docs, state("SC Widow Re-Marriage Assistance Scheme", "Social welfare", "Commissionerate of Social Welfare, Government of Karnataka",
                "₹3,00,000 financial assistance.", "Re-married Scheduled Caste widow of Karnataka.",
                KARNATAKA_HANDBOOK, List.of("CASTE_CERTIFICATE", "OFFICIAL_APPLICATION_FORM"), "Submit the official application to the Commissionerate of Social Welfare."));
        add(schemes, rules, requirements, steps, docs, state("Thayi Bhagya", "Maternal health", "Department of Health and Family Welfare, Government of Karnataka",
                "Maternal health support under the Karnataka state scheme as described in the official scheme handbook.", "Eligibility is determined under the official Thayi Bhagya scheme guidelines.",
                KARNATAKA_HANDBOOK, List.of("OFFICIAL_APPLICATION_FORM"), "Apply through the official health-service channel specified in the scheme handbook."));
        add(schemes, rules, requirements, steps, docs, state("Bhagyalakshmi", "Women and child development", "Government of Karnataka",
                "Girl-child welfare benefit as specified in the official Karnataka scheme handbook.", "Eligibility is determined under the official Bhagyalakshmi scheme guidelines.",
                KARNATAKA_HANDBOOK, List.of("OFFICIAL_APPLICATION_FORM"), "Apply through the official channel specified in the scheme handbook."));
        add(schemes, rules, requirements, steps, docs, state("Madilu Kit", "Maternal health", "Department of Health and Family Welfare, Government of Karnataka",
                "Maternal and newborn-care kit benefit as specified in the official Karnataka scheme handbook.", "Eligibility is determined under the official Madilu Kit scheme guidelines.",
                KARNATAKA_HANDBOOK, List.of("OFFICIAL_APPLICATION_FORM"), "Apply through the official health-service channel specified in the scheme handbook."));

        ensureStructuredEligibilityRules(schemes, rules);
    }

    private Map<String, DocumentType> documentTypes(DocumentTypeRepository repository) {
        return List.of(new String[]{"AADHAAR", "Aadhaar card"}, new String[]{"BANK_ACCOUNT", "Bank account details"},
                        new String[]{"RATION_CARD", "Ration card"}, new String[]{"RESIDENCE_PROOF", "Karnataka residence proof"},
                        new String[]{"ELECTRICITY_CONNECTION", "Domestic electricity connection number"}, new String[]{"EDUCATION_CERTIFICATE", "Education certificate"},
                        new String[]{"CASTE_CERTIFICATE", "Caste certificate"}, new String[]{"OFFICIAL_ID", "Official identity document"},
                        new String[]{"OFFICIAL_APPLICATION_FORM", "Official scheme application form"})
                .stream().map(value -> repository.findByCode(value[0]).orElseGet(() -> { DocumentType type = new DocumentType(); type.setCode(value[0]); type.setName(value[1]); return repository.save(type); }))
                .collect(java.util.stream.Collectors.toMap(DocumentType::getCode, type -> type));
    }

    private Scheme central(String name, String category, String authority, String benefit, String eligibility, String source, List<String> docs, String apply) {
        return scheme(name, GovernmentLevel.CENTRAL, null, category, authority, benefit, eligibility, source, docs, apply);
    }
    private Scheme state(String name, String category, String authority, String benefit, String eligibility, String source, List<String> docs, String apply) {
        return scheme(name, GovernmentLevel.STATE, "Karnataka", category, authority, benefit, eligibility, source, docs, apply);
    }
    private Scheme scheme(String name, GovernmentLevel level, String state, String category, String authority, String benefit, String eligibility, String source, List<String> docs, String apply) {
        Scheme scheme = new Scheme(); scheme.setName(name); scheme.setGovernmentLevel(level); scheme.setState(state); scheme.setCategory(category); scheme.setIssuingAuthority(authority);
        scheme.setBenefitInformation(benefit); scheme.setOfficialSourceUrl(source); scheme.setRawSchemeTextReference(source); scheme.setLastVerifiedAt(VERIFIED_AT); scheme.setStatus(SchemeStatus.ACTIVE);
        scheme.setEligibilityData(Map.of("criteria", eligibility, "source", source, "seedNote", "Seeded from official government source; confirm current rules at the source."));
        SchemeEligibilityRule rule = new SchemeEligibilityRule(); rule.setRuleType("OFFICIAL_CRITERIA"); rule.setRuleDescription(eligibility); rule.setDisplayOrder(1); rule.setRuleValue(source); scheme.getEligibilityRules().add(rule);
        SchemeApplicationStep step = new SchemeApplicationStep(); step.setStepNumber(1); step.setTitle("Official application guidance"); step.setInstructions(apply); step.setOfficialUrl(source); scheme.getApplicationSteps().add(step);
        docs.forEach(code -> { SchemeDocumentRequirement requirement = new SchemeDocumentRequirement(); requirement.setNotes(code); requirement.setRequired(true); scheme.getDocumentRequirements().add(requirement); });
        return scheme;
    }

    private void add(SchemeRepository schemes, SchemeEligibilityRuleRepository rules, SchemeDocumentRequirementRepository requirements, SchemeApplicationStepRepository steps, Map<String, DocumentType> documentTypes, Scheme candidate) {
        if (schemes.findByName(candidate.getName()).isPresent()) return;
        List<SchemeEligibilityRule> candidateRules = candidate.getEligibilityRules(); List<SchemeApplicationStep> candidateSteps = candidate.getApplicationSteps(); List<SchemeDocumentRequirement> candidateRequirements = candidate.getDocumentRequirements();
        Scheme saved = schemes.save(candidate);
        candidateRules.forEach(rule -> { rule.setScheme(saved); rules.save(rule); }); candidateSteps.forEach(step -> { step.setScheme(saved); steps.save(step); });
        candidateRequirements.forEach(requirement -> {
            String documentTypeCode = requirement.getNotes();
            requirement.setScheme(saved);
            requirement.setDocumentType(documentTypes.get(documentTypeCode));
            requirement.setNotes("Required or referenced by the official source; confirm current requirements before applying.");
            requirements.save(requirement);
        });
    }

    /** Adds machine-evaluable facts without replacing the official free-text rule retained above. */
    private void ensureStructuredEligibilityRules(SchemeRepository schemes, SchemeEligibilityRuleRepository rules) {
        List<String> karnatakaSchemes = List.of("Gruha Jyothi", "Gruha Lakshmi", "Anna Bhagya", "Yuva Nidhi", "Shakti",
                "Scheduled Tribe Marriage Assistance Scheme", "SC Widow Re-Marriage Assistance Scheme", "Thayi Bhagya", "Bhagyalakshmi", "Madilu Kit");
        karnatakaSchemes.forEach(name -> addRule(schemes, rules, name, "STATE", "Karnataka", "Applicant must be a Karnataka resident."));
        addRule(schemes, rules, "PM-KISAN", "OCCUPATION", "FARMER", "Applicant occupation must be farmer.");
        addRule(schemes, rules, "Pradhan Mantri Jeevan Jyoti Bima Yojana (PMJJBY)", "MIN_AGE", "18", "Applicant must be at least 18 years old.");
        addRule(schemes, rules, "Pradhan Mantri Jeevan Jyoti Bima Yojana (PMJJBY)", "MAX_AGE", "50", "Applicant must be at most 50 years old.");
        addRule(schemes, rules, "Pradhan Mantri Suraksha Bima Yojana (PMSBY)", "MIN_AGE", "18", "Applicant must be at least 18 years old.");
        addRule(schemes, rules, "Pradhan Mantri Suraksha Bima Yojana (PMSBY)", "MAX_AGE", "70", "Applicant must be at most 70 years old.");
        addRule(schemes, rules, "PM Vishwakarma", "OCCUPATION", "ARTISAN|CRAFTSPERSON", "Applicant must be an artisan or craftsperson.");
        addRule(schemes, rules, "Gruha Lakshmi", "GENDER", "FEMALE|OTHER", "Applicant must be an eligible woman or transgender head of household.");
        addRule(schemes, rules, "Yuva Nidhi", "EDUCATION", "GRADUATE|DIPLOMA", "Applicant must be a graduate or diploma holder.");
        addRule(schemes, rules, "Yuva Nidhi", "OCCUPATION", "UNEMPLOYED", "Applicant must be unemployed.");
        addRule(schemes, rules, "Shakti", "GENDER", "FEMALE|OTHER", "Applicant must be an eligible woman or transgender person.");
        addRule(schemes, rules, "Scheduled Tribe Marriage Assistance Scheme", "CATEGORY", "ST", "Applicant must be in the Scheduled Tribe category.");
        addRule(schemes, rules, "SC Widow Re-Marriage Assistance Scheme", "CATEGORY", "SC", "Applicant must be in the Scheduled Caste category.");
    }

    private void addRule(SchemeRepository schemes, SchemeEligibilityRuleRepository rules, String schemeName,
                         String type, String value, String description) {
        Scheme scheme = schemes.findByName(schemeName).orElseThrow();
        boolean exists = rules.findBySchemeId(scheme.getId()).stream().anyMatch(rule -> rule.getRuleType().equals(type));
        if (exists) return;
        SchemeEligibilityRule rule = new SchemeEligibilityRule();
        rule.setScheme(scheme); rule.setRuleType(type); rule.setRuleValue(value); rule.setRuleDescription(description);
        rule.setDisplayOrder(100 + rules.findBySchemeId(scheme.getId()).size());
        rules.save(rule);
    }
}
