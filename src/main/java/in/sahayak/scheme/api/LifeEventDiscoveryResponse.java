package in.sahayak.scheme.api;

import in.sahayak.ai.api.LifeEventSignals;
import java.util.List;

public record LifeEventDiscoveryResponse(
        String lifeEventDescription,
        LifeEventSignals extractedSignals,
        List<LifeEventSchemeMatch> centralSchemes,
        List<LifeEventSchemeMatch> stateSchemes,
        int totalSurfacedSchemes
) {
    public static LifeEventDiscoveryResponse of(
            String description,
            LifeEventSignals signals,
            List<LifeEventSchemeMatch> central,
            List<LifeEventSchemeMatch> state
    ) {
        List<LifeEventSchemeMatch> c = central != null ? central : List.of();
        List<LifeEventSchemeMatch> s = state != null ? state : List.of();
        return new LifeEventDiscoveryResponse(description, signals, c, s, c.size() + s.size());
    }
}
