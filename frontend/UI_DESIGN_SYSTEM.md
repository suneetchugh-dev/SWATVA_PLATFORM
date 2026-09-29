# SWATVA UI & Design System Guidelines

## Critical Design Rules & Invariants

### 1. Absolute Rule: Zero Emojis Across Entire Codebase & UI
**NEVER USE EMOJIS (`⚡`, `👤`, `🤖`, `🟢`, `🔴`, `🟡`, `🔵`, `✨`, `🚀`, etc.) ANYWHERE IN CODE, UI, NOTICES, LABELS, METADATA, OR DOCUMENTATION.**

- **Strict Ban on Emojis:** Do not use Unicode emojis anywhere in UI markup, button labels, toast/banner messages, tags, metadata, or markdown documentation.
- **No Emoji Status Markers or Balls:** Do not use emoji circle markers (`🟢`, `🔴`, `🟡`, `🔵`, `⚪`, `🟣`, `🟠`) or floating colored balls on surfaces.
- **Vector SVGs Only:** Always use crisp, semantic vector SVG icons (from `lucide-react`, e.g. `Sparkles`, `FileStack`, `Scale`, `CheckCircle2`, `AlertCircle`, `Info`, `Clock`, `Search`, `Trash2`, `Upload`, `Send`) styled with appropriate typographic hierarchy and high-contrast accessibility tokens.
- **Subtle SVG Micro-Interactions:** On hover/active states, SVG icons must use role-appropriate, subtle micro-interactions (e.g. `group-hover:rotate-45`, `group-hover:scale-110`, `group-hover:translate-x-0.5`, `group-hover:-translate-y-0.5`). Avoid unnatural or aggressive spinning (e.g. spinning a search magnifying glass).
- **Proper Loading States:** Buttons must use the official platform `loading` state (`LoadingLogo` / `Spinner` component), never spinning unrelated static glyphs.

---

## Aesthetic & Palette

SWATVA employs a clean, high-contrast **Obsidian & Porcelain** aesthetic with a refined **Amber** accent:

- **Monochrome Foundation:**
  - Light mode: Crisp white (`#ffffff`), porcelain neutral backgrounds (`#f5f5f7`), charcoal typography (`#09090b`).
  - Dark mode: Obsidian `#000000`, slate background `#09090b`, pure white typography (`#ffffff`), 1px white alpha borders (`rgba(255,255,255,0.1)`).
- **Amber Civic Accent:**
  - Used purposefully for primary affirmative outcomes, active states, and focal points (e.g. `bg-amber-500`, `text-amber-700 dark:text-amber-400`).
  - Banned color palettes: Raw rainbow status colors (blue, green, teal, purple) are deliberately avoided so screens do not become visual noise.

---

## Component Standards

- **StatusPills:** Monospace, bordered badges (`mono-badge`) displaying deterministic eligibility verdicts (`ELIGIBLE`, `NEEDS_INFORMATION`, `NOT_ELIGIBLE`).
- **Badges:** Minimalist, rounded-full chips without floating colored dots.
- **PageHeader:** Unified page titles with optional action buttons and contextual `PageTourButton`.
- **Modals & Cards:** Neo-glass background cards (`neo-glass-card`) with subtle rounded corners and accessible focus rings.
