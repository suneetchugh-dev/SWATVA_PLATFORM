import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  ClipboardCheck,
  FileStack,
  Landmark,
  Moon,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  Wallet,
} from 'lucide-react'

/* ------------------------------------------------------------------ *
 * Copy. Kept in one place so the English/Hindi pass (i18next) is a
 * mechanical change rather than a rewrite.
 * ------------------------------------------------------------------ */

const COPY = {
  nav: { platform: 'Platform', how: 'How it works', coverage: 'Coverage', faq: 'FAQ', cta: 'Open app' },
  hero: {
    badge: 'Government scheme discovery',
    title: 'Every scheme you qualify for.',
    rotating: ['Found in minutes, not years of paperwork.', 'Matched by rule, not by guesswork.', 'Applied for with the right paperwork ready.'],
    placeholder: 'Describe your situation, or ask about a scheme...',
    prompts: [
      'Am I eligible for PM-KISAN?',
      'Which pension scheme works for a 62-year-old?',
      'What documents does Ayushman Bharat need?',
      'I just lost my job — what can I claim?',
    ],
  },
  steps: {
    watermark: 'PROCESS',
    badge: 'Three steps',
    title: 'From nothing to applying',
    desc: 'No forms to guess at. Swatva reads the scheme rules, checks them against your profile, and tells you exactly what to do next.',
    items: [
      { n: '01', title: 'Build your profile', body: 'Age, income, state, occupation, category, disability status and household. Takes about two minutes, and you can stop and resume at any point.' },
      { n: '02', title: 'Get your matches', body: 'Every active scheme is evaluated against your profile and returned as eligible, not eligible, or missing information — each with the exact condition that decided it.' },
      { n: '03', title: 'Apply with a checklist', body: 'For each match you get a step-by-step checklist, the documents it needs, and a readiness score that tells you whether you are actually able to submit today.' },
    ],
  },
  capabilities: {
    watermark: 'CAPABILITIES',
    badge: 'What it does',
    title: 'Built around the whole application, not just the search',
    desc: 'Finding a scheme is the easy half. Swatva covers the documents, the readiness and the paperwork that decide whether you actually receive the benefit.',
    items: [
      { Icon: Scale, title: 'Deterministic eligibility', body: 'Eligibility is decided by stored eligibility rules, never by a language model. Every verdict is reproducible and cites the condition that produced it.' },
      { Icon: Wallet, title: 'Value on the table', body: 'Aggregates the annual value of everything you qualify for but have not claimed, so the cost of not applying is a number rather than a suspicion.' },
      { Icon: FileStack, title: 'Document locker', body: 'Upload a document once, validate it against the scheme requirement, correct extracted fields, and reuse it across every scheme that needs it.' },
      { Icon: ClipboardCheck, title: 'Application readiness', body: 'Per-scheme readiness scoring across the documents and steps still outstanding, so you know which applications are genuinely submittable.' },
      { Icon: Sparkles, title: 'Ask in your own words', body: 'Describe a life event in Hindi or English and get the schemes it unlocked, with citations back to the official scheme text.' },
      { Icon: ShieldCheck, title: 'Transparency reports', body: 'Read how much each department disbursed, how long applications take, and report problems back through the same surface.' },
    ],
  },
  trust: {
    watermark: 'TRUST',
    badge: 'Why rule-based',
    title: 'An LLM should not decide what you are owed',
    body: 'A wrong answer about a pension is not a small mistake — it is a family waiting on money that never arrives. So Swatva keeps the decision and the language model strictly apart.',
    points: [
      { title: 'Rules decide, the model explains', body: 'Matches come from versioned scheme rules. When a language model is available it only rewrites the outcome in plain language, and the response is labelled as deterministic.' },
      { title: 'Missing is not the same as no', body: 'A blank profile field produces a missing-information outcome, never a silent rejection. The system asks instead of guessing.' },
      { title: 'Every answer is traceable', body: 'Each match lists the conditions it satisfied, the ones it failed, and the information it still needs.' },
      { title: 'It degrades instead of lying', body: 'If the model or the vector store is unavailable, Swatva falls back to keyword retrieval and rule-based explanations rather than inventing an answer.' },
    ],
  },
  coverage: {
    watermark: 'COVERAGE',
    badge: 'Catalogue',
    title: 'Twenty schemes, verified against official sources',
    desc: 'Every scheme carries its official source URL, its raw published text, its document requirements, its application steps and the date it was last verified.',
    stats: [
      { n: '20', l: 'Live schemes' },
      { n: '6', l: 'Central' },
      { n: '14', l: 'Uttar Pradesh' },
      { n: '9', l: 'Rule types' },
    ],
    samples: ['PM-KISAN', 'Ayushman Bharat PM-JAY', 'PM Jan-Dhan Yojana', 'Jeevan Jyoti Bima', 'PM Vishwakarma', 'UP Kanya Sumangala', 'UP Shadi Anudan', 'UP Divyangjan Pension'],
  },
  faq: {
    badge: 'Questions',
    title: 'Before you ask',
    items: [
      { q: 'Is this really free?', a: 'Yes. The code, the catalogue and the rules are open. You never need to pay anyone to find out what you qualify for, and a broker who claims otherwise is misleading you.' },
      { q: 'Do I need an Aadhaar number to start?', a: 'No. Build a profile with the basics and add documents later. Aadhaar is needed for some schemes at the application stage, not for discovery.' },
      { q: 'How current is the scheme data?', a: 'Each scheme records a lastVerifiedAt date and links to its official government source. The catalogue is seeded from those sources rather than written from memory.' },
      { q: 'Which languages are supported?', a: 'The interface and assistant work in English and Hindi.' },
      { q: 'What happens to my documents?', a: 'They are stored against your own account, used only to check scheme requirements, and you can delete any of them at any time.' },
    ],
  },
  cta: {
    badge: 'Free, no sign-up wall',
    title: 'Find out what you are owed',
    body: 'Two minutes to build a profile. Every match explained.',
  },
  footer: { note: 'Scheme data is sourced from official government publications.', right: 'Built for citizens who cannot afford to miss out.' },
}

