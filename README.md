# SWATVA (स्वत्व)

### Autonomous Welfare Scheme Discovery & Application Intelligence Platform

> **Swatva** (*स्वत्व*) translates to *Entitlement and Inherent Right*. SWATVA bridges the civic-information gap by pairing conversational intelligence with deterministic rule engines and contextual document verification to help citizens effortlessly discover, verify eligibility for, and apply to Indian government welfare programs.

---

## Architectural Highlights & Core Pillars

1. **Deterministic Rule-Based Eligibility Engine**
   - Pure, mathematical rule matching over structured citizen profiles and family demographics (`MIN_AGE`, `MAX_AGE`, `MAX_INCOME`, `GENDER`, `OCCUPATION`, `CASTE_CATEGORY`, `LAND_HOLDING_ACRES`, `DISABILITY_PERCENTAGE`).
   - The LLM never invents or calculates eligibility criteria. All decisions and matching score calculations are deterministic, reproducible, and explainable.

2. **Grounded Semantic RAG (Zero Hallucination)**
   - High-dimensional vector search powered by **Qdrant** (gRPC on port 6334).
   - Scheme queries and conversational context are grounded strictly in verified scheme chunks and government gazette guidelines.

3. **Contextual Document Locker & OCR Validity Engine**
   - Citizen document locker with state validity verification, issue/expiry tracking, and simulated OCR data extraction.
   - Dynamic conflict detection prevents overwriting existing documents without explicit citizen confirmation.
   - Traffic-light application readiness scoring (`RED` / `YELLOW` / `GREEN`) computed dynamically from scheme requirements vs. locked documents.

4. **Persistent Cloud Chat & Multi-Device Synchronization**
   - Full PostgreSQL-backed multi-turn chat sessions with automatic title generation, pinned sessions, export functionality, and cross-device sync.
   - Seamless session switching and conversation history management.

5. **Citizen Financial Empowerment & Benefit Maximization**
   - Automated calculation of estimated total annual missed benefit value across Central and State government programs.
   - Actionable step-by-step application checklists and direct links to official state/central application portals.

6. **Citizen Fee Transparency & Anti-Corruption Tracking**
   - Crowdsourced reporting on application processing times, CSC/kiosk fee transparency, and bribery tracking to ensure fair governance.

7. **Obsidian & Porcelain Monochromatic Design System**
   - High-contrast, minimal aesthetic crafted for citizen accessibility.
   - Complete bi-lingual support (**English** and **Hindi / हिन्दी**) across all screens, modals, and toasts.
   - **Zero Unicode Emoji Invariant**: 100% vector SVG icons (`lucide-react`) with role-appropriate hover micro-interactions.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Backend Service** | Java 21, Spring Boot 3.5.7, Spring Security (JWT), Spring Data JPA, Hibernate, Maven |
| **Primary Database** | PostgreSQL 15+ (Relational rules, users, sessions, documents, audit logs) |
| **Vector Database** | Qdrant (gRPC on port 6334 / REST on port 6333) |
| **Frontend Application** | React 19, Vite 6, Tailwind CSS v4, Lucide React, i18next Localization |
| **Container & Cloud** | Docker, Docker Compose (Multi-stage builds), Caddy / Nginx Reverse Proxy |

---

## Repository Branching Strategy (GitFlow)

This repository strictly follows a concern-separated GitFlow workflow:

| Branch | Purpose | Scope |
|---|---|---|
| `main` | **Production Releases** | Unified, deployable platform codebase (Backend + Frontend + Infrastructure). |
| `develop` | **Integration & Staging** | Active integration trunk where backend and frontend features are combined. |
| `backend` | **Backend API Development** | Isolated Spring Boot modular monolith (`src/`, `pom.xml`). Cleanly isolated from UI dependencies. |
| `frontend` | **Frontend UI Development** | Isolated React + Vite application promoted to root (`src/`, `package.json`). |

For detailed development guidelines and branch synchronization workflows, see [`BRANCHES.md`](BRANCHES.md).

---

## Quick Start

### Method A: One-Command Docker Compose (Recommended)

To spin up the entire platform (PostgreSQL, Qdrant, Spring Boot Backend, and React Frontend with Nginx):

