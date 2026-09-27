package in.sahayak.scheme.seed;

import in.sahayak.document.model.DocumentType;
import in.sahayak.document.model.DocumentValidityRule;
import in.sahayak.document.repository.DocumentTypeRepository;
import in.sahayak.document.repository.DocumentValidityRuleRepository;
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seeds the verified demo dataset of 20 real government schemes:
 * - 6 Central Government schemes
 * - 14 Uttar Pradesh Government schemes
 * Backed by linked official government portals and guidelines.
 */
@Configuration
public class SchemeDataInitializer {
    private static final Instant VERIFIED_AT = Instant.parse("2026-09-26T00:00:00Z");

    @Bean
    @Order(100)
    CommandLineRunner schemeSeedRunner(SchemeRepository schemes, DocumentTypeRepository documentTypes,
                                       SchemeEligibilityRuleRepository rules,
                                       SchemeDocumentRequirementRepository requirements,
                                       SchemeApplicationStepRepository steps,
                                       @Autowired(required = false) DocumentValidityRuleRepository validityRules) {
        return args -> seed(schemes, documentTypes, rules, requirements, steps, validityRules);
    }

    @Transactional
    public void seed(SchemeRepository schemes, DocumentTypeRepository documentTypes, SchemeEligibilityRuleRepository rules,
                     SchemeDocumentRequirementRepository requirements, SchemeApplicationStepRepository steps,
                     DocumentValidityRuleRepository validityRules) {
        // Clean up legacy Karnataka demo schemes if present from earlier prototypes
        cleanLegacyKarnatakaSchemes(schemes, rules, requirements, steps);

        Map<String, DocumentType> docs = documentTypes(documentTypes);

        // ==========================================
        // 1. Central Government Catalogue (6 schemes)
        // ==========================================

        add(schemes, rules, requirements, steps, docs, central(
                "PM-KISAN",
                "Agriculture",
                "Department of Agriculture and Farmers Welfare, Ministry of Agriculture and Farmers Welfare",
                "Income support of ₹6,000 per year in three equal instalments of ₹2,000 directly into bank accounts via DBT.",
                "All landholding farmer families with cultivable landholding in their names. Exclusions apply to institutional landholders, constitutional post holders, government employees, and income tax payers.",
                "https://pmkisan.gov.in/",
                List.of("AADHAAR", "BANK_ACCOUNT", "RESIDENCE_PROOF"),
                "Use the New Farmer Registration link on the official PM-KISAN portal (pmkisan.gov.in) or visit a local Common Service Centre (CSC) with landholding records and Aadhaar-linked bank details."));

        add(schemes, rules, requirements, steps, docs, central(
                "Ayushman Bharat – Pradhan Mantri Jan Arogya Yojana (AB-PMJAY)",
                "Health",
                "National Health Authority, Ministry of Health and Family Welfare",
                "Cashless secondary and tertiary hospitalisation cover of up to ₹5 lakh per eligible family per year across empanelled hospitals.",
                "Beneficiary families identified using SECC 2011 deprivation and occupational criteria in rural and urban areas; all citizens aged 70 years and above are eligible under expanded coverage.",
                "https://nha.gov.in/PM-JAY",
                List.of("AADHAAR", "RATION_CARD"),
                "Check family eligibility on the official portal (nha.gov.in/PM-JAY) or visit any empanelled hospital or Ayushman Kendra to complete e-KYC and generate the Ayushman Card."));

        add(schemes, rules, requirements, steps, docs, central(
                "Pradhan Mantri Jan-Dhan Yojana (PMJDY)",
                "Financial inclusion",
                "Department of Financial Services, Ministry of Finance",
                "Basic Savings Bank Deposit (BSBD) account with zero minimum balance, RuPay debit card with inbuilt accidental insurance cover up to ₹2 lakh, and overdraft facility up to ₹10,000.",
                "Any Indian citizen aged 10 years and above who does not possess a basic bank savings account.",
                "https://pmjdy.gov.in/about",
                List.of("AADHAAR", "OFFICIAL_ID"),
                "Visit any commercial bank branch, Regional Rural Bank (RRB), or Bank Mitra outlet, complete the PMJDY account opening form, and submit Aadhaar for biometric e-KYC."));

        Scheme pmjjby = central(
                "Pradhan Mantri Jeevan Jyoti Bima Yojana (PMJJBY)",
                "Insurance",
                "Department of Financial Services, Ministry of Finance",
                "₹2 lakh renewable life insurance cover for death due to any cause. Annual premium of ₹436 auto-debited from subscriber's bank or post office account.",
                "Indian citizens aged 18 to 50 years holding an Aadhaar-linked savings bank account or post office account with consent for auto-debit.",
                "https://www.beta.eshram.gov.in/social-security-welfare-schemes",
                List.of("AADHAAR", "BANK_ACCOUNT"),
                "Enroll through your participating bank branch, post office, or net-banking portal by submitting the PMJJBY enrolment and auto-debit consent form.");
        pmjjby.setOfficialApplicationFeeExists(true);
        pmjjby.setOfficialFeeAmount(436.0);
        pmjjby.setOfficialApplicationChannel("Participating Banks / Post Offices / Net Banking");
        add(schemes, rules, requirements, steps, docs, pmjjby);

        Scheme pmsby = central(
                "Pradhan Mantri Suraksha Bima Yojana (PMSBY)",
                "Insurance",
                "Department of Financial Services, Ministry of Finance",
                "Accidental death and full permanent disability cover of ₹2 lakh, and partial permanent disability cover of ₹1 lakh. Annual premium of ₹20 auto-debited from subscriber's bank account.",
                "Indian citizens aged 18 to 70 years with an Aadhaar-linked savings bank account or post office account and consent for auto-debit.",
                "https://www.beta.eshram.gov.in/social-security-welfare-schemes",
                List.of("AADHAAR", "BANK_ACCOUNT"),
                "Enroll through your savings bank branch, post office, or internet banking portal with the PMSBY auto-debit consent authorization.");
        pmsby.setOfficialApplicationFeeExists(true);
        pmsby.setOfficialFeeAmount(20.0);
        pmsby.setOfficialApplicationChannel("Participating Banks / Post Offices / Net Banking");
        add(schemes, rules, requirements, steps, docs, pmsby);

        add(schemes, rules, requirements, steps, docs, central(
                "PM Vishwakarma",
                "Livelihood",
                "Ministry of Micro, Small and Medium Enterprises",
                "Recognition via PM Vishwakarma Certificate and ID Card, 5–7 days skill training with ₹500 daily stipend, ₹15,000 modern toolkit grant, and collateral-free enterprise loans up to ₹3 lakh at 5% interest.",
                "Artisans and craftspeople aged 18 years and above working with hands and tools in one of the 18 traditional family trades. Benefit is restricted to one member per family.",
                "https://www.dge.gov.in/index.php/schemes_programmes",
                List.of("AADHAAR", "BANK_ACCOUNT", "OFFICIAL_ID"),
                "Register at a Common Service Centre (CSC) on the official PM Vishwakarma portal (pmvishwakarma.gov.in) with biometric Aadhaar verification and trade selection."));

        // ==================================================
        // 2. Uttar Pradesh Government Catalogue (14 schemes)
        // ==================================================

        add(schemes, rules, requirements, steps, docs, upState(
                "Mukhyamantri Kanya Sumangala Yojana",
                "Women and child development",
                "Women and Child Development Department, Government of Uttar Pradesh",
                "Conditional financial assistance of up to ₹25,000 provided across six milestones from birth to university/diploma admission.",
                "Permanent resident of Uttar Pradesh. Annual family income must not exceed ₹3,00,000. Benefit is available for a maximum of two girl children per family (three in case of twin girls in the second birth).",
                "https://mksy.up.gov.in/",
                List.of("AADHAAR", "BANK_ACCOUNT", "INCOME_CERTIFICATE", "RESIDENCE_PROOF", "BIRTH_CERTIFICATE"),
                "Register online at mksy.up.gov.in, select the applicable stage (Stage 1 birth through Stage 6 higher education), upload Aadhaar, domicile certificate, income certificate, and girl child/mother bank passbook."));

        add(schemes, rules, requirements, steps, docs, upState(
                "UP Vridhavastha Pension Yojana",
                "Social welfare",
                "Social Welfare Department, Government of Uttar Pradesh",
                "Monthly social pension of ₹1,000 (disbursed quarterly as ₹3,000) directly credited to the beneficiary's Aadhaar-seeded bank account.",
                "Permanent resident of Uttar Pradesh aged 60 years or above living below poverty line (BPL), with annual family income up to ₹46,080 in rural areas or up to ₹56,460 in urban areas. Must not be receiving any other government pension.",
                "https://sspy-up.gov.in/",
                List.of("AADHAAR", "BANK_ACCOUNT", "INCOME_CERTIFICATE", "RESIDENCE_PROOF"),
                "Apply online via the SSPY portal (sspy-up.gov.in) under Old Age Pension. Upload Aadhaar card, bank passbook details, age proof, and income certificate issued by the competent revenue authority."));

        add(schemes, rules, requirements, steps, docs, upState(
                "UP Nirashrit Mahila Pension Yojana",
                "Women welfare",
                "Women Welfare Department, Government of Uttar Pradesh",
                "Monthly pension of ₹1,000 (disbursed quarterly as ₹3,000) directly into the beneficiary's bank account.",
                "Destitute widow aged 18 years or above residing permanently in Uttar Pradesh. Total annual family income must not exceed ₹2,00,000. Must not have remarried or be receiving any other social pension.",
                "https://sspy-up.gov.in/",
                List.of("AADHAAR", "BANK_ACCOUNT", "INCOME_CERTIFICATE", "RESIDENCE_PROOF", "DEATH_CERTIFICATE"),
                "Submit an online application on sspy-up.gov.in under Destitute Women Pension. Upload husband's death certificate, applicant's Aadhaar card, income certificate, and bank account details."));

        add(schemes, rules, requirements, steps, docs, upState(
                "UP Divyangjan Pension Yojana",
                "Social welfare",
                "Divyangjan Empowerment Department, Government of Uttar Pradesh",
                "Monthly disability pension of ₹1,000 (disbursed quarterly as ₹3,000) directly transferred via DBT.",
                "Resident of Uttar Pradesh aged 18 years or above with a minimum of 40% benchmark disability certified by the Chief Medical Officer (CMO). Annual family income must not exceed ₹46,080 in rural areas or ₹56,460 in urban areas.",
                "https://sspy-up.gov.in/",
                List.of("AADHAAR", "BANK_ACCOUNT", "INCOME_CERTIFICATE", "DISABILITY_CERTIFICATE", "RESIDENCE_PROOF"),
                "Apply online via the SSPY portal (sspy-up.gov.in) under Divyang Pension. Upload disability certificate from CMO/authorized medical board (40%+ disability), income certificate, Aadhaar, and bank passbook."));

        add(schemes, rules, requirements, steps, docs, upState(
                "UP Shadi Anudan Yojana",
                "Social welfare",
                "Social Welfare Department, Government of Uttar Pradesh",
                "One-time financial grant of ₹20,000 for the marriage of daughters belonging to economically weaker families.",
                "Permanent resident of Uttar Pradesh. Annual family income must not exceed ₹46,080 in rural areas or ₹56,460 in urban areas. The bride must be at least 18 years of age and the groom at least 21 years of age at the time of marriage. Maximum 2 daughters per family.",
                "https://shadianudan.upsdc.gov.in/",
                List.of("AADHAAR", "BANK_ACCOUNT", "INCOME_CERTIFICATE", "CASTE_CERTIFICATE", "RESIDENCE_PROOF", "OFFICIAL_APPLICATION_FORM"),
                "Apply online on shadianudan.upsdc.gov.in within 90 days before marriage or up to 90 days post marriage. Upload bride and groom age proofs, marriage invitation card or registration, income certificate, caste certificate, and bank details."));

        add(schemes, rules, requirements, steps, docs, upState(
                "UP Post-Matric Scholarship Scheme",
                "Education",
                "Social Welfare and Backward Class Welfare Departments, Government of Uttar Pradesh",
                "Reimbursement of non-refundable course fees and monthly maintenance allowance for post-matriculation courses (Class 11, Class 12, undergraduate, postgraduate, and professional degrees).",
                "Domicile of Uttar Pradesh studying in recognized colleges/universities. Annual family income must not exceed ₹2,50,000 for SC/ST students, and ₹2,00,000 for General, OBC, and Minority students.",
                "https://scholarship.up.gov.in/",
                List.of("AADHAAR", "BANK_ACCOUNT", "INCOME_CERTIFICATE", "CASTE_CERTIFICATE", "RESIDENCE_PROOF", "EDUCATION_CERTIFICATE"),
                "Register on the official scholarship portal (scholarship.up.gov.in) with high school roll number, complete Aadhaar e-KYC, fill course and fee details, submit online, and deposit a hard copy along with attested documents at your educational institution."));

        add(schemes, rules, requirements, steps, docs, upState(
                "UP Gopalak Yojana",
                "Animal husbandry",
                "Animal Husbandry Department, Government of Uttar Pradesh",
                "Bank credit facility up to ₹9,00,000 for setting up a commercial dairy farm with 10–12 milch cattle, along with interest subsidy of ₹40,000 per year for up to 5 years (total subsidy ₹2,00,000).",
                "Resident of Uttar Pradesh aged 18 years or above with experience or interest in dairy farming. Applicant must have adequate land/shelter for cattle and possess at least 5 milch cattle initially. Annual family income should not exceed ₹1,00,000.",
                "https://animalhusb.upsdc.gov.in/",
                List.of("AADHAAR", "BANK_ACCOUNT", "INCOME_CERTIFICATE", "RESIDENCE_PROOF", "OFFICIAL_ID"),
                "Submit the prescribed application to the Chief Veterinary Officer (CVO) or local veterinary hospital with land ownership/lease documents, cattle shed details, and project proposal."));

        add(schemes, rules, requirements, steps, docs, upState(
                "UP Mukhyamantri Krishak Durghatna Kalyan Yojana",
                "Agriculture",
                "Board of Revenue, Government of Uttar Pradesh",
                "Financial assistance of up to ₹5,00,000 in case of accidental death or permanent total disability, and up to ₹2,50,000 for partial disability resulting from an accident during agricultural or allied work.",
                "Resident farmer, landholder, co-sharer, or landless tenant/agricultural labourer working in agricultural fields in Uttar Pradesh aged between 18 and 70 years.",
                "https://uprevenue.nic.in/",
                List.of("AADHAAR", "BANK_ACCOUNT", "RESIDENCE_PROOF", "OFFICIAL_ID"),
                "File an application with the Tehsil office / Sub-Divisional Magistrate (SDM) within 45 days of the accidental incident (up to 75 days with District Magistrate condonation) with post-mortem/medical disability certificate and revenue land records."));

        add(schemes, rules, requirements, steps, docs, upState(
                "Mukhyamantri Abhyudaya Yojana",
                "Education",
                "Social Welfare Department, Government of Uttar Pradesh",
                "Free comprehensive classroom coaching, digital e-learning content, virtual lectures, tablet incentives for merit holders, and mentoring by civil servants for competitive exams including UPSC, UPPSC, JEE, NEET, NDA, and CDS.",
                "Youth residing in Uttar Pradesh preparing for national and state-level competitive examinations whose families cannot afford expensive private coaching.",
                "https://abhyuday.up.gov.in/",
                List.of("AADHAAR", "RESIDENCE_PROOF", "EDUCATION_CERTIFICATE"),
                "Register online at the official Abhyudaya portal (abhyuday.up.gov.in), choose the examination track, and attend the online/offline eligibility screening test administered at divisional headquarters."));

        add(schemes, rules, requirements, steps, docs, upState(
                "Swami Vivekanand Yuva Sashaktikaran Yojana (DigiShakti)",
                "Education",
                "Department of IT and Electronics, Government of Uttar Pradesh",
                "Free smartphone or tablet loaded with pre-configured educational resources, digital skill portals, and employment links to promote digital literacy.",
                "Domicile youth of Uttar Pradesh currently enrolled in regular graduate, postgraduate, engineering, medical, diploma, or ITI programs in recognized institutions in Uttar Pradesh. Family income should be under ₹2,00,000.",
                "https://digishakti.up.gov.in/",
                List.of("AADHAAR", "RESIDENCE_PROOF", "EDUCATION_CERTIFICATE", "OFFICIAL_ID"),
                "Students do not need to apply individually. Educational institutions verify and upload enrolled student rosters directly onto the DigiShakti portal (digishakti.up.gov.in). Distribution is conducted on campus."));

        add(schemes, rules, requirements, steps, docs, upState(
                "UP Mukhyamantri Bal Seva Yojana",
                "Child welfare",
                "Department of Women and Child Development, Government of Uttar Pradesh",
                "Financial maintenance support of ₹4,000 per month per child up to age 18, free schooling in Kasturba Gandhi Balika Vidyalayas or Atal Residential Schools, and marriage financial assistance of ₹1,01,000 for eligible daughters.",
                "Children residing in Uttar Pradesh who lost both parents, legal guardian, or single earning breadwinner to COVID-19 or other causes. Child age must be 0 to 18 years. Family annual income up to ₹3,00,000 (income limit waived for COVID-orphaned children).",
                "https://wcd.up.gov.in/",
                List.of("AADHAAR", "BANK_ACCOUNT", "RESIDENCE_PROOF", "DEATH_CERTIFICATE", "BIRTH_CERTIFICATE"),
                "Submit an application to the District Probation Officer (DPO), Child Development Project Officer (CDPO), or Child Welfare Committee (CWC) within 2 years of the parent's demise along with death certificates and guardianship order."));

        add(schemes, rules, requirements, steps, docs, upState(
                "UP Vishwakarma Shram Samman Yojana",
                "Livelihood",
                "Directorate of Industries and Enterprise Promotion, Government of Uttar Pradesh",
                "Free 6-day advanced skill upgradation training and free modern specialized toolkits (valued between ₹10,000 and ₹15,000) for traditional urban and rural craftspeople (tailors, carpenters, potters, barbers, blacksmiths, cobblers, weavers).",
                "Traditional artisans and craftspeople aged 18 years and above residing in Uttar Pradesh. Must not have availed similar toolkit assistance from any government scheme in the past 2 years.",
                "https://diupmsme.upsdc.gov.in/",
                List.of("AADHAAR", "BANK_ACCOUNT", "RESIDENCE_PROOF", "OFFICIAL_ID"),
                "Apply online through the DIUP MSME portal (diupmsme.upsdc.gov.in) under Vishwakarma Shram Samman Yojana, select trade, and attend interview/skill evaluation at the District Industries Centre (DIC)."));

        add(schemes, rules, requirements, steps, docs, upState(
                "One District One Product (ODOP) Margin Money Scheme",
                "MSME",
                "Department of MSME & Export Promotion, Government of Uttar Pradesh",
                "Margin money financial subsidy up to 25% of total project cost (up to ₹20,00,000 for projects up to ₹50 lakh; 20% or ₹10 lakh for projects up to ₹1 crore) for setting up or modernizing manufacturing units of designated ODOP products.",
                "Resident of Uttar Pradesh aged 18 years and above with educational qualification of at least Class 8 pass. The proposed manufacturing/processing enterprise must belong to the notified ODOP product category of the respective district.",
                "https://odopup.in/",
                List.of("AADHAAR", "BANK_ACCOUNT", "RESIDENCE_PROOF", "EDUCATION_CERTIFICATE", "OFFICIAL_ID"),
                "Register on the official ODOP portal (odopup.in or diupmsme.upsdc.gov.in), prepare a Detailed Project Report (DPR) for the notified district product, and submit application to the District Level Task Force Committee (DLTFC)."));

        add(schemes, rules, requirements, steps, docs, upState(
                "UP Mukhyamantri Gramodyog Rozgar Yojana",
                "Employment",
                "UP Khadi and Village Industries Board (UPKVIB), Government of Uttar Pradesh",
                "Bank finance up to ₹10,00,000 for establishing village and micro-enterprises in rural areas, with 100% interest subsidy on bank loan interest for reserved categories (SC/ST/OBC/Women/Minority/Divyang) and 4% interest subsidy for general category for 3 years.",
                "Rural resident of Uttar Pradesh aged between 18 and 50 years. Minimum educational qualification Class 8 pass or certified skill/ITI training in the proposed village industry.",
                "https://upkvib.gov.in/",
                List.of("AADHAAR", "BANK_ACCOUNT", "INCOME_CERTIFICATE", "RESIDENCE_PROOF", "EDUCATION_CERTIFICATE"),
                "Apply online through the UPKVIB portal (upkvib.gov.in) with rural residence proof, educational marksheets, and project appraisal. Recommended applications are sanctioned through lead district banks."));

        ensureStructuredEligibilityRules(schemes, rules);
        ensureTransparencyMetadata(schemes);
        if (validityRules != null) {
            ensureValidityRules(docs, validityRules);
        }
    }

