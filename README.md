# Swatva AI — Frontend Web Application

The citizen-facing single-page web application for **SWATVA AI**, an AI-powered welfare discovery and guided application platform for Indian citizens.

> **Note on Branching**: This `frontend` branch is dedicated exclusively to the React/Vite UI development. The project is organized cleanly at the root so frontend developers can install dependencies and run the dev server immediately. For the backend service, see the `backend` branch. For the integrated full platform, see `develop` and `main`. Detailed workflow: [`BRANCHES.md`](BRANCHES.md).

---

## Tech Stack

- **Framework**: React 19
- **Bundler & Dev Server**: Vite 6
- **Styling**: Modern CSS3 / Flexbox / Grid (Responsive mobile-first layout)
- **Linter**: Oxlint
- **API Client**: Native Fetch with JWT authentication header handling and `/api` proxy

---

## Quick Start

### 1. Prerequisites
- Node.js 18.0 or higher
- npm 9.0 or higher

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```

The application will start on **`http://localhost:5173`**.

---

## Configuration & Backend Connection

By default, the Vite dev server (`vite.config.js`) proxies all `/api/*` requests to the Swatva AI backend running at `http://localhost:8080`.

To point to a different backend server, create a `.env` file in the root directory:

```bash
VITE_API_BASE_URL=http://localhost:8080
```

---

## Project Structure

```
.
├── public/                 # Static assets (SVGs, icons, favicon)
├── src/
│   ├── api/
│   │   └── client.js       # Centralized API client & JWT token management
│   ├── assets/             # Images and branding assets
│   ├── components/         # Feature UI components
│   │   ├── AuthSection.jsx                   # Citizen registration & login
│   │   ├── ProfileSection.jsx                # Demographics & family details
│   │   ├── SchemesSection.jsx                # Verified scheme catalogue & search
│   │   ├── EligibilitySection.jsx            # Deterministic rule evaluation & AI match
│   │   ├── BenefitsSection.jsx               # Recommendations & missed benefit value
│   │   ├── ChecklistAndReadinessSection.jsx  # Action checklists & traffic-light readiness
│   │   ├── DocumentsSection.jsx              # Document locker & validation rules
│   │   ├── AiQuerySection.jsx                # Grounded semantic RAG Q&A
│   │   ├── ChatSection.jsx                   # Multi-turn conversational assistant
│   │   └── TransparencySection.jsx           # Citizen feedback & fee transparency
│   ├── App.jsx             # Main navigation and application layout
│   ├── App.css             # Component styling
│   ├── index.css           # Global typography and theme variables
│   └── main.jsx            # Application entry point
├── index.html              # HTML shell
├── vite.config.js          # Vite configuration & proxy
├── package.json            # Scripts and dependencies
└── BRANCHES.md             # GitFlow branching documentation
```

---

## Available Scripts

| Command | Action |
| --- | --- |
| `npm run dev` | Starts Vite dev server with hot module replacement (HMR) at `http://localhost:5173`. |
| `npm run build` | Compiles and bundles production-ready assets to `dist/`. |
| `npm run preview` | Locally serves the production build from `dist/` for testing. |

---

## Testing Real APIs

All components connect directly to the real Swatva backend endpoints without mock data:
1. Ensure the Swatva backend service is running on `http://localhost:8080` (from `backend`, `develop`, or `main` branch).
2. Register a user or log in via the Auth section.
3. Update citizen profile demographics to evaluate eligibility against the verified scheme catalogue.
