package in.sahayak.transparency.api;

import in.sahayak.transparency.model.enums.ReportCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/**
 * Request payload for submitting an anonymous transparency report.
 * Strictly avoids accepting citizen identity, contact information, or IP address.
 */
public record CreateTransparencyReportRequest(
        @NotBlank(message = "Department is required")
        String department,

        String officeLocation,

        @NotBlank(message = "District is required")
        String district,

        @NotBlank(message = "State is required")
        String state,

        @NotNull(message = "Report category is required")
        ReportCategory reportCategory,

        @NotBlank(message = "Description is required")
        @Size(min = 10, max = 2000, message = "Description must be between 10 and 2000 characters")
        String description,

        UUID schemeId,
        String schemeName
) {
}
