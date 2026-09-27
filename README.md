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

## Seeded scheme catalogue (20 Verified Schemes)

On startup, the service idempotently seeds a verified demo catalogue of **20 real government schemes**:
- **6 Central Government schemes** (PM-KISAN, AB-PMJAY, PMJDY, PMJJBY, PMSBY, PM Vishwakarma)
- **14 Uttar Pradesh Government schemes** (Mukhyamantri Kanya Sumangala, UP Vridhavastha Pension, UP Nirashrit Mahila Pension, UP Divyangjan Pension, UP Shadi Anudan, UP Post-Matric Scholarship, UP Gopalak Yojana, UP Krishak Durghatna Kalyan, Mukhyamantri Abhyudaya, DigiShakti, UP Bal Seva Yojana, UP Vishwakarma Shram Samman, ODOP Margin Money, UP Gramodyog Rozgar)

For full details, official sources, and eligibility criteria, see [`DATASET.md`](DATASET.md).

The public catalogue endpoints are:

```text
GET /api/schemes
GET /api/schemes/{id}
GET /api/schemes?level=CENTRAL
GET /api/schemes?level=STATE&state=Uttar%20Pradesh
```

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

## Personalized Benefits & Missed Value

```text
GET /api/benefits/recommended
GET /api/benefits/missed-value
```

- **Recommended Benefits (`GET /api/benefits/recommended`)**: Returns personalized scheme matches separated into Central and State benefits along with an Action Checklist for each scheme.
- **Missed Benefits Value (`GET /api/benefits/missed-value`)**: Calculates the estimated total annual monetary benefit from verified scheme data for unclaimed, potentially eligible schemes (`totalEstimatedAnnualBenefit`, `central`, `state`, per-scheme `breakdown`). Schemes with non-monetary or unknown values are excluded without inventing numbers. Clearly disclaims financial guarantees.
 
## AI & RAG Layer

```text
POST /api/ai/scheme-query
POST /api/ai/scheme/{id}/explanation
POST /api/ai/index
```

- **Semantic Q&A (`POST /api/ai/scheme-query`)**: Publicly answers questions grounded strictly in retrieved scheme chunks (eligibility, benefits, required documents, application process, important conditions, and FAQs). If retrieved context is insufficient, explicitly states that verified information is lacking.
- **Personalized Explanation (`POST /api/ai/scheme/{id}/explanation`)**: JWT-protected endpoint providing a plain-language explanation of why a scheme matched the user based on the deterministic eligibility engine result and retrieved scheme facts. The LLM does NOT decide eligibility.
- **Vector Indexing (`POST /api/ai/index`)**: Indexes scheme document chunks into PostgreSQL and Qdrant with metadata (`schemeId`, `governmentLevel`, `state`, `category`, `documentType`, `sourceUrl`).

## Testing Frontend (React + Vite)

A minimal test console is provided under `frontend/` to test all real backend APIs end-to-end against PostgreSQL and Qdrant without mock data.

### 1. How to start the backend

```powershell
# From project root:
mvn spring-boot:run
```

### 2. How to start the frontend

```powershell
# From project root:
cd frontend
npm install
npm run dev
```

### 3. URLs

- **Backend Base URL**: `http://localhost:8080` (Health: `http://localhost:8080/api/v1/health`)
- **Frontend URL**: `http://localhost:5173`

### 4. Available Screens in Testing Console

1. **Auth (`POST /api/auth/register`, `POST /api/auth/login`)**: Register citizen accounts, login, view JWT token, and logout.
2. **User Profile (`GET /api/users/me`, `PUT /api/users/me/profile`)**: View and update demographics and family members.
3. **Schemes Catalogue (`GET /api/schemes`, `GET /api/schemes/{id}`)**: Browse verified 20 schemes (Central + Uttar Pradesh), filter by level/state, and inspect required documents, steps, and transparency info.
4. **Eligibility Matches (`GET /api/eligibility/matches`)**: Deterministic evaluation showing satisfied conditions, failed conditions, missing profile information, and AI explanation (`POST /api/ai/scheme/{id}/explanation`).
5. **Benefits & Missed Value (`GET /api/benefits/recommended`, `GET /api/benefits/missed-value`, `POST /api/benefits/life-event`)**: Central vs State breakdown, estimated annual missed benefit with non-guarantee disclaimer, and life event signal extraction.
6. **Action Checklist & Readiness Score (`GET /api/schemes/{id}/checklist`, `GET /api/readiness/scheme/{schemeId}`)**: Action checklists and deterministic traffic light readiness score (RED/YELLOW/GREEN).
7. **Document Locker (`GET /api/documents`, `POST /api/documents`, `POST /api/documents/{id}/validate`)**: Document upload/registration, validity check against state rules, and manual date fallbacks.
8. **RAG / AI Query (`POST /api/ai/scheme-query`, `POST /api/ai/index`)**: Semantic Q&A grounded strictly in Qdrant vectors and vector store re-indexing.
9. **Conversational Assistant (`POST /api/chat`)**: Multi-turn chat in English, Hindi, and Kannada.
10. **Transparency Layer (`POST /api/transparency/reports`, `GET /api/transparency/summary`)**: Submit anonymous corruption/fee reports and view aggregate statistics.


