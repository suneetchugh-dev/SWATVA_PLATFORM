import { useEffect, useMemo, useRef, useState } from 'react'
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
import { useTranslation } from 'react-i18next'
import { useTheme } from '../lib/theme'
import LanguageSwitcher from '../components/LanguageSwitcher'

/* ------------------------------------------------------------------ *
 * Copy. Kept in one place so the English/Hindi pass (i18next) is a
 * mechanical change rather than a rewrite.
 * ------------------------------------------------------------------ */

// All landing copy lives in src/locales/{en,hi}.json under `landing.*`.
// Keeping it out of the component is what makes the Hindi pass mechanical.
const ROTATING = ['rotating0', 'rotating1', 'rotating2']
const PROMPTS = ['prompt0', 'prompt1', 'prompt2', 'prompt3']
const STEP_ITEMS = [
  { n: '01', titleKey: 'item0Title', bodyKey: 'item0Body' },
  { n: '02', titleKey: 'item1Title', bodyKey: 'item1Body' },
  { n: '03', titleKey: 'item2Title', bodyKey: 'item2Body' },
]
const CAPABILITY_ITEMS = [
  { Icon: Scale, titleKey: 'item0Title', bodyKey: 'item0Body' },
  { Icon: Wallet, titleKey: 'item1Title', bodyKey: 'item1Body' },
  { Icon: FileStack, titleKey: 'item2Title', bodyKey: 'item2Body' },
  { Icon: ClipboardCheck, titleKey: 'item3Title', bodyKey: 'item3Body' },
  { Icon: Sparkles, titleKey: 'item4Title', bodyKey: 'item4Body' },
  { Icon: ShieldCheck, titleKey: 'item5Title', bodyKey: 'item5Body' },
]
const TRUST_POINTS = [
  { titleKey: 'point0Title', bodyKey: 'point0Body' },
  { titleKey: 'point1Title', bodyKey: 'point1Body' },
  { titleKey: 'point2Title', bodyKey: 'point2Body' },
  { titleKey: 'point3Title', bodyKey: 'point3Body' },
]
// Figures are facts about the seeded catalogue, not copy — only the labels
// below each one are translatable.
const COVERAGE_STATS = [
  { n: '20', key: 'stat0' },
  { n: '6', key: 'stat1' },
  { n: '14', key: 'stat2' },
  { n: '9', key: 'stat3' },
]
const COVERAGE_SAMPLES = [
  'PM-KISAN', 'Ayushman Bharat PM-JAY', 'PM Jan-Dhan Yojana', 'Jeevan Jyoti Bima',
  'PM Vishwakarma', 'UP Kanya Sumangala', 'UP Shadi Anudan', 'UP Divyangjan Pension',
]
const FAQ_ITEMS = [
  { q: 'q0', a: 'a0' }, { q: 'q1', a: 'a1' }, { q: 'q2', a: 'a2' },
  { q: 'q3', a: 'a3' }, { q: 'q4', a: 'a4' },
]

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
  const { t } = useTranslation()
  const { dark, setDark } = useTheme()
  const [query, setQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [open, setOpen] = useState(null)
  const navigate = useNavigate()
  const searchRef = useRef(null)
  const promptTexts = useMemo(() => ROTATING.map((k) => t(`landing.hero.${k}`)), [t])
  const prompt = useTypewriter(promptTexts, !searchFocused && query.length === 0)

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
            <span className="font-bold text-sm tracking-tight truncate">{t('common.appName')}</span>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-xs font-medium text-neutral-600 dark:text-neutral-300">
            <a href="#how" className="hover:text-neutral-950 dark:hover:text-white transition-colors">{t('nav.how')}</a>
            <a href="#capabilities" className="hover:text-neutral-950 dark:hover:text-white transition-colors">{t('nav.platform')}</a>
            <a href="#coverage" className="hover:text-neutral-950 dark:hover:text-white transition-colors">{t('nav.coverage')}</a>
            <a href="#faq" className="hover:text-neutral-950 dark:hover:text-white transition-colors">{t('nav.faq')}</a>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <LanguageSwitcher className="hidden sm:inline-flex" />
            <ThemeToggle dark={dark} setDark={setDark} />
            <Link
              to="/app"
              className="h-9 px-3.5 sm:px-4 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity"
            >
              {t('nav.cta')}
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
          <Badge>{t('landing.hero.badge')}</Badge>

          <h1 className="mt-6 flex flex-col items-center w-full">
            <span className="block text-3xl sm:text-5xl md:text-7xl font-black leading-[1.12] tracking-tight text-balance bg-clip-text text-transparent bg-gradient-to-b from-neutral-950 via-neutral-800 to-neutral-500 dark:from-white dark:via-neutral-200 dark:to-neutral-400">
              {t('landing.hero.title')}
            </span>
            <span className="block mt-3 sm:mt-4 text-lg sm:text-2xl md:text-4xl font-semibold leading-[1.25] text-balance text-neutral-700 dark:text-neutral-200">
              {promptTexts[0]}
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
                placeholder={t('landing.hero.placeholder')}
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
          {PROMPTS.slice(0, 3).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => { setQuery(t(`landing.hero.${k}`)); navigate('/app') }}
              className="px-3 py-1.5 rounded-full text-[11px] font-medium bg-neutral-100 dark:bg-white/[0.06] text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              {t(`landing.hero.${k}`)}
            </button>
          ))}
        </div>
      </section>

      {/* ------------------------------------------- how it works */}
      <section id="how" className="relative w-full flex flex-col items-center px-6 py-16 sm:py-24">
        <Watermark>{t('landing.steps.watermark')}</Watermark>
        <div className="w-full max-w-5xl relative z-10">
          <SectionHeading badge={t('landing.steps.badge')} title={t('landing.steps.title')} desc={t('landing.steps.desc')} />
          <div className="mt-10 grid gap-4 sm:gap-5 md:grid-cols-3">
            {STEP_ITEMS.map((s) => (
              <div key={s.n} className="neo-glass-card p-6 sm:p-7 flex flex-col">
                <span className="mono-badge text-amber-600 dark:text-amber-400">{s.n}</span>
                <h3 className="mt-3 text-lg font-bold tracking-tight">{t(`landing.steps.${s.titleKey}`)}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{t(`landing.steps.${s.bodyKey}`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------- capabilities */}
      <section id="capabilities" className="relative w-full flex flex-col items-center px-6 py-16 sm:py-24">
        <Watermark>{t('landing.capabilities.watermark')}</Watermark>
        <div className="w-full max-w-5xl relative z-10">
          <SectionHeading
            badge={t('landing.capabilities.badge')}
            title={t('landing.capabilities.title')}
            desc={t('landing.capabilities.desc')}
          />
          <div className="mt-10 grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITY_ITEMS.map(({ Icon, titleKey, bodyKey }) => (
              <div key={titleKey} className="neo-glass-card p-6 sm:p-7">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-950 dark:bg-white text-white dark:text-neutral-950">
                  <Icon size={16} strokeWidth={2} />
                </span>
                <h3 className="mt-4 text-base font-bold tracking-tight">{t(`landing.capabilities.${titleKey}`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{t(`landing.capabilities.${bodyKey}`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------- trust */}
      <section className="relative w-full flex flex-col items-center px-6 py-16 sm:py-24">
        <Watermark>{t('landing.trust.watermark')}</Watermark>
        <div className="w-full max-w-5xl relative z-10">
          <div className="w-full p-8 sm:p-12 neo-glass-card">
            <SectionHeading badge={t('landing.trust.badge')} title={t('landing.trust.title')} desc={t('landing.trust.body')} />
            <div className="mt-9 grid gap-x-8 gap-y-6 sm:grid-cols-2">
              {TRUST_POINTS.map((p) => (
                <div key={p.titleKey} className="flex gap-3">
                  <BadgeCheck size={17} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold tracking-tight">{t(`landing.trust.${p.titleKey}`)}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{t(`landing.trust.${p.bodyKey}`)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------- coverage */}
      <section id="coverage" className="relative w-full flex flex-col items-center px-6 py-16 sm:py-24">
        <Watermark>{t('landing.coverage.watermark')}</Watermark>
        <div className="w-full max-w-5xl relative z-10">
          <SectionHeading badge={t('landing.coverage.badge')} title={t('landing.coverage.title')} desc={t('landing.coverage.desc')} />
          <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {COVERAGE_STATS.map((s) => (
              <div key={s.key} className="dashboard-amber-card p-6 text-center">
                <div className="text-3xl sm:text-4xl font-black tracking-tight font-mono tabular-nums">{s.n}</div>
                <div className="mt-1.5 mono-badge text-neutral-500 dark:text-neutral-400">{t(`landing.coverage.${s.key}`)}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {COVERAGE_SAMPLES.map((s) => (
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
        <Watermark>{t('landing.faq.badge').toUpperCase()}</Watermark>
        <div className="w-full max-w-3xl relative z-10">
          <SectionHeading badge={t('landing.faq.badge')} title={t('landing.faq.title')} />
          <div className="mt-8 divide-y divide-neutral-200 dark:divide-white/10 border-y border-neutral-200 dark:border-white/10">
            {FAQ_ITEMS.map((item) => {
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
                      {t(`landing.faq.${item.q}`)}
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
                      {t(`landing.faq.${item.a}`)}
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
          <Badge>{t('landing.cta.badge')}</Badge>
          <h2 className="mt-5 text-3xl sm:text-5xl font-black tracking-tight text-balance bg-clip-text text-transparent bg-gradient-to-b from-neutral-950 via-neutral-800 to-neutral-500 dark:from-white dark:via-neutral-200 dark:to-neutral-400">
            {t('landing.cta.title')}
          </h2>
          <p className="mt-4 text-sm sm:text-base text-neutral-600 dark:text-neutral-300 text-balance">{t('landing.cta.body')}</p>
          <Link
            to="/app"
            className="mt-8 inline-flex h-11 items-center gap-2 px-6 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            {t('nav.cta')}
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
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 max-w-md">{t('landing.footer.note')}</p>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
            <Target size={12} />
            {t('landing.footer.right')}
          </p>
        </div>
      </footer>
    </div>
  )
}
