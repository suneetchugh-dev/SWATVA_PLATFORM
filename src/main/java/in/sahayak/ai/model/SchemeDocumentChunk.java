package in.sahayak.ai.model;

import in.sahayak.common.persistence.BaseEntity;
import in.sahayak.scheme.model.enums.GovernmentLevel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.ai.document.Document;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "scheme_document_chunks")
public class SchemeDocumentChunk extends BaseEntity {

    @Column(nullable = false)
    private UUID schemeId;

    @Column(nullable = false, length = 200)
    private String schemeName;

    @Column(nullable = false, length = 50)
    private String documentType;

    @Column(nullable = false, columnDefinition = "text")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private GovernmentLevel governmentLevel;

    @Column(length = 100)
    private String state;

    @Column(nullable = false, length = 80)
    private String category;

    @Column(length = 1000)
    private String sourceUrl;

    @Column(length = 64)
    private String pointId;

    public Document toSpringAiDocument() {
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("schemeId", schemeId.toString());
        metadata.put("schemeName", schemeName);
        metadata.put("governmentLevel", governmentLevel.name());
        metadata.put("state", state != null ? state : "");
        metadata.put("category", category);
        metadata.put("documentType", documentType);
        if (sourceUrl != null) {
            metadata.put("sourceUrl", sourceUrl);
        }
        String docId = pointId != null ? pointId : (getId() != null ? getId().toString() : UUID.randomUUID().toString());
        return new Document(docId, content, metadata);
    }
}