```bash
# 1. Clone the repository
git clone https://github.com/SuneetChugh/SWATVA.git
cd SWATVA/Codebase

# 2. Configure environment
cp .env.example .env

# 3. Launch all services
docker compose up -d --build
```

- **Frontend Application**: `http://localhost:3000` (or `http://localhost:5173` if running Vite dev server)
- **Backend API**: `http://localhost:8080`
- **Backend Health Check**: `http://localhost:8080/api/v1/health`

To stop all services:
```bash
docker compose down
```

---

### Method B: Local Development Setup

#### 1. Start Infrastructure (PostgreSQL & Qdrant)

Ensure PostgreSQL (port 5432) and Qdrant (port 6334 gRPC, 6333 REST) are running:

```sql
-- Connect to PostgreSQL and create the database
CREATE DATABASE swatva_ai;
```

#### 2. Configure Environment Variables

Create `.env` from `.env.example`:

```bash
# Database Configuration
export DB_URL="jdbc:postgresql://localhost:5432/swatva_ai"
export DB_USERNAME="postgres"
export DB_PASSWORD="your-secure-password"
export JPA_DDL_AUTO="update"

# JWT Authentication
export JWT_SECRET="your-32-byte-or-longer-random-secret-key-here"
export JWT_EXPIRATION_MINUTES="1440"

# CORS Configuration
export CORS_ALLOWED_ORIGIN_PATTERNS="http://localhost:*,http://127.0.0.1:*"

# Qdrant Vector DB & AI Service
export QDRANT_HOST="localhost"
export QDRANT_PORT="6334"
export QDRANT_COLLECTION_NAME="swatva_schemes"
export OPENAI_API_KEY="your-llm-key-or-demo-key"
```

#### 3. Run Backend Service

```bash
# Build and run the Spring Boot service
mvn spring-boot:run
```

Verify backend health:
```bash
curl http://localhost:8080/api/v1/health
```

#### 4. Run Frontend Application

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## Seeded Scheme Catalogue (20 Verified Schemes)

On initial startup, the backend automatically and idempotently seeds a verified catalogue of **20 real Indian government welfare schemes**:

- **6 Central Government Schemes**:
  - PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)
  - AB-PMJAY (Ayushman Bharat Pradhan Mantri Jan Arogya Yojana)
  - PMJDY (Pradhan Mantri Jan Dhan Yojana)
  - PMJJBY (Pradhan Mantri Jeevan Jyoti Bima Yojana)
  - PMSBY (Pradhan Mantri Suraksha Bima Yojana)
  - PM Vishwakarma Scheme
- **14 Uttar Pradesh Government Schemes**:
  - Mukhyamantri Kanya Sumangala Yojana
  - UP Vridhavastha Pension Yojana
  - UP Nirashrit Mahila Pension Yojana
  - UP Divyangjan Pension Yojana
  - UP Shadi Anudan Yojana
  - UP Post-Matric Scholarship
  - UP Gopalak Yojana
  - UP Krishak Durghatna Kalyan Yojana
  - Mukhyamantri Abhyudaya Yojana
  - DigiShakti Scheme (Free Tablet/Smartphone)
  - UP Bal Seva Yojana
  - UP Vishwakarma Shram Samman Yojana
  - ODOP Margin Money Scheme
  - UP Gramodyog Rozgar Yojana

For full eligibility criteria, income thresholds, required documents, and official government portal sources, see [`DATASET.md`](DATASET.md).

---

## REST API Reference

All backend responses use a standard envelope structure:
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "timestamp": "2026-09-29T13:00:00Z"
}
```

### 1. System & Health
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/v1/health` | Service health and uptime check | Public |

### 2. Authentication & Authorization
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new citizen account | Public |
| `POST` | `/api/auth/login` | Authenticate with credentials and receive JWT | Public |

### 3. Citizen Profile & Family Demographics
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/users/me` | Fetch authenticated citizen profile and family members | Bearer JWT |
| `PUT` | `/api/users/me/profile` | Update profile demographics (age, income, caste, etc.) | Bearer JWT |

### 4. Scheme Discovery & Details
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/schemes` | List schemes (filter by `level=CENTRAL` or `level=STATE&state=UP`) | Public |
| `GET` | `/api/schemes/{id}` | Full scheme details, document requirements, and step guides | Public |
| `GET` | `/api/schemes/{id}/checklist` | Step-by-step preparation checklist for application | Bearer JWT |