    private void cleanLegacyKarnatakaSchemes(SchemeRepository schemes, SchemeEligibilityRuleRepository rules,
                                             SchemeDocumentRequirementRepository requirements,
                                             SchemeApplicationStepRepository steps) {
        List<String> legacyKarnatakaSchemes = List.of(
                "Gruha Jyothi", "Gruha Lakshmi", "Anna Bhagya", "Yuva Nidhi", "Shakti",
                "Scheduled Tribe Marriage Assistance Scheme", "SC Widow Re-Marriage Assistance Scheme",
                "Thayi Bhagya", "Bhagyalakshmi", "Madilu Kit"
        );
        for (String legacyName : legacyKarnatakaSchemes) {
            schemes.findByName(legacyName).ifPresent(legacyScheme -> {
                rules.deleteAll(rules.findBySchemeId(legacyScheme.getId()));
                requirements.deleteAll(requirements.findBySchemeId(legacyScheme.getId()));
                steps.deleteAll(steps.findBySchemeIdOrderByStepNumber(legacyScheme.getId()));
                schemes.delete(legacyScheme);
            });
        }
    }

    private Map<String, DocumentType> documentTypes(DocumentTypeRepository repository) {
        return List.of(
                new String[]{"AADHAAR", "Aadhaar card"},
                new String[]{"BANK_ACCOUNT", "Bank account details / Passbook"},
                new String[]{"RATION_CARD", "Ration card"},
                new String[]{"RESIDENCE_PROOF", "Residence / Domicile certificate"},
                new String[]{"ELECTRICITY_CONNECTION", "Domestic electricity connection number"},
                new String[]{"EDUCATION_CERTIFICATE", "Education certificate / Marksheet"},
                new String[]{"CASTE_CERTIFICATE", "Caste certificate"},
                new String[]{"OFFICIAL_ID", "Official identity document"},
                new String[]{"OFFICIAL_APPLICATION_FORM", "Official scheme application form"},
                new String[]{"INCOME_CERTIFICATE", "Income certificate"},
                new String[]{"DISABILITY_CERTIFICATE", "Disability certificate"},
                new String[]{"DEATH_CERTIFICATE", "Death certificate"},
                new String[]{"BIRTH_CERTIFICATE", "Birth certificate"}
        ).stream().map(value -> repository.findByCode(value[0]).orElseGet(() -> {
            DocumentType type = new DocumentType();
            type.setCode(value[0]);
            type.setName(value[1]);
            return repository.save(type);
        })).collect(java.util.stream.Collectors.toMap(DocumentType::getCode, type -> type));
    }

