# SWATVA (स्वत्व) 🇮🇳
### *Empowering Citizens with Autonomous Welfare Scheme Discovery & Guided Application Assistance*

> **Swatva** (*स्वत्व*) translates to *Entitlement & Inherent Right*. SWATVA bridges the civic-information gap by pairing conversational AI with localized intelligence to help citizens effortlessly discover, verify eligibility for, and apply to Indian government welfare programs.

---

## Architecture Overview

SWATVA is organized as an enterprise-grade platform comprising:
- **Backend**: Java 21 & Spring Boot 3.5 modular monolith with Spring Security (JWT), Spring Data JPA, PostgreSQL (structured rules & metadata), and Qdrant (vector embeddings & RAG retrieval).
- **Frontend**: React + Vite single-page application with modern responsive UI and full end-to-end integration with the real backend APIs.
- **AI & RAG Engine**: Semantic Q&A grounded strictly in retrieved scheme chunks, multi-turn conversational assistance, and deterministic match explanations (LLM never invents eligibility decisions).

---

## Repository Branching Strategy (GitFlow)

This repository follows a structured, concern-separated GitFlow branching model:

| Branch | Purpose | Scope |
| --- | --- | --- |
| `main` | **Production Releases** | Unified platform codebase (Backend + Frontend + Infrastructure). |
| `develop` | **Integration & Staging** | Active integration trunk where backend and frontend features are combined. |
| `backend` | **Backend API Development** | Isolated Spring Boot modular monolith codebase (`src/`, `pom.xml`, etc.). Cleanly isolated from UI code. |
| `frontend` | **Frontend UI Development** | Isolated React + Vite application promoted to root (`src/`, `package.json`, etc.). Cleanly isolated from backend code. |

For detailed instructions on working with and integrating between branches, see [`BRANCHES.md`](BRANCHES.md).

---

## Tech Stack & Prerequisites

- **Backend**: Java 21, Maven 3.9+, Spring Boot 3.5.7, Spring Security (JWT), Spring Data JPA, Hibernate
- **Database**: PostgreSQL 15+ (with `jsonb` support)
- **Vector Database**: Qdrant (gRPC on port 6334)
- **Frontend**: Node.js 18+, npm 9+, React 19, Vite 6, Tailwind/CSS3

---

## Quick Start (Full Platform)

### 1. Database Setup

Create the local PostgreSQL database:

```sql
CREATE DATABASE swatva_ai;
```

### 2. Configure Backend Environment

Set environment variables (or copy from `.env.example`):

```bash
# PostgreSQL
export DB_URL="jdbc:postgresql://localhost:5432/swatva_ai"
export DB_USERNAME="postgres"
export DB_PASSWORD="your-password"
export JPA_DDL_AUTO="update"

# Security
export JWT_SECRET="a-long-random-secret-with-at-least-32-bytes"
export JWT_EXPIRATION_MINUTES="1440"

# Browser origins allowed to call the API (comma-separated).
# The default covers only the Vite dev server, so a deployed build must set this
# or the browser blocks every request. A bare "*" is refused at startup because
# credentials are enabled.
export CORS_ALLOWED_ORIGIN_PATTERNS="http://localhost:*,http://127.0.0.1:*"

# Vector DB & AI (Optional for basic API, required for RAG)
export QDRANT_HOST="localhost"
export QDRANT_PORT="6334"
export QDRANT_COLLECTION_NAME="swatva_schemes"
export OPENAI_API_KEY="demo-key"
```

### 3. Start Backend Service

```bash
# From repository root
mvn spring-boot:run
```

Or build and execute the JAR:

```bash
mvn clean package -DskipTests
java -jar target/swatva-ai-0.0.1-SNAPSHOT.jar
```

Verify backend health:

```bash
curl http://localhost:8080/api/v1/health
```

### 4. Start Frontend Application

In a separate terminal:

```bash
# Navigate to frontend
cd frontend

# Install dependencies and start Vite dev server
npm install
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

## Seeded Scheme Catalogue (20 Verified Schemes)

On startup, the backend idempotently seeds a verified catalogue of **20 real government schemes**:
- **6 Central Government Schemes**: PM-KISAN, AB-PMJAY, PMJDY, PMJJBY, PMSBY, PM Vishwakarma.
- **14 Uttar Pradesh Government Schemes**: Mukhyamantri Kanya Sumangala, UP Vridhavastha Pension, UP Nirashrit Mahila Pension, UP Divyangjan Pension, UP Shadi Anudan, UP Post-Matric Scholarship, UP Gopalak Yojana, UP Krishak Durghatna Kalyan, Mukhyamantri Abhyudaya, DigiShakti, UP Bal Seva Yojana, UP Vishwakarma Shram Samman, ODOP Margin Money, UP Gramodyog Rozgar.

For full criteria, official government sources, required documents, and rule definitions, see [`DATASET.md`](DATASET.md).

---

## Key Backend API Endpoints

All responses use a consistent envelope: `ApiResponse<T>` (`success`, `data`, `error`, `timestamp`).

### Public Endpoints
- `GET /api/v1/health`: Health status.
- `GET /api/schemes`: Browse all schemes (supports `?level=CENTRAL` and `?level=STATE&state=Uttar%20Pradesh`).
- `GET /api/schemes/{id}`: Full scheme details, document requirements, and step-by-step guides.
- `POST /api/auth/register`: Register citizen account.
- `POST /api/auth/login`: Authenticate and receive JWT.
- `POST /api/ai/scheme-query`: Public semantic RAG query grounded in verified scheme chunks.

### Protected Endpoints (Bearer JWT Required)
- `GET /api/users/me` & `PUT /api/users/me/profile`: Citizen profile & family member management.
- `GET /api/eligibility/matches`: Deterministic rule-based eligibility evaluation.
- `GET /api/benefits/recommended`: Personalized Central and State scheme recommendations.
- `GET /api/benefits/missed-value`: Calculates estimated total annual missed benefit value.
- `GET /api/schemes/{id}/checklist`: Step-by-step action checklist for scheme application.
- `GET /api/readiness/scheme/{schemeId}`: Traffic-light application readiness score (RED / YELLOW / GREEN).
- `GET /api/documents` & `POST /api/documents`: Citizen document locker & state validity verification.
- `POST /api/chat`: Multi-turn conversational welfare assistant.
- `POST /api/transparency/reports` & `GET /api/transparency/summary`: Citizen feedback and fee transparency.

---

## Modules Directory

```
in.swatva
├── auth          # Authentication, BCrypt security, JWT token provider & filters
├── user          # User profile, demographics, family members
├── scheme        # Verified scheme catalogue, seeders, checklist, missed benefits
├── eligibility   # Deterministic rule evaluator (MIN_AGE, MAX_INCOME, CATEGORY, etc.)
├── readiness     # Application readiness assessment engine
├── document      # Document locker, OCR extraction, validity rule engine
├── ai            # Qdrant vector indexing, RAG retrieval, chat assistant
├── transparency  # Citizen transparency reports and corruption tracking
└── common        # Shared DTOs, BaseEntity, GlobalExceptionHandler, Web config
```