### 5. Deterministic Eligibility & Recommendations
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/eligibility/matches` | Deterministic evaluation of all schemes against citizen profile | Bearer JWT |
| `GET` | `/api/benefits/recommended` | Personalized scheme recommendations ranked by match score | Bearer JWT |
| `GET` | `/api/benefits/missed-value` | Calculate total annual missed monetary value across schemes | Bearer JWT |
| `GET` | `/api/readiness/scheme/{schemeId}` | Application readiness traffic-light score (`RED`/`YELLOW`/`GREEN`) | Bearer JWT |

### 6. Document Locker & OCR Processing
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/documents` | Retrieve all verified documents in citizen locker | Bearer JWT |
| `POST` | `/api/documents` | Upload and verify document (with OCR extraction metadata) | Bearer JWT |
| `DELETE` | `/api/documents/{id}` | Remove document from locker | Bearer JWT |

### 7. Conversational Welfare Assistant & Cloud Sessions
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/chat` | Send conversational message (supports `sessionId` for multi-turn) | Bearer JWT |
| `GET` | `/api/chat/sessions` | List all saved chat sessions for authenticated citizen | Bearer JWT |
| `GET` | `/api/chat/sessions/{id}` | Get full conversation message history for a session | Bearer JWT |
| `PATCH` | `/api/chat/sessions/{id}/title` | Rename chat session title | Bearer JWT |
| `PATCH` | `/api/chat/sessions/{id}/pin` | Pin or unpin a chat session | Bearer JWT |
| `DELETE` | `/api/chat/sessions/{id}` | Delete a chat session and its history | Bearer JWT |

### 8. Public AI & Transparency
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/ai/scheme-query` | Public semantic RAG search over scheme knowledge base | Public |
| `POST` | `/api/transparency/reports` | Submit citizen report on CSC fee or processing delay | Bearer JWT |
| `GET` | `/api/transparency/summary` | Aggregate transparency and governance metrics | Public |

---

## Modular Backend Architecture

```
in.swatva
├── auth          # Authentication, BCrypt security, JWT token provider & filters
├── user          # User entity, profile demographics, family member management
├── scheme        # Verified scheme catalogue, seeders, checklist, missed benefits
├── eligibility   # Deterministic rule evaluator (MIN_AGE, MAX_INCOME, CATEGORY, etc.)
├── readiness     # Application readiness assessment engine
├── document      # Document locker, OCR extraction, validity rule engine
├── chat          # Multi-turn conversational sessions, database persistence & sync
├── ai            # Qdrant vector indexing, RAG retrieval engine
├── transparency  # Citizen transparency reports and corruption tracking
└── common        # Shared DTOs, BaseEntity, GlobalExceptionHandler, Web config
```

---

## Frontend Architecture & UI Design System

```
frontend/src
├── components/   # Reusable UI components (Button, Modal, StatusPill, PageTour, etc.)
├── layouts/      # Application shell and responsive navigation wrapper
├── pages/        # Route pages (Home, Discover, Assistant, Locker, Profile, Schemes)
├── lib/          # API client, authentication state, theme and i18n providers
├── locales/      # English (en.json) and Hindi (hi.json) translation dictionaries
└── utils/        # Formatters, currency helpers, and storage utilities
```

### UI Invariants & Accessibility Rules
- **Monochromatic Obsidian & Porcelain Theme**: High-contrast, minimal civic styling with refined amber focal points.
- **Bi-lingual Completeness**: All UI chrome, forms, modals, and toasts are translated in both English and Hindi.
- **Zero Unicode Emojis**: Strictly prohibited. All UI visual indicators use semantic, accessible Lucide SVGs with subtle micro-interactions.
- **Mobile-First Responsive Layout**: Optimized across viewports from 375px mobile screens up to desktop displays.

For complete design guidelines, see [`frontend/UI_DESIGN_SYSTEM.md`](frontend/UI_DESIGN_SYSTEM.md) and [`docs/UI_RULES.md`](docs/UI_RULES.md).

---

## Testing & Quality Assurance

### Run Backend Unit & Integration Tests
```bash
./mvnw test
```

### Run Frontend Build & Type Validation
```bash
cd frontend
npm run build
```

---

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.
