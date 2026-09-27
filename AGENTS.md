# Swatva AI — Agent Guide

## Project overview

Swatva AI is a Java/Spring Boot modular monolith for discovering Indian government-benefit schemes. The current implementation contains JWT authentication, progressive user profiling, deterministic eligibility evaluation, a JPA data model, a seeded Central/Karnataka catalogue, and read-only scheme APIs. AI/RAG, Qdrant, and a frontend are not implemented.

## Tech stack

- Java 21; Spring Boot 3.5.7; Maven
- Spring Web, Spring Security, Spring Data JPA, Bean Validation
- PostgreSQL runtime driver; Hibernate JSON (`jsonb`) mapping
- Lombok for entity getters/setters and no-argument constructors
- Spring Boot Test and Spring Security Test are dependencies, but no test sources exist yet.

## Architecture and packages

Use `in.swatva.<module>` for domain ownership: `auth`, `user`, `scheme`, `eligibility`, `document`, `readiness`, `transparency`, `notification`, `ai`, and `common`.

- Domain entities live in `<module>.model`; enum types in `<module>.model.enums`; repositories in `<module>.repository`.
- HTTP code currently lives in `<module>.api` (for example, `scheme.api.SchemeController`).
- Cross-cutting API, exception, persistence, and web code lives in `common`.
- There is no service layer yet. The existing read-only controller injects its repository directly. Do not introduce a service layer merely for consistency; add one when a feature has non-trivial business or transactional work.
- Seed logic belongs in the owning module’s `seed` package and is registered through a `CommandLineRunner`.

## Coding conventions

- Use constructor injection for Spring components.
- Use Java records for small API DTOs, as `SchemeController` does; do not return JPA entities directly.
- Use Lombok annotations on entities and extend `BaseEntity` for persistent domain records.
- Use `UUID` identifiers and `Instant` for persisted audit/verification times. `BaseEntity` populates `createdAt` and `updatedAt` via JPA lifecycle callbacks.
- Use `@Enumerated(EnumType.STRING)` for persisted enums. Preserve explicit `@Table`, `@Column`, FK, nullability, length, and `text`/`jsonb` mappings where they matter.

## API development rules

- Keep public routes under `/api/...`; the health endpoint is `/api/v1/health`, while the catalogue is `/api/schemes`.
- Return `ResponseEntity<ApiResponse<T>>` and construct successful payloads with `ApiResponse.success(...)`.
- Keep summaries and details separate when the response shape differs. Wrap entity-to-DTO mapping inside the controller or an appropriate feature mapper.
- For lazy relationships used by a read endpoint, retain a read-only transaction around DTO mapping or fetch the required graph explicitly.
- Existing catalogue filtering uses enum query parameters such as `level=CENTRAL` and `level=STATE&state=Karnataka`; follow this style for simple filters.

## Database and JPA rules

- PostgreSQL configuration is in `src/main/resources/application.yml`; credentials and connection settings come from `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD`.
- The current first-run default is `JPA_DDL_AUTO=update`. Do not change schema behavior casually. Before production work, add versioned migrations and use `validate` as the README recommends.
- Preserve `spring.jpa.open-in-view=false`; do not depend on lazy loading outside a transaction.
- `Scheme.eligibilityData` is a Hibernate `jsonb` map. Keep structured scheme eligibility data there; do not add vector/AI persistence to this model.
- Machine-evaluable scheme rules are stored as `SchemeEligibilityRule` rows. Supported `ruleType` values are `MIN_AGE`, `MAX_AGE`, `MAX_INCOME`, `STATE`, `OCCUPATION`, `EDUCATION`, `CATEGORY`, `GENDER`, and `DISABILITY_STATUS`.
- Repositories extend `JpaRepository<Entity, UUID>` and use descriptive derived queries where sufficient.

## Security rules

- Security is stateless and CSRF is disabled in `auth.config.SecurityConfig`.
- Only `/api/v1/health`, `/api/schemes/**`, and `/error` are public today. All other routes require authentication.
- Do not open a new endpoint publicly without explicitly adding it to the permit list and confirming that is intended.
- JWT authentication uses a BCrypt password hash and the email as the authenticated principal. Use `Authentication.getName()` for the current user in protected endpoints.
- `JWT_SECRET` and `JWT_EXPIRATION_MINUTES` configure token signing and lifetime. Do not expose password hashes or JWT secrets.

## Error handling

- Use `ResourceNotFoundException` for missing resources; `GlobalExceptionHandler` maps it to a `RESOURCE_NOT_FOUND` response.
- Validation failures are returned as `VALIDATION_FAILED` with field errors. Add Bean Validation annotations to request DTOs when write endpoints are introduced.
- Keep API failures in the `ApiResponse`/`ApiError` envelope with stable codes and safe messages. Security 401/403 responses use the same envelope.
- Do not expose exception details to clients; unexpected errors are logged server-side and returned as `INTERNAL_ERROR`.

## Seed data

- `SchemeDataInitializer` is idempotent by scheme name and currently seeds six Central and ten Karnataka schemes.
- Seed only facts and URLs from official government sources. Keep `officialSourceUrl`, `rawSchemeTextReference`, eligibility text, document requirements, steps, and `lastVerifiedAt` aligned with that source.
- Do not alter or duplicate existing seed names without considering the name-based idempotency check.

## Eligibility

- `EligibilityRuleEvaluator` makes deterministic decisions only; do not invoke an LLM for eligibility.
- Missing profile fields produce missing-information outcomes, not failed conditions or automatic ineligibility.
- `GET /api/eligibility/matches` is protected and evaluates active Central schemes plus active State schemes for the authenticated profile's state.
- Keep unit tests for evaluator behavior under `src/test/java/in/swatva/eligibility` when changing rule semantics.

## Build and test

```powershell
mvn clean verify
mvn spring-boot:run
```

Use PostgreSQL before starting the application; startup creates/updates the local schema and runs the seed initializer. Add focused tests alongside new behavior under `src/test/java`; none currently exist.

## Important files

- `pom.xml` — Java version and dependencies
- `src/main/resources/application.yml` — datasource, JPA, server, logging configuration
- `src/main/java/in/swatva/auth/config/SecurityConfig.java` — route security and auth error responses
- `src/main/java/in/swatva/common/api/ApiResponse.java` and `ApiError.java` — response contract
- `src/main/java/in/swatva/common/exception/GlobalExceptionHandler.java` — error mapping
- `src/main/java/in/swatva/common/persistence/BaseEntity.java` — UUID/audit convention
- `src/main/java/in/swatva/scheme/seed/SchemeDataInitializer.java` — catalogue seed data

## Changing or adding functionality

- Preserve existing endpoint paths, response envelopes, repository method contracts, entity table/column names, and seeded source-backed facts unless the task explicitly changes them.
- Keep changes inside the relevant module; avoid microservices, Qdrant, LLM integration, or frontend work unless specifically requested.
- For a new feature: add its model/repository in the owning module, define DTOs instead of exposing entities, apply validation and shared error handling, secure the route deliberately, add tests, and run `mvn clean verify`.
