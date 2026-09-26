package in.sahayak.ai.api;

public record IndexResult(
        int schemesIndexed,
        int chunksIndexed,
        String message
) {}
