package in.swatva.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import in.swatva.ai.api.LifeEventSignals;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class LifeEventSignalExtractionService {

    private static final Logger log = LoggerFactory.getLogger(LifeEventSignalExtractionService.class);

    private final ChatModel chatModel;
    private final ObjectMapper objectMapper;

    @Autowired
    public LifeEventSignalExtractionService(@Autowired(required = false) ChatModel chatModel,
                                            ObjectMapper objectMapper) {
        this.chatModel = chatModel;
        this.objectMapper = objectMapper;
    }

    public LifeEventSignals extractSignals(String description) {
        if (description == null || description.isBlank()) {
            return LifeEventSignals.of("GENERAL_LIFE_EVENT", "SELF", null, null, null, null, List.of());
        }

        if (chatModel != null) {
            try {
                return extractWithLlm(description);
            } catch (Exception ex) {
                log.warn("LLM life-event extraction failed ({}), using deterministic fallback extractor: {}",
                        ex.getClass().getSimpleName(), ex.getMessage());
            }
        }

        return fallbackDeterministicExtractor(description);
    }

    private LifeEventSignals extractWithLlm(String description) throws Exception {
        String prompt = """
                You are Swatva AI's citizen life-event signal extractor for Indian benefit discovery.
                Analyze the following citizen situation or life event:

                [CITIZEN DESCRIPTION]:
                %s

                CRITICAL INSTRUCTIONS:
                1. Extract structured signals into raw JSON ONLY.
                2. Fields:
                   - "eventType": category, e.g. "HIGHER_EDUCATION", "FARMING_AGRICULTURE", "JOB_LOSS_UNEMPLOYMENT", "CHILDBIRTH_MATERNITY", "MARRIAGE", "SENIOR_CITIZEN_RETIREMENT", "HEALTHCARE_EMERGENCY", "LIVELIHOOD_ARTISAN", "GENERAL_LIFE_EVENT"
                   - "affectedFamilyMember": "SELF", "FATHER", "MOTHER", "DAUGHTER", "SON", "SPOUSE", or "FAMILY"
                   - "occupation": exact occupation if mentioned or strongly implied (e.g. "FARMER", "ARTISAN", "UNEMPLOYED", "STUDENT"), else null
                   - "education": education level if mentioned or implied (e.g. "COLLEGE", "GRADUATE", "DIPLOMA", "10TH_PASS"), else null
                   - "location": state or district if mentioned (e.g. "Karnataka"), else null
                   - "income": numeric annual family income in INR (e.g. 200000.0), or null if not stated
                   - "relevantCircumstances": array of concise strings summarizing key factual points from the situation
                3. STRICT CONSTRAINT: Do NOT make any eligibility decisions. Extract signals only.
                4. Output STRICT raw JSON ONLY without markdown fences or additional text.
                """.formatted(description);

        String response = chatModel.call(prompt);
        if (response == null || response.isBlank()) {
            throw new IllegalStateException("Empty response from ChatModel");
        }

        String cleaned = cleanJsonOutput(response);
        JsonNode root = objectMapper.readTree(cleaned);

        String eventType = root.has("eventType") && !root.get("eventType").isNull()
                ? root.get("eventType").asText("GENERAL_LIFE_EVENT") : "GENERAL_LIFE_EVENT";
        String affectedFamilyMember = root.has("affectedFamilyMember") && !root.get("affectedFamilyMember").isNull()
                ? root.get("affectedFamilyMember").asText("SELF") : "SELF";
        String occupation = root.has("occupation") && !root.get("occupation").isNull()
                ? root.get("occupation").asText(null) : null;
        String education = root.has("education") && !root.get("education").isNull()
                ? root.get("education").asText(null) : null;
        String location = root.has("location") && !root.get("location").isNull()
                ? root.get("location").asText(null) : null;
        Double income = root.has("income") && !root.get("income").isNull() && root.get("income").isNumber()
                ? root.get("income").asDouble() : null;

        List<String> circumstances = new ArrayList<>();
        if (root.has("relevantCircumstances") && root.get("relevantCircumstances").isArray()) {
            for (JsonNode item : root.get("relevantCircumstances")) {
                if (item.isTextual() && !item.asText().isBlank()) {
                    circumstances.add(item.asText().trim());
                }
            }
        }
        if (circumstances.isEmpty()) {
            circumstances.add(description.trim());
        }

        return LifeEventSignals.of(
                eventType,
                affectedFamilyMember,
                occupation,
                education,
                location,
                income,
                circumstances
        );
    }

    private String cleanJsonOutput(String raw) {
        String trimmed = raw.trim();
        if (trimmed.startsWith("```json")) {
            trimmed = trimmed.substring(7);
        } else if (trimmed.startsWith("```")) {
            trimmed = trimmed.substring(3);
        }
        if (trimmed.endsWith("```")) {
            trimmed = trimmed.substring(0, trimmed.length() - 3);
        }
        return trimmed.trim();
    }

    /**
     * Deterministic rule-based signal extractor for reliable performance and offline testing.
     */
    public LifeEventSignals fallbackDeterministicExtractor(String description) {
        String lower = description.toLowerCase();

        // 1. Affected Family Member
        String affectedMember = "SELF";
        if (lower.contains("daughter") || lower.contains("girl")) {
            affectedMember = "DAUGHTER";
        } else if (lower.contains("father") || lower.contains("dad")) {
            affectedMember = "FATHER";
        } else if (lower.contains("mother") || lower.contains("mom")) {
            affectedMember = "MOTHER";
        } else if (lower.contains("son") || lower.contains("boy")) {
            affectedMember = "SON";
        } else if (lower.contains("wife") || lower.contains("husband") || lower.contains("spouse")) {
            affectedMember = "SPOUSE";
        } else if (lower.contains("family") || lower.contains("household") || lower.contains("parents")) {
            affectedMember = "FAMILY";
        }

        // 2. Event Type
        String eventType = "GENERAL_LIFE_EVENT";
        if (lower.contains("college") || lower.contains("university") || lower.contains("started college") || lower.contains("higher education") || lower.contains("studies")) {
            eventType = "HIGHER_EDUCATION";
        } else if (lower.contains("farmer") || lower.contains("farming") || lower.contains("cultivat") || lower.contains("crop") || lower.contains("agriculture")) {
            eventType = "FARMING_AGRICULTURE";
        } else if (lower.contains("lost my job") || lower.contains("lost job") || lower.contains("unemployed") || lower.contains("job loss") || lower.contains("laid off")) {
            eventType = "JOB_LOSS_UNEMPLOYMENT";
        } else if (lower.contains("pregnant") || lower.contains("delivery") || lower.contains("maternity") || lower.contains("newborn") || lower.contains("childbirth")) {
            eventType = "CHILDBIRTH_MATERNITY";
        } else if (lower.contains("marriage") || lower.contains("marry") || lower.contains("wedding")) {
            eventType = "MARRIAGE";
        } else if (lower.contains("artisan") || lower.contains("craftsperson") || lower.contains("carpenter") || lower.contains("blacksmith") || lower.contains("weaver")) {
            eventType = "LIVELIHOOD_ARTISAN";
        } else if (lower.contains("hospital") || lower.contains("medical") || lower.contains("disease") || lower.contains("health") || lower.contains("surgery")) {
            eventType = "HEALTHCARE_EMERGENCY";
        } else if (lower.contains("retired") || lower.contains("retirement") || lower.contains("senior citizen") || lower.contains("old age")) {
            eventType = "SENIOR_CITIZEN_RETIREMENT";
        }

        // 3. Occupation
        String occupation = null;
        if (lower.contains("farmer") || lower.contains("farming") || lower.contains("cultivator")) {
            occupation = "FARMER";
        } else if (lower.contains("unemployed") || lower.contains("lost my job") || lower.contains("lost job") || lower.contains("jobless")) {
            occupation = "UNEMPLOYED";
        } else if (lower.contains("artisan") || lower.contains("craftsperson") || lower.contains("weaver") || lower.contains("carpenter")) {
            occupation = "ARTISAN";
        } else if (lower.contains("started college") || lower.contains("student") || lower.contains("studying in college")) {
            occupation = "STUDENT";
        }

        // 4. Education
        String education = null;
        if (lower.contains("college") || lower.contains("university")) {
            education = "COLLEGE";
        } else if (lower.contains("graduate") || lower.contains("graduation") || lower.contains("degree")) {
            education = "GRADUATE";
        } else if (lower.contains("diploma")) {
            education = "DIPLOMA";
        } else if (lower.contains("10th") || lower.contains("sslc")) {
            education = "10TH_PASS";
        } else if (lower.contains("12th") || lower.contains("puc")) {
            education = "12TH_PASS";
        }

        // 5. Location (State)
        String location = extractLocation(lower);

        // 6. Income
        Double income = extractIncome(lower);

        // 7. Relevant Circumstances
        List<String> circumstances = new ArrayList<>();
        if (eventType.equals("HIGHER_EDUCATION")) {
            circumstances.add(affectedMember.equals("DAUGHTER") ? "Daughter started higher education in college" : "Enrolled in higher education / college");
        } else if (eventType.equals("FARMING_AGRICULTURE")) {
            circumstances.add("Family engaged in agriculture / farming");
        } else if (eventType.equals("JOB_LOSS_UNEMPLOYMENT")) {
            circumstances.add("Recent job loss; seeking unemployment and welfare benefits");
        }
        if (income != null) {
            circumstances.add("Annual family income approximately \u20B9" + Math.round(income));
        }
        if (location != null) {
            circumstances.add("Located in " + location);
        }
        if (circumstances.isEmpty()) {
            circumstances.add(description.trim());
        }

        return LifeEventSignals.of(
                eventType,
                affectedMember,
                occupation,
                education,
                location,
                income,
                circumstances
        );
    }

    private String extractLocation(String lower) {
        if (lower.contains("karnataka") || lower.contains("bangalore") || lower.contains("bengaluru") || lower.contains("mysore") || lower.contains("mysuru")) {
            return "Karnataka";
        } else if (lower.contains("maharashtra") || lower.contains("mumbai") || lower.contains("pune")) {
            return "Maharashtra";
        } else if (lower.contains("delhi")) {
            return "Delhi";
        } else if (lower.contains("tamil nadu") || lower.contains("chennai")) {
            return "Tamil Nadu";
        } else if (lower.contains("kerala")) {
            return "Kerala";
        } else if (lower.contains("uttar pradesh") || lower.contains("lucknow")) {
            return "Uttar Pradesh";
        } else if (lower.contains("bihar") || lower.contains("patna")) {
            return "Bihar";
        } else if (lower.contains("gujarat") || lower.contains("ahmedabad")) {
            return "Gujarat";
        }
        return null;
    }

    private Double extractIncome(String lower) {
        // e.g. "below ₹2 lakh", "under 2 lakh", "2,00,000", "below 1.5 lakh"
        Matcher lakhMatcher = Pattern.compile("(?:income|earning|family income)[\\w\\s:]*?(?:below|under|less than|is|of)?[\\s₹rs.]*(\\d+(?:\\.\\d+)?)\\s*(?:lakh|lac)", Pattern.CASE_INSENSITIVE).matcher(lower);
        if (lakhMatcher.find()) {
            try {
                double lakhs = Double.parseDouble(lakhMatcher.group(1));
                return lakhs * 100000.0;
            } catch (Exception ignored) {}
        }

        // Just "₹2 lakh" or "2 lakh" anywhere
        Matcher standaloneLakh = Pattern.compile("[₹rs.]*(\\d+(?:\\.\\d+)?)\\s*(?:lakh|lac)", Pattern.CASE_INSENSITIVE).matcher(lower);
        if (standaloneLakh.find()) {
            try {
                double lakhs = Double.parseDouble(standaloneLakh.group(1));
                return lakhs * 100000.0;
            } catch (Exception ignored) {}
        }

        // Numeric income: e.g. "200000" or "2,00,000"
        Matcher numMatcher = Pattern.compile("(?:income)[\\w\\s:]*?[₹rs.]*(\\d{1,3}(?:,\\d{3})+|\\d{4,8})", Pattern.CASE_INSENSITIVE).matcher(lower);
        if (numMatcher.find()) {
            try {
                String clean = numMatcher.group(1).replace(",", "");
                return Double.parseDouble(clean);
            } catch (Exception ignored) {}
        }

        return null;
    }
}
