# Sahayak AI backend

Foundation for Sahayak AI, a personalized government-benefit discovery platform for Indian citizens. It is a single Spring Boot modular monolith: domain packages are separated in code while the service is deployed as one application.

## Technology

- Java 21, Spring Boot, Spring Web, Spring Security
- Spring Data JPA, PostgreSQL, Bean Validation
- Maven and Lombok (available for future boilerplate reduction)

The foundation provides module boundaries for `auth`, `user`, `scheme`, `eligibility`, `document`, `readiness`, `transparency`, `notification`, `ai`, and `common`. It contains no business features, vector database integration, LLM integration, or frontend.

## Prerequisites

- JDK 21
- Maven 3.9+
- PostgreSQL 15+ (or compatible)

Create the local database:

```sql
CREATE DATABASE sahayak_ai;
```

## Configure and run

Set secrets through the environment; do not commit credentials:

```powershell
$env:DB_URL = "jdbc:postgresql://localhost:5432/sahayak_ai"
$env:DB_USERNAME = "postgres"
$env:DB_PASSWORD = "your-password"
$env:JPA_DDL_AUTO = "validate"
```

Start the service:

```powershell
mvn spring-boot:run
```

Or build and run the JAR:

```powershell
mvn clean package
java -jar target/sahayak-ai-0.0.1-SNAPSHOT.jar
```

Verify the public foundation endpoint:

```powershell
Invoke-RestMethod http://localhost:8080/api/v1/health
```

All API responses use a shared envelope: `success`, `data`, `error`, and UTC `timestamp`. Errors have a stable `code`, safe `message`, and validation `fieldErrors` where relevant.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `DB_URL` | `jdbc:postgresql://localhost:5432/sahayak_ai` | JDBC connection URL |
| `DB_USERNAME` | `postgres` | Database user |
| `DB_PASSWORD` | `postgres` | Database password |
| `JPA_DDL_AUTO` | `validate` | Hibernate schema policy |
| `SERVER_PORT` | `8080` | HTTP port |
| `APP_LOG_LEVEL` | `INFO` | Application log level |
| `QDRANT_HOST` | `localhost` | Qdrant vector database hostname |
| `QDRANT_PORT` | `6334` | Qdrant gRPC port |
| `QDRANT_API_KEY` | (empty) | Qdrant API key |
| `QDRANT_COLLECTION_NAME` | `sahayak_schemes` | Qdrant vector collection name |
| `OPENAI_API_KEY` | `demo-key` | OpenAI API key for embeddings and LLM |

When adding the first entities, introduce versioned migrations. `JPA_DDL_AUTO=update` may be used only for local, short-lived development schemas.

## Seeded scheme catalogue

On startup, the service idempotently creates a demo catalogue of six Central Government schemes and ten Karnataka schemes. Seeded records retain the official source URL and a last-verified timestamp; always direct citizens to that source for the current terms.

The public catalogue endpoints are:

```text
GET /api/schemes
GET /api/schemes/{id}
GET /api/schemes?level=CENTRAL
GET /api/schemes?level=STATE&state=Karnataka
```

For this first schema-backed version, `JPA_DDL_AUTO` defaults to `update` so a fresh local PostgreSQL database can create its tables and receive the seed data. Replace it with versioned migrations and `validate` before a production deployment.

## Authentication and profile

JWT authentication uses BCrypt password hashes. Set a distinct secret outside local development:

```powershell
$env:JWT_SECRET = "a-long-random-secret-with-at-least-32-bytes"
$env:JWT_EXPIRATION_MINUTES = "1440"
```

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/users/me
PUT  /api/users/me/profile
```

Send `Authorization: Bearer <accessToken>` to the protected user endpoints. Profile updates are incremental: omit a field to leave it unchanged. Supplying `familyMembers` replaces that list; omitting it leaves the stored family information unchanged.

## Eligibility matches

```text
GET /api/eligibility/matches
```

This JWT-protected endpoint evaluates active Central schemes and State schemes for the user's recorded state. It returns deterministic results from persisted structured rules, including satisfied, failed, and missing conditions. Missing profile data is reported as missing information, not as automatic ineligibility.
 
## AI & RAG Layer

```text
POST /api/ai/scheme-query
POST /api/ai/scheme/{id}/explanation
POST /api/ai/index
```

- **Semantic Q&A (`POST /api/ai/scheme-query`)**: Publicly answers questions grounded strictly in retrieved scheme chunks (eligibility, benefits, required documents, application process, important conditions, and FAQs). If retrieved context is insufficient, explicitly states that verified information is lacking.
- **Personalized Explanation (`POST /api/ai/scheme/{id}/explanation`)**: JWT-protected endpoint providing a plain-language explanation of why a scheme matched the user based on the deterministic eligibility engine result and retrieved scheme facts. The LLM does NOT decide eligibility.
- **Vector Indexing (`POST /api/ai/index`)**: Indexes scheme document chunks into PostgreSQL and Qdrant with metadata (`schemeId`, `governmentLevel`, `state`, `category`, `documentType`, `sourceUrl`).

