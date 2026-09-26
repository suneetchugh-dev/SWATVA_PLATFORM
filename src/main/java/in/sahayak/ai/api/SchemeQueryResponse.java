package in.sahayak.ai.api;

import java.util.List;

public record SchemeQueryResponse(
        String query,
        String answer,
        boolean grounded,
        List<SchemeCitation> citations,
        List<RetrievedChunkDto> retrievedChunks
) {}