/* ------------------------------------------------------------------ *
 * Typewriter suggestion engine. Signature Sahnirmaan interaction: human
 * cadence with jitter, and it finishes the current suggestion before
 * pausing rather than cutting off mid-word.
 * ------------------------------------------------------------------ */

const TYPING_MIN = 45
const TYPING_MAX = 75
const HOLD_MS = 2400
const ERASE_MS = 24
const GAP_MS = 320

function useTypewriter(phrases, active) {
  const [text, setText] = useState('')
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState('typing')
  const timer = useRef(null)

  useEffect(() => {
    if (!active) return
    const phrase = phrases[index % phrases.length]
    if (phase === 'typing') {
      if (text.length < phrase.length) {
        timer.current = setTimeout(() => {
          setText(phrase.slice(0, text.length + 1))
        }, TYPING_MIN + Math.random() * (TYPING_MAX - TYPING_MIN))
      } else {
        timer.current = setTimeout(() => setPhase('holding'), HOLD_MS)
      }
    } else if (phase === 'holding') {
      timer.current = setTimeout(() => setPhase('erasing'), 200)
    } else if (text.length > 0) {
      timer.current = setTimeout(() => setText(phrase.slice(0, text.length - 1)), ERASE_MS)
    } else {
      timer.current = setTimeout(() => {
        setIndex((i) => i + 1)
        setPhase('typing')
      }, GAP_MS)
    }
    // Returned on every path: a pending timer must never outlive the effect,
    // otherwise navigating away mid-keystroke fires a setState on a dead tree.
    return () => clearTimeout(timer.current)
  }, [text, phase, index, phrases, active])

  return text
}

/* ------------------------------------------------------------------ *
 * Theme
 * ------------------------------------------------------------------ */

function useTheme() {
  const [dark, setDark] = useState(
    () => localStorage.getItem('swatva_theme') === 'dark',
  )
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('swatva_theme', dark ? 'dark' : 'light')
  }, [dark])
  return [dark, setDark]
}