    private Scheme central(String name, String category, String authority, String benefit, String eligibility, String source, List<String> docs, String apply) {
        return scheme(name, GovernmentLevel.CENTRAL, null, category, authority, benefit, eligibility, source, docs, apply);
    }

    private Scheme upState(String name, String category, String authority, String benefit, String eligibility, String source, List<String> docs, String apply) {
        return scheme(name, GovernmentLevel.STATE, "Uttar Pradesh", category, authority, benefit, eligibility, source, docs, apply);
    }

    private Scheme scheme(String name, GovernmentLevel level, String state, String category, String authority, String benefit, String eligibility, String source, List<String> docs, String apply) {
        Scheme scheme = new Scheme();
        scheme.setName(name);
        scheme.setGovernmentLevel(level);
        scheme.setState(state);
        scheme.setCategory(category);
        scheme.setIssuingAuthority(authority);
        scheme.setBenefitInformation(benefit);
        scheme.setOfficialSourceUrl(source);
        scheme.setRawSchemeTextReference(source);
        scheme.setLastVerifiedAt(VERIFIED_AT);
        scheme.setStatus(SchemeStatus.ACTIVE);
        scheme.setEligibilityData(Map.of("criteria", eligibility, "source", source, "seedNote", "Seeded from verified official government source; confirm current terms at the source portal."));
        scheme.setOfficialApplicationFeeExists(false);
        scheme.setOfficialFeeAmount(0.0);

        if (level == GovernmentLevel.CENTRAL) {
            scheme.setOfficialApplicationChannel("Official Central Government Portal / Common Service Centres (CSC)");
            scheme.setOfficialGrievanceUrl("https://pgportal.gov.in/");
        } else if ("Uttar Pradesh".equalsIgnoreCase(state)) {
            scheme.setOfficialApplicationChannel("Official Uttar Pradesh Portal / Jan Seva Kendra (CSC)");
            scheme.setOfficialGrievanceUrl("https://jansunwai.up.gov.in/");
        } else {
            scheme.setOfficialApplicationChannel("Official State Portal / Citizen Service Centres");
            scheme.setOfficialGrievanceUrl("https://pgportal.gov.in/");
        }

        SchemeEligibilityRule rule = new SchemeEligibilityRule();
        rule.setRuleType("OFFICIAL_CRITERIA");
        rule.setRuleDescription(eligibility);
        rule.setDisplayOrder(1);
        rule.setRuleValue(source);
        scheme.getEligibilityRules().add(rule);

        SchemeApplicationStep step = new SchemeApplicationStep();
        step.setStepNumber(1);
        step.setTitle("Official application guidance");
        step.setInstructions(apply);
        step.setOfficialUrl(source);
        scheme.getApplicationSteps().add(step);

        docs.forEach(code -> {
            SchemeDocumentRequirement requirement = new SchemeDocumentRequirement();
            requirement.setNotes(code);
            requirement.setRequired(true);
            scheme.getDocumentRequirements().add(requirement);
        });

        return scheme;
    }

