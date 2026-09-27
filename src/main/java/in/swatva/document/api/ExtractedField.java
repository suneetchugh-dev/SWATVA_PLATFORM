package in.swatva.document.api;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ExtractedField<T>(
        T value,
        Double confidence,
        String reviewStatus
) {
    public static <T> ExtractedField<T> of(T value, Double confidence, String reviewStatus) {
        return new ExtractedField<>(value, confidence, reviewStatus);
    }

    public static <T> ExtractedField<T> notFound() {
        return new ExtractedField<>(null, 0.0, "NOT_FOUND");
    }

    public static <T> ExtractedField<T> manual(T value) {
        return new ExtractedField<>(value, 1.0, "VERIFIED_BY_USER");
    }
}
