# GitFlow Branching & Architecture Guide

This repository follows a GitFlow branching model tailored for the **SWATVA Platform**. Different concerns are cleanly isolated into dedicated branches to allow focused development while preserving a unified integrated trunk.

---

## Branch Overview

| Branch | Concern | Environment / Role | Working Directory Focus |
|---|---|---|---|
| `main` | Production / Stable | Production-ready full platform releases | Unified: Backend (`src/`) + Frontend (`frontend/`) |
| `develop` | Staging / Integration | Continuous integration trunk | Unified: Backend (`src/`) + Frontend (`frontend/`) |
| `backend` | Backend Service | API, database, business logic, RAG | Isolated: Spring Boot Java (`src/`, `pom.xml`) |
| `frontend` | Frontend UI | Citizen web application & components | Isolated: React + Vite (`src/`, `package.json` at root) |

---

## 1. Branch Details & Workflow

### `main`
- **Purpose**: Stable production release branch.
- Contains the integrated full-stack codebase.
- Tagged with version tags (e.g. `v1.0.0`).
- No direct commits. Changes arrive via Pull Requests from `develop` or hotfix branches.

### `develop`
- **Purpose**: Integration trunk.
- Contains the integrated full-stack codebase.
- All new features and updates from `backend` and `frontend` are integrated here for end-to-end testing and staging before release to `main`.

### `backend`
- **Purpose**: Pure backend development for Java/Spring Boot engineers.
- **Contents**:
  - `src/main/java/` & `src/main/resources/` (Modular monolith domain packages)
  - `src/test/java/` (Unit and integration tests)
  - `pom.xml` (Maven build configuration)
  - `DATASET.md` (Scheme catalogue definitions)
  - `AGENTS.md` (Backend engineering guidelines)
  - `README.md` (Backend setup, database configuration, API references)
- **Notice**: Contains no `frontend/` directory, keeping the workspace lean and focused on JVM tooling.

### `frontend`
- **Purpose**: Pure frontend development for UI/UX React engineers.
- **Source of truth**: `develop` is canonical. This branch mirrors the contents of
  `frontend/` on `develop`, promoted to the repository root. Land work on
  `develop` first, then sync it here — do not build the UI in both places.
- **Contents**:
  - `src/` (React components, state management, styles, API client)
  - `src/pages/`, `src/layouts/`, `src/components/`, `src/lib/`, `src/locales/`
  - `src/__smoke.jsx` & `src/__globals.js` (route render smoke test, not bundled)
  - `public/` (Static assets, SVGs, favicon)
  - `package.json` & `package-lock.json`
  - `vite.config.js` (Vite dev server & `/api` proxy)
  - `tailwind.config.js` & `postcss.config.js` (design tokens & build)
  - `index.html`
  - `README.md` (Frontend setup, component hierarchy, scripts)
  - `BRANCHES.md` (this file)
- **Notice**: Promoted to the repository root. A frontend developer can clone `frontend` and directly run `npm install && npm run dev` without touching Java or Maven.
- **Design system**: `tailwind.config.js` omits the blue, green, cyan, teal and
  slate families outright, so a banned class such as `bg-blue-500` does not
  compile. The palette is achromatic plus a single amber accent.

---

## 2. Daily Development Workflows

### Working on the Backend
```bash
# 1. Checkout backend branch
git checkout backend

# 2. Pull latest backend changes
git pull origin backend

# 3. Create a feature branch
git checkout -b feature/new-benefit-rule

# 4. Implement changes, test, and commit
mvn test
git commit -am "feat(eligibility): add new rule criteria"

# 5. Merge back to backend
git checkout backend
git merge feature/new-benefit-rule
```

### Working on the Frontend
```bash
# 1. Checkout frontend branch
git checkout frontend

# 2. Pull latest frontend changes
git pull origin frontend

# 3. Create a feature branch
git checkout -b feature/redesign-checklist

# 4. Implement changes, test, and commit
npm run dev
git commit -am "feat(ui): redesign action checklist view"

# 5. Merge back to frontend
git checkout frontend
git merge feature/redesign-checklist
```

---

## 3. Integrating into `develop`

### Merging `backend` changes into `develop`:
Since `backend` keeps the same directory structure (`src/`, `pom.xml`) as `develop`:
```bash
git checkout develop
git merge backend -m "chore: sync backend changes to develop"
```

### Merging `frontend` changes into `develop`:
Because the `frontend` branch organizes frontend files at the root, integration into `develop` (where frontend files live in `frontend/`) uses Git's subtree merge strategy:
```bash
git checkout develop
git merge -s subtree -Xsubtree=frontend/ frontend -m "chore: sync frontend changes to develop"
```
*(Alternatively, pull requests or sync scripts can port frontend updates directly into `frontend/` on `develop`.)*

### Syncing `develop` into `frontend`:
This is the direction used in practice: the UI is built and reviewed on `develop`,
then mirrored to the isolated branch. Because `frontend/` is a strict subtree of
`develop`, the whole thing is replaced in one step rather than merged file by file:
```bash
git checkout frontend
git fetch origin

# Load develop's frontend/ subtree in as this branch's root tree, then
# materialise it into the working directory.
git read-tree origin/develop:frontend
git checkout-index -a -f
git checkout HEAD -- BRANCHES.md   # lives only on this branch

npm install
npm run build
npx vite build --ssr src/__smoke.jsx --outDir dist-smoke && node dist-smoke/__smoke.js
git commit -am "chore(frontend): sync the UI from develop"
git push origin frontend
```
Do **not** loop `git checkout origin/develop -- <file>` over the subtree entries.
That pathspec resolves against the root of `develop`, not against `frontend/`, so
it silently pulls the Spring Boot sources in and overwrites this branch with the
backend. `read-tree` is what binds the subtree at the root correctly.

---

## 4. Releasing to `main`

When staging on `develop` is verified:
```bash
git checkout main
git merge develop --no-ff -m "release: v1.0.0"
git tag -a v1.0.0 -m "Release v1.0.0"
```
