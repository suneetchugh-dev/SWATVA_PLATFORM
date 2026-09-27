# Swatva AI (swatva-ai) — Agent Guide

## Project overview

Spring Boot modular monolith that helps Indian citizens discover and apply for
government benefit schemes. A separate React/Vite frontend lives in `frontend/`.

Implemented: JWT auth, progressive user profiling, deterministic eligibility
evaluation, scheme catalogue, document upload/validation, readiness tracking,
benefit recommendations, transparency reporting, and an AI/RAG layer over Qdrant
with a deterministic fallback.

Not implemented: no Firebase/Google OAuth, no push notifications, no frontend
family CRUD endpoints (family is replaced wholesale via the profile endpoint).

## Tech stack

- Java 21 (CI pins 21 — Lombok does not support newer JDKs yet)
- Spring Boot 3.5.7, Spring AI 1.0.0, Maven
- Spring Web, Spring Security, Spring Data JPA, Bean Validation
- PostgreSQL (runtime), Qdrant (vector), S3-compatible storage (documents)
- React 19 + Vite 8 frontend, plain CSS (no UI framework yet)
- 28 hermetic test classes / 143 tests — no Spring context, no Testcontainers,
  no H2, no network. They must stay that way so CI needs no services.

## Repository layout

```
pom.xml                    Java 21 + dependencies
mvnw / mvnw.cmd            Maven wrapper (use ./mvnw, not mvn)
docker-compose.yml         postgres + qdrant (+ optional minio profile)
.env.example               template; copy to .env
src/main/resources/        application.yml
src/test/java/             28 test classes
frontend/                  React 19 + Vite 8 SPA
.github/workflows/ci.yml   Java 21 + Node 20 build
```

## Running locally

```powershell
copy .env.example .env        # then paste a real key into OPENAI_API_KEY
docker compose up -d          # postgres (required) + qdrant
./mvnw spring-boot:run        # http://localhost:8080
cd frontend; npm install; npm run dev   # http://localhost:5173
```

The app **boots without a real LLM key.** `SchemeVectorIndexingService` catches
the failure, logs a warning, leaves Qdrant empty, and retrieval falls back to
PostgreSQL keyword search. Auth, schemes, eligibility, benefits, readiness and
transparency all work fully.

Two gotchas that will cost you an hour otherwise:

1. `QDRANT_INITIALIZE_SCHEMA` must stay `false` unless
   `OPENAI_EMBEDDING_MODEL` points at a real embeddings model. When `true`,
   Spring AI calls the embeddings API *during context startup* to discover the
   vector dimension, so a chat-only provider (Groq, OpenRouter free) aborts the
   whole application, not just the AI feature.
2. The repository path contains `&`, which `cmd.exe` mangles. npm scripts are
   pinned to Git Bash via `script-shell` in the user npm config.

## API surface

