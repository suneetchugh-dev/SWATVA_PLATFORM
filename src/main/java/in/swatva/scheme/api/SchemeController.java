package in.swatva.scheme.api;

import in.swatva.common.api.ApiResponse;
import in.swatva.common.exception.ResourceNotFoundException;
import in.swatva.scheme.model.Scheme;
import in.swatva.scheme.model.enums.GovernmentLevel;
import in.swatva.scheme.repository.SchemeRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import in.swatva.scheme.ChecklistService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.RequestMapping;
import in.swatva.transparency.api.SchemeTransparencyInfo;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/schemes")
public class SchemeController {
    private final SchemeRepository schemes;
    private final ChecklistService checklistService;

    public SchemeController(SchemeRepository schemes, ChecklistService checklistService) {
        this.schemes = schemes;
        this.checklistService = checklistService;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<SchemeSummary>>> list(
            @RequestParam(required = false) GovernmentLevel level,
            @RequestParam(required = false) String state) {
        List<Scheme> results = level == null ? schemes.findAll()
                : level == GovernmentLevel.STATE && state != null && !state.isBlank()
                ? schemes.findByGovernmentLevelAndStateIgnoreCase(level, state)
                : schemes.findByGovernmentLevel(level);
        return ResponseEntity.ok(ApiResponse.success(results.stream().map(SchemeSummary::from).toList()));
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<SchemeDetail>> get(@PathVariable UUID id) {
        Scheme scheme = schemes.findById(id).orElseThrow(() -> new ResourceNotFoundException("Scheme not found"));
        return ResponseEntity.ok(ApiResponse.success(SchemeDetail.from(scheme)));
    }

    @GetMapping("/{schemeId}/checklist")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<ActionChecklist>> getChecklist(
            @PathVariable UUID schemeId,
            Authentication authentication) {
        String email = authentication != null ? authentication.getName() : null;
        ActionChecklist checklist = checklistService.getChecklist(schemeId, email);
        return ResponseEntity.ok(ApiResponse.success(checklist));
    }

    @GetMapping("/{schemeId}/transparency")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<SchemeTransparencyInfo>> getTransparency(@PathVariable UUID schemeId) {
        Scheme scheme = schemes.findById(schemeId).orElseThrow(() -> new ResourceNotFoundException("Scheme not found with ID: " + schemeId));
        return ResponseEntity.ok(ApiResponse.success(SchemeTransparencyInfo.from(scheme)));
    }

    public record SchemeSummary(UUID id, String name, GovernmentLevel governmentLevel, String state, String category,
                                String benefitInformation, String issuingAuthority, String officialSourceUrl,
                                Instant lastVerifiedAt) {
        static SchemeSummary from(Scheme scheme) {
            return new SchemeSummary(scheme.getId(), scheme.getName(), scheme.getGovernmentLevel(), scheme.getState(), scheme.getCategory(),
                    scheme.getBenefitInformation(), scheme.getIssuingAuthority(), scheme.getOfficialSourceUrl(), scheme.getLastVerifiedAt());
        }
    }

    public record SchemeDetail(SchemeSummary scheme, java.util.Map<String, Object> eligibilityData,
                               List<String> eligibilityCriteria, List<DocumentRequirement> requiredDocuments,
                               List<ApplicationStep> applicationSteps, String rawSchemeTextReference,
                               SchemeTransparencyInfo transparency) {
        static SchemeDetail from(Scheme scheme) {
            return new SchemeDetail(SchemeSummary.from(scheme), scheme.getEligibilityData(),
                    scheme.getEligibilityRules().stream().map(rule -> rule.getRuleDescription()).toList(),
                    scheme.getDocumentRequirements().stream().map(requirement -> new DocumentRequirement(requirement.getDocumentType().getCode(), requirement.getDocumentType().getName(), requirement.isRequired(), requirement.getNotes())).toList(),
                    scheme.getApplicationSteps().stream().map(step -> new ApplicationStep(step.getStepNumber(), step.getTitle(), step.getInstructions(), step.getOfficialUrl())).toList(),
                    scheme.getRawSchemeTextReference(),
                    SchemeTransparencyInfo.from(scheme));
        }
    }
    public record DocumentRequirement(String code, String name, boolean required, String notes) { }
    public record ApplicationStep(Integer number, String title, String instructions, String officialUrl) { }
}
