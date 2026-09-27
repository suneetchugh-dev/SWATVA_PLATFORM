package in.sahayak.transparency.api;

import in.sahayak.common.api.ApiResponse;
import in.sahayak.transparency.service.TransparencyService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/transparency")
public class TransparencyController {

    private final TransparencyService transparencyService;

    public TransparencyController(TransparencyService transparencyService) {
        this.transparencyService = transparencyService;
    }

    @PostMapping("/reports")
    public ResponseEntity<ApiResponse<TransparencyReportResponse>> submitAnonymousReport(
            @Valid @RequestBody CreateTransparencyReportRequest request) {
        TransparencyReportResponse response = transparencyService.submitAnonymousReport(request);
        return ResponseEntity
                .created(URI.create("/api/transparency/reports/" + response.reportId()))
                .body(ApiResponse.success(response));
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<TransparencySummaryResponse>> getSummary(
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String department) {
        TransparencySummaryResponse summary = transparencyService.getAnonymizedSummary(state, district, department);
        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    @GetMapping("/schemes/{schemeId}")
    public ResponseEntity<ApiResponse<SchemeTransparencyInfo>> getSchemeTransparency(
            @PathVariable UUID schemeId) {
        SchemeTransparencyInfo info = transparencyService.getSchemeTransparency(schemeId);
        return ResponseEntity.ok(ApiResponse.success(info));
    }
}