    private void add(SchemeRepository schemes, SchemeEligibilityRuleRepository rules,
                     SchemeDocumentRequirementRepository requirements, SchemeApplicationStepRepository steps,
                     Map<String, DocumentType> documentTypes, Scheme candidate) {
        if (schemes.findByName(candidate.getName()).isPresent()) {
            return;
        }

        List<SchemeEligibilityRule> candidateRules = candidate.getEligibilityRules();
        List<SchemeApplicationStep> candidateSteps = candidate.getApplicationSteps();
        List<SchemeDocumentRequirement> candidateRequirements = candidate.getDocumentRequirements();

        Scheme saved = schemes.save(candidate);

        candidateRules.forEach(rule -> {
            rule.setScheme(saved);
            rules.save(rule);
        });

        candidateSteps.forEach(step -> {
            step.setScheme(saved);
            steps.save(step);
        });

        candidateRequirements.forEach(requirement -> {
            String documentTypeCode = requirement.getNotes();
            requirement.setScheme(saved);
            requirement.setDocumentType(documentTypes.get(documentTypeCode));
            requirement.setNotes("Required or referenced by the official source; confirm current requirements before applying.");
            requirements.save(requirement);
        });
    }

    /** Adds machine-evaluable structured facts for deterministic eligibility calculation. */
    private void ensureStructuredEligibilityRules(SchemeRepository schemes, SchemeEligibilityRuleRepository rules) {
        // State residency requirement for all 14 Uttar Pradesh schemes
        List<String> upSchemes = List.of(
                "Mukhyamantri Kanya Sumangala Yojana",
                "UP Vridhavastha Pension Yojana",
                "UP Nirashrit Mahila Pension Yojana",
                "UP Divyangjan Pension Yojana",
                "UP Shadi Anudan Yojana",
                "UP Post-Matric Scholarship Scheme",
                "UP Gopalak Yojana",
                "UP Mukhyamantri Krishak Durghatna Kalyan Yojana",
                "Mukhyamantri Abhyudaya Yojana",
                "Swami Vivekanand Yuva Sashaktikaran Yojana (DigiShakti)",
                "UP Mukhyamantri Bal Seva Yojana",
                "UP Vishwakarma Shram Samman Yojana",
                "One District One Product (ODOP) Margin Money Scheme",
                "UP Mukhyamantri Gramodyog Rozgar Yojana"
        );
        upSchemes.forEach(name -> addRule(schemes, rules, name, "STATE", "Uttar Pradesh", "Applicant must be a permanent resident of Uttar Pradesh."));

        // Central schemes structured rules
        addRule(schemes, rules, "PM-KISAN", "OCCUPATION", "FARMER", "Applicant occupation must be farmer.");
        addRule(schemes, rules, "Pradhan Mantri Jan-Dhan Yojana (PMJDY)", "MIN_AGE", "10", "Applicant must be at least 10 years old.");
        addRule(schemes, rules, "Pradhan Mantri Jeevan Jyoti Bima Yojana (PMJJBY)", "MIN_AGE", "18", "Applicant must be at least 18 years old.");
        addRule(schemes, rules, "Pradhan Mantri Jeevan Jyoti Bima Yojana (PMJJBY)", "MAX_AGE", "50", "Applicant must be at most 50 years old.");
        addRule(schemes, rules, "Pradhan Mantri Suraksha Bima Yojana (PMSBY)", "MIN_AGE", "18", "Applicant must be at least 18 years old.");
        addRule(schemes, rules, "Pradhan Mantri Suraksha Bima Yojana (PMSBY)", "MAX_AGE", "70", "Applicant must be at most 70 years old.");
        addRule(schemes, rules, "PM Vishwakarma", "MIN_AGE", "18", "Applicant must be at least 18 years old.");
        addRule(schemes, rules, "PM Vishwakarma", "OCCUPATION", "ARTISAN|CRAFTSPERSON", "Applicant must be an artisan or craftsperson.");

        // Uttar Pradesh schemes specific structured rules
        addRule(schemes, rules, "Mukhyamantri Kanya Sumangala Yojana", "GENDER", "FEMALE", "Applicant must be female (girl child).");
        addRule(schemes, rules, "Mukhyamantri Kanya Sumangala Yojana", "MAX_INCOME", "300000", "Annual family income must not exceed ₹3,00,000.");

        addRule(schemes, rules, "UP Vridhavastha Pension Yojana", "MIN_AGE", "60", "Applicant must be at least 60 years old.");
        addRule(schemes, rules, "UP Vridhavastha Pension Yojana", "MAX_INCOME", "56460", "Annual family income must not exceed ₹56,460.");

        addRule(schemes, rules, "UP Nirashrit Mahila Pension Yojana", "MIN_AGE", "18", "Applicant must be at least 18 years old.");
        addRule(schemes, rules, "UP Nirashrit Mahila Pension Yojana", "GENDER", "FEMALE", "Applicant must be female.");
        addRule(schemes, rules, "UP Nirashrit Mahila Pension Yojana", "MAX_INCOME", "200000", "Annual family income must not exceed ₹2,00,000.");

        addRule(schemes, rules, "UP Divyangjan Pension Yojana", "MIN_AGE", "18", "Applicant must be at least 18 years old.");
        addRule(schemes, rules, "UP Divyangjan Pension Yojana", "DISABILITY_STATUS", "YES", "Applicant must have certified disability status (minimum 40%).");
        addRule(schemes, rules, "UP Divyangjan Pension Yojana", "MAX_INCOME", "56460", "Annual family income must not exceed ₹56,460.");

        addRule(schemes, rules, "UP Shadi Anudan Yojana", "MIN_AGE", "18", "Bride must be at least 18 years old.");
        addRule(schemes, rules, "UP Shadi Anudan Yojana", "MAX_INCOME", "56460", "Annual family income must not exceed ₹56,460.");

        addRule(schemes, rules, "UP Post-Matric Scholarship Scheme", "EDUCATION", "HIGHER_SECONDARY|GRADUATE|POST_GRADUATE|DIPLOMA", "Applicant must be enrolled in post-matric studies.");
        addRule(schemes, rules, "UP Post-Matric Scholarship Scheme", "MAX_INCOME", "250000", "Annual family income must not exceed ₹2,50,000.");

        addRule(schemes, rules, "UP Gopalak Yojana", "MIN_AGE", "18", "Applicant must be at least 18 years old.");
        addRule(schemes, rules, "UP Gopalak Yojana", "MAX_INCOME", "100000", "Annual family income must not exceed ₹1,00,000.");

        addRule(schemes, rules, "UP Mukhyamantri Krishak Durghatna Kalyan Yojana", "MIN_AGE", "18", "Applicant must be at least 18 years old.");
        addRule(schemes, rules, "UP Mukhyamantri Krishak Durghatna Kalyan Yojana", "MAX_AGE", "70", "Applicant must be at most 70 years old.");
        addRule(schemes, rules, "UP Mukhyamantri Krishak Durghatna Kalyan Yojana", "OCCUPATION", "FARMER|AGRICULTURAL_WORKER", "Applicant must be a farmer or agricultural worker.");

        addRule(schemes, rules, "Mukhyamantri Abhyudaya Yojana", "EDUCATION", "HIGHER_SECONDARY|GRADUATE", "Applicant must have completed higher secondary or college education.");

        addRule(schemes, rules, "Swami Vivekanand Yuva Sashaktikaran Yojana (DigiShakti)", "EDUCATION", "GRADUATE|POST_GRADUATE|DIPLOMA", "Applicant must be enrolled in graduation, post-graduation, or diploma.");
        addRule(schemes, rules, "Swami Vivekanand Yuva Sashaktikaran Yojana (DigiShakti)", "MAX_INCOME", "200000", "Annual family income must not exceed ₹2,00,000.");

        addRule(schemes, rules, "UP Mukhyamantri Bal Seva Yojana", "MAX_AGE", "18", "Child applicant must be at most 18 years old.");
        addRule(schemes, rules, "UP Mukhyamantri Bal Seva Yojana", "MAX_INCOME", "300000", "Annual family income must not exceed ₹3,00,000.");

        addRule(schemes, rules, "UP Vishwakarma Shram Samman Yojana", "MIN_AGE", "18", "Applicant must be at least 18 years old.");
        addRule(schemes, rules, "UP Vishwakarma Shram Samman Yojana", "OCCUPATION", "ARTISAN|CRAFTSPERSON", "Applicant must be a traditional artisan or craftsperson.");

        addRule(schemes, rules, "One District One Product (ODOP) Margin Money Scheme", "MIN_AGE", "18", "Applicant must be at least 18 years old.");

        addRule(schemes, rules, "UP Mukhyamantri Gramodyog Rozgar Yojana", "MIN_AGE", "18", "Applicant must be at least 18 years old.");
        addRule(schemes, rules, "UP Mukhyamantri Gramodyog Rozgar Yojana", "MAX_AGE", "50", "Applicant must be at most 50 years old.");
    }

