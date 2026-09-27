package in.sahayak.ai.api;

import java.util.List;

/**
 * Structured signals extracted by the LLM from a citizen's natural language life-event description.
 * Strictly avoids making eligibility decisions; serves purely as input to the deterministic rules engine and RAG.
 */
public record LifeEventSignals(
        String eventType,
        String affectedFamilyMember,
        String occupation,
        String education,
        String location,
        Double income,
        List<String> relevantCircumstances
) {
    public static LifeEventSignals of(
            String eventType,
            String affectedFamilyMember,
            String occupation,
            String education,
            String location,
            Double income,
            List<String> relevantCircumstances
    ) {
        return new LifeEventSignals(
                eventType != null ? eventType : "GENERAL_LIFE_EVENT",
                affectedFamilyMember,
                occupation,
                education,
                location,
                income,
                relevantCircumstances != null ? relevantCircumstances : List.of()
        );
    }
}
