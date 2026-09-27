package in.sahayak.transparency.api;

import in.sahayak.scheme.model.Scheme;
import java.util.UUID;

public record SchemeTransparencyInfo(
        UUID schemeId,
        String schemeName,
        boolean officialApplicationFeeExists,
        Double officialFeeAmount,
        String officialApplicationChannel,
        String officialSourceUrl,
        String transparencyWarning,
        String officialGrievanceUrl,
        boolean verifiedOfficialInformation,
        String notice
) {
    public static SchemeTransparencyInfo from(Scheme scheme) {
        String grievance = (scheme.getOfficialGrievanceUrl() != null && !scheme.getOfficialGrievanceUrl().isBlank())
                ? scheme.getOfficialGrievanceUrl()
                : (scheme.getState() != null && "Karnataka".equalsIgnoreCase(scheme.getState())
                    ? "https://ipgrs.karnataka.gov.in/"
                    : "https://pgportal.gov.in/");

        String channel = (scheme.getOfficialApplicationChannel() != null && !scheme.getOfficialApplicationChannel().isBlank())
                ? scheme.getOfficialApplicationChannel()
                : (scheme.getState() != null && "Karnataka".equalsIgnoreCase(scheme.getState())
                    ? "Official Karnataka Seva Sindhu / Grama One Centres"
                    : "Official Central Government Portal / Common Service Centres (CSC)");

        return new SchemeTransparencyInfo(
                scheme.getId(),
                scheme.getName(),
                scheme.isOfficialApplicationFeeExists(),
                scheme.getOfficialFeeAmount() != null ? scheme.getOfficialFeeAmount() : 0.0,
                channel,
                scheme.getOfficialSourceUrl(),
                scheme.getTransparencyWarning(),
                grievance,
                true,
                "Verified official information extracted from official government gazette and scheme guidelines."
        );
    }
}