/* ------------------------------------------------------------------ *
 * Building blocks
 * ------------------------------------------------------------------ */

function Watermark({ children }) {
  return (
    <div className="section-watermark font-mono" aria-hidden="true">
      {children}
    </div>
  )
}

function ThemeToggle({ dark, setDark }) {
  return (
    <button
      type="button"
      onClick={() => setDark(!dark)}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={dark}
      className="h-9 w-9 flex items-center justify-center rounded-full text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}

function Badge({ children }) {
  return (
    <span className="inline-block mono-badge text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1">
      {children}
    </span>
  )
}

function SectionHeading({ badge, title, desc }) {
  return (
    <div className="max-w-2xl">
      <Badge>{badge}</Badge>
      <h2 className="mt-4 text-2xl sm:text-4xl font-extrabold tracking-tight text-balance text-neutral-950 dark:text-white">
        {title}
      </h2>
      {desc ? (
        <p className="mt-4 text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300 text-balance">
          {desc}
        </p>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Page
 * ------------------------------------------------------------------ */

export default function Landing() {
  const [dark, setDark] = useTheme()
  const [query, setQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [open, setOpen] = useState(null)
  const navigate = useNavigate()
  const searchRef = useRef(null)
  const prompt = useTypewriter(COPY.hero.prompts, !searchFocused && query.length === 0)

  // Ctrl/Cmd + K focuses the search, as in the Sahnirmaan shell.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if (e.key === 'Escape') setOpen(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onSearch = (e) => {
    e.preventDefault()
    if (!query.trim()) return
    navigate('/app')
  }

  return (
    <div className="min-h-dvh w-full overflow-x-hidden bg-porcelain dark:bg-obsidian text-neutral-950 dark:text-white transition-colors">
      {/* ------------------------------------------------------ nav */}
      <header className="fixed top-0 inset-x-0 z-50 pt-3 px-3 sm:px-5">
        <nav className="mx-auto max-w-6xl neo-glass-card px-3 sm:px-4 py-2.5 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <span className="h-8 w-8 flex items-center justify-center rounded-lg bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 flex-shrink-0">
              <Landmark size={16} strokeWidth={2.2} />
            </span>
            <span className="font-bold text-sm tracking-tight truncate">Swatva AI</span>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-xs font-medium text-neutral-600 dark:text-neutral-300">
            <a href="#how" className="hover:text-neutral-950 dark:hover:text-white transition-colors">{COPY.nav.how}</a>
            <a href="#capabilities" className="hover:text-neutral-950 dark:hover:text-white transition-colors">{COPY.nav.platform}</a>
            <a href="#coverage" className="hover:text-neutral-950 dark:hover:text-white transition-colors">{COPY.nav.coverage}</a>
            <a href="#faq" className="hover:text-neutral-950 dark:hover:text-white transition-colors">{COPY.nav.faq}</a>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <ThemeToggle dark={dark} setDark={setDark} />
            <Link
              to="/app"
              className="h-9 px-3.5 sm:px-4 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity"
            >
              {COPY.nav.cta}
              <ArrowUpRight size={13} strokeWidth={2.2} />
            </Link>
          </div>
        </nav>
      </header>

      {/* ---------------------------------------------------- hero */}
      <section className="relative w-full flex flex-col items-center text-center px-4 sm:px-6 pt-32 sm:pt-40 pb-20 sm:pb-28 min-h-[88vh] sm:min-h-[92vh] justify-center">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[680px] h-[200px] sm:h-[340px] bg-gradient-to-b from-amber-500/[0.05] via-amber-500/[0.015] to-transparent rounded-full blur-[80px] sm:blur-[100px] pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative w-full max-w-4xl z-10 flex flex-col items-center">
          <Badge>{COPY.hero.badge}</Badge>

          <h1 className="mt-6 flex flex-col items-center w-full">
            <span className="block text-3xl sm:text-5xl md:text-7xl font-black leading-[1.12] tracking-tight text-balance bg-clip-text text-transparent bg-gradient-to-b from-neutral-950 via-neutral-800 to-neutral-500 dark:from-white dark:via-neutral-200 dark:to-neutral-400">
              {COPY.hero.title}
            </span>
            <span className="block mt-3 sm:mt-4 text-lg sm:text-2xl md:text-4xl font-semibold leading-[1.25] text-balance text-neutral-700 dark:text-neutral-200">
              {COPY.hero.rotating[0]}
            </span>
          </h1>
        </div>

        {/* search */}
        <form onSubmit={onSearch} className="relative w-full max-w-2xl mt-10 z-10">
          <div className="w-full p-3 sm:p-4 rounded-3xl neo-glass-card text-left">
            <div className="flex items-center gap-3 px-2 pt-1">
              <Search size={17} className="text-neutral-400 flex-shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder={COPY.hero.placeholder}
                aria-label="Search schemes"
                className="w-full bg-transparent border-none text-sm text-neutral-950 dark:text-white placeholder:text-neutral-400 focus:ring-0 focus:outline-none p-0 font-medium"
              />
              <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 mono-badge text-neutral-500 dark:text-neutral-400 bg-neutral-200/80 dark:bg-white/10 border border-neutral-300 dark:border-white/15 rounded-md flex-shrink-0 whitespace-nowrap">
                Ctrl K
              </kbd>
              <button
                type="submit"
                aria-label="Search"
                className="h-8 w-8 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center hover:opacity-90 transition-opacity flex-shrink-0 cursor-pointer"
              >
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </form>

        {/* typewriter suggestions — tappable, and cleared once typing starts */}
        <div className="relative z-10 mt-4 h-6 flex items-center justify-center w-full">
          {query.length === 0 ? (
            <p className="text-xs text-neutral-400 font-mono truncate px-4" aria-live="polite">
              {prompt}
              <span className="inline-block w-1.5 h-3.5 ml-0.5 align-middle bg-amber-500 animate-pulse" />
            </p>
          ) : null}
        </div>

        <div className="relative z-10 mt-6 flex flex-wrap items-center justify-center gap-2 max-w-2xl">
          {COPY.hero.prompts.slice(0, 3).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => { setQuery(p); navigate('/app') }}
              className="px-3 py-1.5 rounded-full text-[11px] font-medium bg-neutral-100 dark:bg-white/[0.06] text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              {p}
            </button>
          ))}
        </div>
      </section>

      {/* ------------------------------------------- how it works */}
      <section id="how" className="relative w-full flex flex-col items-center px-6 py-16 sm:py-24">
        <Watermark>{COPY.steps.watermark}</Watermark>
        <div className="w-full max-w-5xl relative z-10">
          <SectionHeading badge={COPY.steps.badge} title={COPY.steps.title} desc={COPY.steps.desc} />
          <div className="mt-10 grid gap-4 sm:gap-5 md:grid-cols-3">
            {COPY.steps.items.map((s) => (
              <div key={s.n} className="neo-glass-card p-6 sm:p-7 flex flex-col">
                <span className="mono-badge text-amber-600 dark:text-amber-400">{s.n}</span>
                <h3 className="mt-3 text-lg font-bold tracking-tight">{s.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------- capabilities */}
      <section id="capabilities" className="relative w-full flex flex-col items-center px-6 py-16 sm:py-24">
        <Watermark>{COPY.capabilities.watermark}</Watermark>
        <div className="w-full max-w-5xl relative z-10">
          <SectionHeading
            badge={COPY.capabilities.badge}
            title={COPY.capabilities.title}
            desc={COPY.capabilities.desc}
          />
          <div className="mt-10 grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {COPY.capabilities.items.map(({ Icon, title, body }) => (
              <div key={title} className="neo-glass-card p-6 sm:p-7">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-950 dark:bg-white text-white dark:text-neutral-950">
                  <Icon size={16} strokeWidth={2} />
                </span>
                <h3 className="mt-4 text-base font-bold tracking-tight">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------- trust */}
      <section className="relative w-full flex flex-col items-center px-6 py-16 sm:py-24">
        <Watermark>{COPY.trust.watermark}</Watermark>
        <div className="w-full max-w-5xl relative z-10">
          <div className="w-full p-8 sm:p-12 neo-glass-card">
            <SectionHeading badge={COPY.trust.badge} title={COPY.trust.title} desc={COPY.trust.body} />
            <div className="mt-9 grid gap-x-8 gap-y-6 sm:grid-cols-2">
              {COPY.trust.points.map((p) => (
                <div key={p.title} className="flex gap-3">
                  <BadgeCheck size={17} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold tracking-tight">{p.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{p.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------- coverage */}
      <section id="coverage" className="relative w-full flex flex-col items-center px-6 py-16 sm:py-24">
        <Watermark>{COPY.coverage.watermark}</Watermark>
        <div className="w-full max-w-5xl relative z-10">
          <SectionHeading badge={COPY.coverage.badge} title={COPY.coverage.title} desc={COPY.coverage.desc} />
          <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {COPY.coverage.stats.map((s) => (
              <div key={s.l} className="dashboard-amber-card p-6 text-center">
                <div className="text-3xl sm:text-4xl font-black tracking-tight font-mono tabular-nums">{s.n}</div>
                <div className="mt-1.5 mono-badge text-neutral-500 dark:text-neutral-400">{s.l}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {COPY.coverage.samples.map((s) => (
              <span
                key={s}
                className="px-3 py-1.5 rounded-full text-[11px] font-medium bg-neutral-950 dark:bg-white text-white dark:text-neutral-950"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------- faq */}
      <section id="faq" className="relative w-full flex flex-col items-center px-6 py-16 sm:py-24">
        <Watermark>{COPY.faq.badge.toUpperCase()}</Watermark>
        <div className="w-full max-w-3xl relative z-10">
          <SectionHeading badge={COPY.faq.badge} title={COPY.faq.title} />
          <div className="mt-8 divide-y divide-neutral-200 dark:divide-white/10 border-y border-neutral-200 dark:border-white/10">
            {COPY.faq.items.map((item) => {
              const isOpen = open === item.q
              return (
                <div key={item.q}>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : item.q)}
                    aria-expanded={isOpen}
                    className="w-full text-left py-4 flex items-center justify-between gap-4 cursor-pointer group"
                  >
                    <span className="text-sm sm:text-base font-semibold tracking-tight group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                      {item.q}
                    </span>
                    <span
                      className={`flex-shrink-0 text-neutral-400 text-lg leading-none transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </button>
                  {isOpen ? (
                    <p className="pb-4 -mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300 max-w-2xl">
                      {item.a}
                    </p>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------- cta */}
      <section className="relative w-full flex flex-col items-center text-center px-6 py-20 sm:py-28">
        <div className="max-w-2xl relative z-10">
          <Badge>{COPY.cta.badge}</Badge>
          <h2 className="mt-5 text-3xl sm:text-5xl font-black tracking-tight text-balance bg-clip-text text-transparent bg-gradient-to-b from-neutral-950 via-neutral-800 to-neutral-500 dark:from-white dark:via-neutral-200 dark:to-neutral-400">
            {COPY.cta.title}
          </h2>
          <p className="mt-4 text-sm sm:text-base text-neutral-600 dark:text-neutral-300 text-balance">{COPY.cta.body}</p>
          <Link
            to="/app"
            className="mt-8 inline-flex h-11 items-center gap-2 px-6 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            {COPY.nav.cta}
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {/* -------------------------------------------- footer */}
      <footer className="border-t border-neutral-200 dark:border-white/10 pt-safe pb-safe">
        <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="h-7 w-7 flex items-center justify-center rounded-lg bg-neutral-950 dark:bg-white text-white dark:text-neutral-950">
              <Landmark size={14} strokeWidth={2.2} />
            </span>
            <span className="text-xs font-bold tracking-tight">Swatva AI</span>
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 max-w-md">{COPY.footer.note}</p>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
            <Target size={12} />
            {COPY.footer.right}
          </p>
        </div>
      </footer>
    </div>
  )
}
