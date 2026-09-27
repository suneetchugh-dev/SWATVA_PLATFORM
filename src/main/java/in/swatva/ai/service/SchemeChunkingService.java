package in.swatva.ai.service;

import in.swatva.ai.model.SchemeDocumentChunk;
import in.swatva.ai.model.enums.ChunkDocumentType;
import in.swatva.scheme.model.Scheme;
import in.swatva.scheme.model.SchemeApplicationStep;
import in.swatva.scheme.model.SchemeDocumentRequirement;
import in.swatva.scheme.model.SchemeEligibilityRule;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class SchemeChunkingService {

    public List<SchemeDocumentChunk> prepareChunks(Scheme scheme) {
        List<SchemeDocumentChunk> chunks = new ArrayList<>();
        chunks.add(prepareEligibilityExplanationChunk(scheme));
        chunks.add(prepareBenefitsChunk(scheme));
        chunks.add(prepareRequiredDocumentsChunk(scheme));
        chunks.add(prepareApplicationProcessChunk(scheme));
        chunks.add(prepareImportantConditionsChunk(scheme));
        chunks.add(prepareFaqsAndRawTextChunk(scheme));
        return chunks;
    }

    private SchemeDocumentChunk prepareEligibilityExplanationChunk(Scheme scheme) {
        StringBuilder sb = new StringBuilder();
        sb.append("Scheme Name: ").append(scheme.getName()).append("\n");
        sb.append("Level: ").append(scheme.getGovernmentLevel());
        if (scheme.getState() != null && !scheme.getState().isBlank()) {
            sb.append(" (State: ").append(scheme.getState()).append(")");
        }
        sb.append("\nCategory: ").append(scheme.getCategory()).append("\n");
        sb.append("Issuing Authority: ").append(scheme.getIssuingAuthority()).append("\n\n");

        sb.append("Eligibility Explanation & Criteria:\n");
        Map<String, Object> eligibilityData = scheme.getEligibilityData();
        if (eligibilityData != null && eligibilityData.get("criteria") != null) {
            sb.append(eligibilityData.get("criteria")).append("\n");
        }

        if (scheme.getEligibilityRules() != null && !scheme.getEligibilityRules().isEmpty()) {
            sb.append("\nDetailed Eligibility Rules:\n");
            for (SchemeEligibilityRule rule : scheme.getEligibilityRules()) {
                sb.append("- ").append(rule.getRuleDescription());
                if (rule.getRuleType() != null) {
                    sb.append(" [Rule Type: ").append(rule.getRuleType()).append("]");
                }
                sb.append("\n");
            }
        }
        sb.append("\nOfficial Verification Source: ").append(scheme.getOfficialSourceUrl());

        return buildChunk(scheme, ChunkDocumentType.ELIGIBILITY_EXPLANATION, sb.toString());
    }

    private SchemeDocumentChunk prepareBenefitsChunk(Scheme scheme) {
        StringBuilder sb = new StringBuilder();
        sb.append("Scheme Name: ").append(scheme.getName()).append("\n");
        sb.append("Category: ").append(scheme.getCategory()).append("\n");
        sb.append("Issuing Authority: ").append(scheme.getIssuingAuthority()).append("\n\n");
        sb.append("Benefits Provided:\n");
        if (scheme.getBenefitInformation() != null && !scheme.getBenefitInformation().isBlank()) {
            sb.append(scheme.getBenefitInformation()).append("\n");
        } else {
            sb.append("Details of the benefits are described on the official government portal.\n");
        }
        if (scheme.isOfficialApplicationFeeExists()) {
            sb.append("\nOfficial Application Fee: ₹")
                    .append(scheme.getOfficialFeeAmount() != null ? scheme.getOfficialFeeAmount() : 0.0)
                    .append(" (payable through authorized official channels only)\n");
        } else {
            sb.append("\nOfficial Application Fee: Free (No application fee)\n");
        }
        if (scheme.getTransparencyWarning() != null && !scheme.getTransparencyWarning().isBlank()) {
            sb.append("Transparency Notice: ").append(scheme.getTransparencyWarning()).append("\n");
        }
        sb.append("\nOfficial Source: ").append(scheme.getOfficialSourceUrl());

        return buildChunk(scheme, ChunkDocumentType.BENEFITS, sb.toString());
    }

    private SchemeDocumentChunk prepareRequiredDocumentsChunk(Scheme scheme) {
        StringBuilder sb = new StringBuilder();
        sb.append("Scheme Name: ").append(scheme.getName()).append("\n");
        sb.append("Required Application Documents:\n");

        if (scheme.getDocumentRequirements() != null && !scheme.getDocumentRequirements().isEmpty()) {
            for (SchemeDocumentRequirement docReq : scheme.getDocumentRequirements()) {
                String docName = docReq.getDocumentType() != null ? docReq.getDocumentType().getName() : "Document";
                String docCode = docReq.getDocumentType() != null ? docReq.getDocumentType().getCode() : "UNKNOWN";
                sb.append("- ").append(docName).append(" (Code: ").append(docCode).append(")");
                sb.append(" | Mandatory: ").append(docReq.isRequired() ? "Yes" : "Optional");
                if (docReq.getNotes() != null && !docReq.getNotes().isBlank()) {
                    sb.append(" | Note: ").append(docReq.getNotes());
                }
                sb.append("\n");
            }
        } else {
            sb.append("No specific documents currently catalogued. Check the official portal before applying.\n");
        }
        sb.append("\nOfficial Source: ").append(scheme.getOfficialSourceUrl());

        return buildChunk(scheme, ChunkDocumentType.REQUIRED_DOCUMENTS, sb.toString());
    }

    private SchemeDocumentChunk prepareApplicationProcessChunk(Scheme scheme) {
        StringBuilder sb = new StringBuilder();
        sb.append("Scheme Name: ").append(scheme.getName()).append("\n");
        sb.append("Issuing Authority: ").append(scheme.getIssuingAuthority()).append("\n");
        sb.append("Official Application Portal / Where to Apply: ").append(scheme.getOfficialSourceUrl()).append("\n\n");
        if (scheme.getOfficialApplicationChannel() != null && !scheme.getOfficialApplicationChannel().isBlank()) {
            sb.append("Official Application Channel: ").append(scheme.getOfficialApplicationChannel()).append("\n");
        }
        if (scheme.getOfficialGrievanceUrl() != null && !scheme.getOfficialGrievanceUrl().isBlank()) {
            sb.append("Official Grievance Redressal Portal: ").append(scheme.getOfficialGrievanceUrl()).append("\n");
        }
        sb.append("\nStep-by-step Application Process:\n");

        if (scheme.getApplicationSteps() != null && !scheme.getApplicationSteps().isEmpty()) {
            for (SchemeApplicationStep step : scheme.getApplicationSteps()) {
                sb.append("Step ").append(step.getStepNumber() != null ? step.getStepNumber() : 1)
                        .append(": ").append(step.getTitle()).append("\n");
                if (step.getInstructions() != null && !step.getInstructions().isBlank()) {
                    sb.append("Instructions: ").append(step.getInstructions()).append("\n");
                }
                if (step.getOfficialUrl() != null && !step.getOfficialUrl().isBlank()) {
                    sb.append("Step Portal Link: ").append(step.getOfficialUrl()).append("\n");
                }
                sb.append("\n");
            }
        } else {
            sb.append("Follow instructions on the official government portal: ").append(scheme.getOfficialSourceUrl()).append("\n");
        }

        return buildChunk(scheme, ChunkDocumentType.APPLICATION_PROCESS, sb.toString());
    }

    private SchemeDocumentChunk prepareImportantConditionsChunk(Scheme scheme) {
        StringBuilder sb = new StringBuilder();
        sb.append("Scheme Name: ").append(scheme.getName()).append("\n");
        sb.append("Important Conditions, Prerequisites, and Exclusions:\n");

        if (scheme.getEligibilityRules() != null && !scheme.getEligibilityRules().isEmpty()) {
            for (SchemeEligibilityRule rule : scheme.getEligibilityRules()) {
                sb.append("- ").append(rule.getRuleDescription());
                if (rule.getRuleType() != null && !rule.getRuleType().isBlank()) {
                    sb.append(" (Condition Type: ").append(rule.getRuleType());
                    if (rule.getRuleValue() != null && !rule.getRuleValue().isBlank()) {
                        sb.append(", Value: ").append(rule.getRuleValue());
                    }
                    sb.append(")");
                }
                sb.append("\n");
            }
        } else {
            sb.append("General scheme conditions apply as notified by the issuing authority.\n");
        }
        sb.append("\nOfficial Verification Source: ").append(scheme.getOfficialSourceUrl());

        return buildChunk(scheme, ChunkDocumentType.IMPORTANT_CONDITIONS, sb.toString());
    }

    private SchemeDocumentChunk prepareFaqsAndRawTextChunk(Scheme scheme) {
        StringBuilder sb = new StringBuilder();
        sb.append("Scheme Name: ").append(scheme.getName()).append("\n");
        sb.append("Category: ").append(scheme.getCategory()).append("\n");
        sb.append("Issuing Authority: ").append(scheme.getIssuingAuthority()).append("\n");
        sb.append("Official Source Portal: ").append(scheme.getOfficialSourceUrl()).append("\n");

        if (scheme.getRawSchemeTextReference() != null && !scheme.getRawSchemeTextReference().isBlank()) {
            sb.append("Official Reference Document / Scheme Handbook: ").append(scheme.getRawSchemeTextReference()).append("\n");
        }

        Map<String, Object> eligibilityData = scheme.getEligibilityData();
        if (eligibilityData != null && eligibilityData.get("seedNote") != null) {
            sb.append("Reference Note: ").append(eligibilityData.get("seedNote")).append("\n");
        }

        if (scheme.getOfficialGrievanceUrl() != null && !scheme.getOfficialGrievanceUrl().isBlank()) {
            sb.append("Official Grievance Redressal Portal: ").append(scheme.getOfficialGrievanceUrl()).append("\n");
        }

        sb.append("\nFAQs and Official Guidance:\n");
        sb.append("Q: Where can I find the official scheme notification and current terms?\n");
        sb.append("A: Always verify the current terms at ").append(scheme.getOfficialSourceUrl());
        if (scheme.getRawSchemeTextReference() != null && !scheme.getRawSchemeTextReference().isBlank()) {
            sb.append(" or refer to ").append(scheme.getRawSchemeTextReference());
        }
        sb.append(".\n");

        return buildChunk(scheme, ChunkDocumentType.FAQS_OR_RAW_TEXT, sb.toString());
    }

    private SchemeDocumentChunk buildChunk(Scheme scheme, ChunkDocumentType type, String content) {
        SchemeDocumentChunk chunk = new SchemeDocumentChunk();
        chunk.setSchemeId(scheme.getId());
        chunk.setSchemeName(scheme.getName());
        chunk.setDocumentType(type.name());
        chunk.setContent(content);
        chunk.setGovernmentLevel(scheme.getGovernmentLevel());
        chunk.setState(scheme.getState());
        chunk.setCategory(scheme.getCategory());
        chunk.setSourceUrl(scheme.getOfficialSourceUrl());
        String seedKey = (scheme.getId() != null ? scheme.getId().toString() : scheme.getName()) + ":" + type.name();
        String deterministicPointId = UUID.nameUUIDFromBytes(seedKey.getBytes(java.nio.charset.StandardCharsets.UTF_8)).toString();
        chunk.setPointId(deterministicPointId);
        return chunk;
    }
}