    private void addRule(SchemeRepository schemes, SchemeEligibilityRuleRepository rules, String schemeName,
                         String type, String value, String description) {
        schemes.findByName(schemeName).ifPresent(scheme -> {
            boolean exists = rules.findBySchemeId(scheme.getId()).stream().anyMatch(rule -> rule.getRuleType().equals(type));
            if (exists) return;
            SchemeEligibilityRule rule = new SchemeEligibilityRule();
            rule.setScheme(scheme);
            rule.setRuleType(type);
            rule.setRuleValue(value);
            rule.setRuleDescription(description);
            rule.setDisplayOrder(100 + rules.findBySchemeId(scheme.getId()).size());
            rules.save(rule);
        });
    }

    private void ensureValidityRules(Map<String, DocumentType> docs, DocumentValidityRuleRepository validityRules) {
        DocumentType incomeCert = docs.get("INCOME_CERTIFICATE");
        if (incomeCert != null) {
            // Uttar Pradesh State Income Certificate: 36 months validity (3 years) as per UP Revenue Board / edistrict.up.gov.in guidelines, 60 days warning
            addValidityRuleIfNotPresent(validityRules, incomeCert, "Uttar Pradesh", null, "STATE_DEFAULT",
                    "Uttar Pradesh eDistrict Income Certificate valid for 36 months (3 years) from date of issue.",
                    36, null, null, null, 60);

            // Generic/Central Income Certificate: 12 months validity, 30 days warning
            addValidityRuleIfNotPresent(validityRules, incomeCert, null, null, "GENERIC_FALLBACK",
                    "Standard Income Certificate valid for 12 months (1 year) from issue date.",
                    12, null, null, null, 30);
        }

        DocumentType bankAccount = docs.get("BANK_ACCOUNT");
        if (bankAccount != null) {
            // Bank statement/passbook: 90 days freshness requirement, 15 days warning
            addValidityRuleIfNotPresent(validityRules, bankAccount, null, null, "FRESHNESS_REQUIREMENT",
                    "Bank statement or passbook copy must be recent (issued or updated within last 90 days).",
                    null, null, null, 90, 15);
        }

        DocumentType electricity = docs.get("ELECTRICITY_CONNECTION");
        if (electricity != null) {
            // Domestic electricity bill: 90 days freshness requirement, 15 days warning
            addValidityRuleIfNotPresent(validityRules, electricity, null, null, "FRESHNESS_REQUIREMENT",
                    "Domestic electricity bill or connection receipt must be issued within last 90 days.",
                    null, null, null, 90, 15);
        }
    }

