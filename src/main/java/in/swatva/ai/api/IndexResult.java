package in.swatva.ai.api;

public record IndexResult(
        int schemesIndexed,
        int chunksIndexed,
        String message
) {}