| Base | Endpoints |
|------|-----------|
| `/api/v1` | `GET /health` (public) |
| `/api/auth` | `POST /register`, `POST /login` (public) |
| `/api/schemes` | `GET`, `GET /{id}`, `GET /{id}/checklist`, `GET /{id}/transparency` (public) |
| `/api/users/me` | `GET`, `PUT /profile` |
| `/api/eligibility` | `GET /matches` |
| `/api/benefits` | `GET /recommended`, `GET /missed-value`, `POST /life-event` |
| `/api/documents` | `POST` (multipart + JSON), `GET`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}`, `POST /{id}/validate`, `POST /{id}/extract`, `GET /scheme/{id}/evaluation` |
| `/api/readiness` | `GET /scheme/{schemeId}` |
| `/api/ai` | `POST /scheme-query`, `POST /scheme/{id}/explanation`, `POST /index` |
| `/api/chat` | `POST` |
| `/api/transparency` | `POST /reports`, `GET /summary`, `GET /schemes/{schemeId}` |

Only `/api/v1/health`, `/api/schemes/**` and `/error` are public. Everything else
requires a `Bearer` token. `SecurityConfig` also allows CORS only from
`localhost`/`127.0.0.1`, which must be widened before any hosted deployment.

`frontend/src/api/client.js` wraps all of this and is the contract the UI builds
on. Keep it.

## Architecture and packages

Use `in.swatva.<module>`: `auth`, `user`, `scheme`, `eligibility`, `document`,
`readiness`, `transparency`, `notification`, `ai`, `common`.

- Entities in `<module>.model`, enums in `<module>.model.enums`, repositories in
  `<module>.repository`, HTTP in `<module>.api`, business logic in `<module>` or
  `<module>.service`.
- A service layer now exists. Add one when a feature has transactional or
  multi-step work; a controller may still inject a repository for pure reads.
- `common` holds the API envelope, exception mapping, and `BaseEntity`.

## Coding conventions

- Constructor injection for Spring components. No field injection.
- Java records for API DTOs. Never return JPA entities.
- Lombok on entities; extend `BaseEntity` for persistent records. `BaseEntity`
  fills `createdAt`/`updatedAt` via JPA callbacks.
- `UUID` identifiers, `Instant` for audit times.
- `@Enumerated(EnumType.STRING)` for persisted enums.
- Preserve explicit `@Table`, `@Column`, FK, nullability, length and
  `text`/`jsonb` mappings. `Scheme.eligibilityData` is a Hibernate `jsonb` map.

## Database and JPA rules

- Configuration lives in `src/main/resources/application.yml`; credentials come
  from the environment. `.env` is gitignored and loaded via
  `spring.config.import`.
- `JPA_DDL_AUTO=update` is the current first-run default. Do not change schema
  behavior casually; add versioned migrations and switch to `validate` before
  production.
- Keep `spring.jpa.open-in-view=false`. Do not depend on lazy loading outside a
  transaction; fetch the graph explicitly or map inside a read-only transaction.
- Machine-evaluable rules are `SchemeEligibilityRule` rows. Supported `ruleType`
  values: `MIN_AGE`, `MAX_AGE`, `MAX_INCOME`, `STATE`, `OCCUPATION`, `EDUCATION`,
  `CATEGORY`, `GENDER`, `DISABILITY_STATUS`.
- Repositories extend `JpaRepository<Entity, UUID>` with derived queries.

## Security rules

- Stateless, CSRF disabled, in `auth.config.SecurityConfig`.
- BCrypt password hashes; the email is the authenticated principal. Read the
  current user with `Authentication.getName()`.
- `JWT_SECRET` must be 32+ bytes. `JwtProperties` is `@Validated` and fails
  startup with a clear message if it is missing or too short — do not add a
  fallback default.
- Never commit secrets or log password hashes. `.env` is ignored;
  `.env.example` is explicitly un-ignored and must stay placeholder-free.

## Error handling

- `ResourceNotFoundException` → `RESOURCE_NOT_FOUND`.
- Validation failures → `VALIDATION_FAILED` with field errors, driven by Bean
  Validation annotations on request records.
- All failures use the `ApiResponse`/`ApiError` envelope with stable codes and
  safe messages. Security 401/403 use the same envelope.
- Never leak exception details; unexpected errors log server-side and return
  `INTERNAL_ERROR`.

## Seed data

`SchemeDataInitializer` is idempotent by scheme name and seeds 6 Central + 14
Uttar Pradesh schemes (20 total). It also calls `cleanLegacyKarnatakaSchemes`
to drop earlier Karnataka prototypes.

- Seed only facts and URLs from official government sources. Keep
  `officialSourceUrl`, `rawSchemeTextReference`, eligibility text, document
  requirements, steps and `lastVerifiedAt` aligned with that source.
- Do not rename or duplicate a seeded name; the idempotency check is name-based.

## Eligibility and AI

- `EligibilityRuleEvaluator` is **deterministic only**. Never call an LLM to
  decide eligibility.
- Missing profile fields yield missing-information outcomes, never automatic
  ineligibility.
- `GET /api/eligibility/matches` is protected and evaluates active Central
  schemes plus active State schemes for the authenticated profile's state.
- Keep evaluator unit tests under `src/test/java/in/swatva/eligibility` when
  changing rule semantics.
- The AI layer must degrade, not fail: provider errors fall back to
  deterministic explanations and keyword retrieval. `DETERMINISTIC_RULE_EVALUATION`
  in `explanationData.decisionType` marks non-LLM decisions.

## Build and test

```powershell
./mvnw clean verify        # 143 tests, no services required
docker compose up -d
./mvnw spring-boot:run
```

CI runs `./mvnw -B clean verify` on Java 21 and `npm ci && npm run build` on
Node 20. Keep new tests hermetic — the suite must not need a database.

## Important files

- `pom.xml` — Java version, `maven.compiler.proc=full` (required for Lombok on
  JDK 23+; harmless on 21)
- `src/main/resources/application.yml` — datasource, JPA, AI provider, Qdrant, S3, JWT
- `src/main/java/in/swatva/auth/config/SecurityConfig.java` — route security, CORS, auth error envelope
- `src/main/java/in/swatva/auth/config/JwtProperties.java` — validated JWT secret
- `src/main/java/in/swatva/common/api/ApiResponse.java`, `ApiError.java` — response contract
- `src/main/java/in/swatva/common/exception/GlobalExceptionHandler.java` — error mapping
- `src/main/java/in/swatva/common/persistence/BaseEntity.java` — UUID/audit convention
- `src/main/java/in/swatva/scheme/seed/SchemeDataInitializer.java` — catalogue seed
- `src/main/java/in/swatva/eligibility/EligibilityRuleEvaluator.java` — deterministic matching
- `src/main/java/in/swatva/ai/service/SchemeVectorIndexingService.java` — Qdrant sync, degrades on failure
- `frontend/src/api/client.js` — full API client; the UI's contract

## Changing or adding functionality

- Preserve existing endpoint paths, response envelopes, repository method
  contracts, entity table/column names and seeded source-backed facts unless the
  task explicitly changes them.
- Keep changes inside the owning module. Do not introduce microservices, a
  second datastore, or LLM calls on the eligibility path.
- For a new feature: model + repository in the owning module, DTOs instead of
  entities, validation and shared error handling, a deliberate security decision
  for the route, tests, and `./mvnw clean verify` green.
