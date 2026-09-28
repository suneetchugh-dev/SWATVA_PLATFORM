# SWATVA UI Rules & Design System

> **Every agent must read this file before creating or editing any component, page, or feature.**

---

## 🌐 Rule #1 — Translation is MANDATORY for every string

**Every user-visible string must exist in ALL supported languages.**

Current supported languages: `en` (English) · `hi` (हिन्दी)

### What must be translated
- Page headings, subheadings, section labels
- Button labels, CTA text
- Form labels, placeholders, validation messages
- Nav links, footer text, tab labels
- Tooltips, aria-labels, toast/banner messages
- Badge text, stat labels, card descriptions
- Empty states, loading states, error messages

### What must NOT be translated (keep as-is in all languages)
- Brand names: `SWATVA`, `TheQuirkies` (but may be **transliterated** into Devanagari script if desired, e.g. `द क्वर्कीज़`)
- Person names: `Suneet Chugh`, `Devanshu Kaushik`, etc.
- Tech stack tags: `React 19`, `Java 21`, `Spring Boot`, `PostgreSQL`, `Qdrant`, etc.
- Alphanumeric identifiers: `AES-256`, `v2.4`, `SIH26043`
- URLs and email addresses

### How to implement translation

```jsx
// ✅ Correct — use t() for every visible string
const { t, i18n } = useTranslation();
const isHindi = i18n.language === 'hi';

<h1>{t('page.heading')}</h1>
<button>{t('common.save')}</button>

// ✅ For inline data (not in JSON), use ternary
<span>{isHindi ? 'हिंदी पाठ' : 'English text'}</span>

// ❌ Never hardcode English-only strings
<h1>Welcome to SWATVA</h1>
<button>Save</button>
```

### Translation files
- English: `frontend/src/locales/en.json`
- Hindi: `frontend/src/locales/hi.json`

**Both files must always be updated together.** Never add a key to one without adding it to the other.

### Translation quality rules
- Translate **meaning + tone**, not word-for-word
- For brand/team names, use **Devanagari transliteration** (not translation): `TheQuirkies` → `द क्वर्कीज़`, `Meet TheQuirkies` → `मीट द क्वर्कीज़`
- Never ship a guessed Hindi string — if unsure, add a `// TODO(native-check):` comment
- Verify no mojibake: run `grep -P "[\x80-\x9f]" <file>` before committing

---

## 🎨 Rule #2 — Minimalism & Effort Minimization

- **One primary action per view.** Secondary actions must be visually subordinate.
- **No decorative elements** that don't carry meaning. Remove borders, shadows, icons, and motion that add noise without value.
- **Progressive disclosure** — show advanced options only when needed.
- **Sensible defaults** pre-selected; remember user preferences (persist to localStorage).
- **Short labels** — prefer 1–3 word labels. Never write a sentence where a word will do.
- **Fast paths** — keyboard support, quick actions, pre-filled common values.

---

## 📱 Rule #3 — Mobile-First Responsive Design

- Design and test at **375px** (mobile) first, then scale up.
- Use Tailwind breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px), `xl:` (1280px)
- **Never use `margin-left` or `translateX` offsets on mobile** for centered elements — use `mx-auto` or `left-1/2 -translate-x-1/2`
- All tap targets must be **at least 44×44px**
- Text must never be cut off — use `break-words` or `text-balance` as appropriate
- Test at: 375px (iPhone SE), 768px (iPad), 1024px (iPad Pro 13 / Surface Pro), 1280px (Nest Hub Max)

---

## ♿ Rule #4 — Accessibility (a11y)

- Every interactive element needs an `aria-label` (especially icon-only buttons)
- `aria-label` must also be translated — use `t()` or the `isHindi` ternary
- Modal/dialog must have `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- Escape key must close all modals/drawers/popovers
- Click-outside must dismiss overlays
- Focus must return to the trigger element after modal close
- Minimum contrast ratio: **4.5:1** for body text, **3:1** for large text

---

## 🔔 Rule #5 — Feedback on Every Action

- Every user action must have a visual response within **100ms**
- Use `active:scale-95` on buttons for tactile press feedback
- Show spinner/skeleton while loading — never a blank area
- Toast messages for async success/failure (use the `Banner` component)
- Disabled states must be visually obvious (`opacity-50 cursor-not-allowed`)

---

## 🏷️ Rule #6 — Component Naming & Organization

```
frontend/src/
├── pages/          # Full page views (one per route)
├── components/     # Reusable UI components
├── layouts/        # Shell/wrapper layouts (AppShell, etc.)
├── lib/            # Utilities: theme, i18n, api client
├── utils/          # Pure utility functions
├── data/           # Static data (team, schemes, etc.)
└── locales/        # Translation JSON files
```

- Page components go in `pages/` and export a default function
- Reusable UI goes in `components/`
- Every new component gets translations for all strings it renders
- Data arrays with translatable content get `hi` variants (see `team.js` pattern)

---

## 📦 Rule #7 — Data with Translatable Content

When a data file (e.g. `team.js`, `schemes.js`) contains user-visible strings, add Hindi variants:

```js
// ✅ Correct pattern for data files
export const CORE_PILLARS = [
  {
    title: 'Deterministic Rules Engine',
    titleHi: 'निर्धारक नियम इंजन',
    desc: 'Pure rule-based matching...',
    descHi: 'शुद्ध नियम-आधारित मिलान...'
  }
]

// In JSX:
<h4>{isHindi ? pillar.titleHi : pillar.title}</h4>
<p>{isHindi ? pillar.descHi : pillar.desc}</p>
```

---

## 🚫 Rule #8 — What NOT to Do

- ❌ Never hardcode English-only user-visible strings in JSX
- ❌ Never add a feature without its Hindi translation
- ❌ Never use `lg:` breakpoints for things that should work on tablet (use `md:`)
- ❌ Never use `margin-left` on small screens for centering — use flexbox/grid
- ❌ Never commit `.env` files or secrets
- ❌ Never push directly to `main` — use `develop` → PR → merge
- ❌ Never use `overflow: hidden` on a container that clips Devanagari ascenders — add `py-1` padding

---

## ✅ Pre-commit Checklist for UI Work

Before committing any UI change:

1. [ ] Every new user-visible string has a translation in both `en.json` and `hi.json`
2. [ ] Tested at 375px (mobile) and 768px (tablet)
3. [ ] All buttons have `aria-label` (translated)
4. [ ] No hardcoded English strings in JSX
5. [ ] No mojibake in locale files (`grep -P "[\x80-\x9f]" frontend/src/locales/*.json`)
6. [ ] Active/hover/disabled states look correct in both light and dark mode
7. [ ] `[skip ci]` added to commit message if no `apps/client-pwa/` changes