    private void addValidityRuleIfNotPresent(DocumentValidityRuleRepository repository,
                                             DocumentType docType, String state, Scheme scheme,
                                             String ruleType, String description,
                                             Integer validityMonths, Integer validityDays,
                                             Integer freshnessMonths, Integer freshnessDays,
                                             Integer warningPeriodDays) {
        List<DocumentValidityRule> existing = repository.findByDocumentTypeId(docType.getId());
        boolean match = existing.stream().anyMatch(r -> {
            boolean sameState = (state == null && r.getState() == null) || (state != null && state.equalsIgnoreCase(r.getState()));
            boolean sameScheme = (scheme == null && r.getScheme() == null) || (scheme != null && scheme.equals(r.getScheme()));
            return sameState && sameScheme;
        });
        if (match) return;

        DocumentValidityRule rule = new DocumentValidityRule();
        rule.setDocumentType(docType);
        rule.setState(state);
        rule.setScheme(scheme);
        rule.setRuleType(ruleType);
        rule.setRuleDescription(description);
        rule.setValidityMonths(validityMonths);
        rule.setValidityDays(validityDays);
        rule.setFreshnessMonths(freshnessMonths);
        rule.setFreshnessDays(freshnessDays);
        rule.setWarningPeriodDays(warningPeriodDays);
        rule.setActive(true);
        repository.save(rule);
    }

