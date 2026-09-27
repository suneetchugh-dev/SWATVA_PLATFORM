# Swatva AI — Backend Service

The core backend service for **SWATVA AI**, a personalized government-benefit discovery platform for Indian citizens. This repository branch is dedicated exclusively to the backend service: a Java 21 / Spring Boot modular monolith powered by PostgreSQL and Qdrant.

> **Note on Branching**: This `backend` branch contains only the Spring Boot service code. For the UI, see the `frontend` branch. For the integrated full platform, see `develop` and `main`. Detailed workflow: [`BRANCHES.md`](BRANCHES.md).

---

## Technology Stack

- **Runtime**: Java 21, Maven 3.9+
- **Framework**: Spring Boot 3.5.7, Spring Security (Stateless JWT), Spring Data JPA
- **Databases**:
  - PostgreSQL 15+ (Structured scheme rules, citizen profiles, documents, transparency reports)
  - Qdrant (Vector embeddings for scheme RAG retrieval & semantic Q&A)
- **Validation & Serialization**: Bean Validation, Hibernate `jsonb` mapping, Jackson

---

## Module Boundaries

The backend service is structured into modular packages under `in.swatva`:
- `auth`: BCrypt hashing, JWT issuance and stateless authentication filter.
- `user`: Progressive citizen profile, demographic criteria, and family members.
- `scheme`: Verified Central and State schemes catalogue, seeders, and action checklist.
- `eligibility`: Deterministic rule evaluator (evaluates `MIN_AGE`, `MAX_AGE`, `MAX_INCOME`, `STATE`, `OCCUPATION`, `CATEGORY`, `GENDER`, `DISABILITY_STATUS`).
- `readiness`: Application readiness engine computing red/yellow/green traffic-light status based on required documents.
- `document`: Citizen document locker, OCR metadata extraction, and state-specific validity rules.
- `ai`: Qdrant vector indexing, scheme chunking, semantic RAG search, and multi-turn chat assistant.
- `transparency`: Citizen transparency reports, fee tracking, and grievance statistics.
- `common`: Cross-cutting API envelope (`ApiResponse<T>`), base entity with audit timestamps, global exception handling.

---

## Prerequisites & Setup

### 1. Database Setup

Create the local PostgreSQL database:

```sql
CREATE DATABASE swatva_ai;
```

### 2. Environment Configuration

```bash
# PostgreSQL
export DB_URL="jdbc:postgresql://localhost:5432/swatva_ai"
export DB_USERNAME="postgres"
export DB_PASSWORD="your-password"
export JPA_DDL_AUTO="update"

# Security
export JWT_SECRET="a-long-random-secret-with-at-least-32-bytes"
export JWT_EXPIRATION_MINUTES="1440"

# Qdrant Vector DB & AI
export QDRANT_HOST="localhost"
export QDRANT_PORT="6334"
export QDRANT_COLLECTION_NAME="swatva_schemes"
export OPENAI_API_KEY="demo-key"
```

### 3. Build & Run

```bash
# Run locally with Maven
mvn spring-boot:run

# Or package into an executable JAR
mvn clean package -DskipTests
java -jar target/swatva-ai-0.0.1-SNAPSHOT.jar
```

Verify health:
```bash
curl http://localhost:8080/api/v1/health
```

---

## Seeded Scheme Catalogue (20 Verified Schemes)

On startup, `SchemeDataInitializer` seeds a verified catalogue of **20 real government schemes**:
- **6 Central Government schemes**: PM-KISAN, AB-PMJAY, PMJDY, PMJJBY, PMSBY, PM Vishwakarma
- **14 Uttar Pradesh Government schemes**: Mukhyamantri Kanya Sumangala, UP Vridhavastha Pension, UP Nirashrit Mahila Pension, UP Divyangjan Pension, UP Shadi Anudan, UP Post-Matric Scholarship, UP Gopalak Yojana, UP Krishak Durghatna Kalyan, Mukhyamantri Abhyudaya, DigiShakti, UP Bal Seva Yojana, UP Vishwakarma Shram Samman, ODOP Margin Money, UP Gramodyog Rozgar

For complete rule definitions and official government sources, refer to [`DATASET.md`](DATASET.md).

---

## API Reference

All responses use the shared API envelope: `ApiResponse<T>` (`success`, `data`, `error`, `timestamp`).

### Public Catalogue & Health
```text
GET  /api/v1/health
GET  /api/schemes
GET  /api/schemes/{id}
GET  /api/schemes?level=CENTRAL
GET  /api/schemes?level=STATE&state=Uttar%20Pradesh
```

### Authentication & Profile
```text
POST /api/auth/register
POST /api/auth/login
GET  /api/users/me
PUT  /api/users/me/profile
```

### Eligibility & Benefits
```text
GET  /api/eligibility/matches           # Deterministic rule evaluation
GET  /api/benefits/recommended          # Recommended schemes by level
GET  /api/benefits/missed-value         # Estimated annual monetary benefit
POST /api/benefits/life-event           # Life-event based discovery
GET  /api/schemes/{id}/checklist        # Action checklist for scheme
GET  /api/readiness/scheme/{schemeId}   # Readiness score (RED/YELLOW/GREEN)
```

### Document Locker & AI Layer
```text
GET  /api/documents                     # List stored documents
POST /api/documents                     # Register/upload document
POST /api/documents/{id}/validate       # Validate document against rules
POST /api/ai/scheme-query               # Semantic RAG search across scheme docs
POST /api/ai/scheme/{id}/explanation    # AI-grounded explanation of match
POST /api/ai/index                      # Index chunks to Qdrant
POST /api/chat                          # Conversational assistance
POST /api/transparency/reports          # Anonymous report submission
GET  /api/transparency/summary          # Aggregate transparency statistics
```

---

## Running Tests

Unit and integration tests are under `src/test/java`:

```bash
mvn test
```
