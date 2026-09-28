# SWATVA UI & Design System Guidelines

## 🛡️ Critical Design Rules & Invariants

### 1. ⛔ Absolute Rule: No Emoji Orbs or Coloured Status Balls
**NEVER USE 🟢, 🔴, 🟡, 🔵 ORBS OR ANY COLOURED STATUS BALLS ANYWHERE IN CODE, UI, OR DOCUMENTATION.**

- Do not use emoji circle markers (`🟢`, `🔴`, `🟡`, `🔵`, `⚪`, `🟣`, `🟠`) as status indicators, list bullets, or decoration.
- Do not render bare floating colored status dots / balls (e.g. `<span className="h-2 w-2 rounded-full bg-emerald-500..." />` or pinging dots) on surfaces.
- **Industry Standard Alternative:** Always use crisp, semantic SVG icons (from `lucide-react`, e.g. `CheckCircle2`, `AlertCircle`, `XCircle`, `Info`, `Clock`, `Sparkles`, `Activity`) styled with appropriate typographic hierarchy and high-contrast accessibility tokens.
- **Animations:** Any animation on SVG icons must be subtle, professional, and performance-optimized (e.g., subtle fade or smooth micro-scale; never aggressive pulsing or flashing).

---

## 🎨 Aesthetic & Palette

SWATVA employs a clean, high-contrast **Obsidian & Porcelain** aesthetic with a refined **Amber** accent:

- **Monochrome Foundation:**
  - Light mode: Crisp white (`#ffffff`), porcelain neutral backgrounds (`#f5f5f7`), charcoal typography (`#09090b`).
  - Dark mode: Obsidian `#000000`, slate background `#09090b`, pure white typography (`#ffffff`), 1px white alpha borders (`rgba(255,255,255,0.1)`).
- **Amber Civic Accent:**
  - Used purposefully for primary affirmative outcomes, active states, and focal points (e.g. `bg-amber-500`, `text-amber-700 dark:text-amber-400`).
  - Banned color palettes: Raw rainbow status colors (blue, green, teal, purple) are deliberately avoided so screens do not become visual noise.

---

## 🧩 Component Standards

- **StatusPills:** Monospace, bordered badges (`mono-badge`) displaying deterministic eligibility verdicts (`ELIGIBLE`, `NEEDS_INFORMATION`, `NOT_ELIGIBLE`).
- **Badges:** Minimalist, rounded-full chips without floating colored dots.
- **PageHeader:** Unified page titles with optional action buttons and contextual `PageTourButton`.
- **Modals & Cards:** Neo-glass background cards (`neo-glass-card`) with subtle rounded corners and accessible focus rings.