    private void ensureTransparencyMetadata(SchemeRepository schemes) {
        schemes.findAll().forEach(scheme -> {
            boolean updated = false;
            if (scheme.getOfficialGrievanceUrl() == null || scheme.getOfficialGrievanceUrl().isBlank()) {
                if ("Uttar Pradesh".equalsIgnoreCase(scheme.getState())) {
                    scheme.setOfficialGrievanceUrl("https://jansunwai.up.gov.in/");
                    scheme.setOfficialApplicationChannel("Official Uttar Pradesh Portal / Jan Seva Kendra (CSC)");
                } else if ("Karnataka".equalsIgnoreCase(scheme.getState())) {
                    scheme.setOfficialGrievanceUrl("https://ipgrs.karnataka.gov.in/");
                    scheme.setOfficialApplicationChannel("Official Karnataka Seva Sindhu / Grama One Centres");
                } else {
                    scheme.setOfficialGrievanceUrl("https://pgportal.gov.in/");
                    scheme.setOfficialApplicationChannel("Official Central Government Portal / Common Service Centres (CSC)");
                }
                updated = true;
            }
            if ("Pradhan Mantri Jeevan Jyoti Bima Yojana (PMJJBY)".equalsIgnoreCase(scheme.getName())) {
                if (!scheme.isOfficialApplicationFeeExists() || scheme.getOfficialFeeAmount() == null || scheme.getOfficialFeeAmount() != 436.0) {
                    scheme.setOfficialApplicationFeeExists(true);
                    scheme.setOfficialFeeAmount(436.0);
                    scheme.setOfficialApplicationChannel("Participating Banks / Post Offices / Net Banking");
                    updated = true;
                }
            } else if ("Pradhan Mantri Suraksha Bima Yojana (PMSBY)".equalsIgnoreCase(scheme.getName())) {
                if (!scheme.isOfficialApplicationFeeExists() || scheme.getOfficialFeeAmount() == null || scheme.getOfficialFeeAmount() != 20.0) {
                    scheme.setOfficialApplicationFeeExists(true);
                    scheme.setOfficialFeeAmount(20.0);
                    scheme.setOfficialApplicationChannel("Participating Banks / Post Offices / Net Banking");
                    updated = true;
                }
            } else {
                if (scheme.getOfficialFeeAmount() == null) {
                    scheme.setOfficialFeeAmount(0.0);
                    scheme.setOfficialApplicationFeeExists(false);
                    updated = true;
                }
            }
            if (updated) {
                schemes.save(scheme);
            }
        });
    }
}
