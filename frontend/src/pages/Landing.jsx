import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  ChevronRight,
  ChevronUp,
  ClipboardCheck,
  Cpu,
  BarChart3,
  FileStack,
  Globe,
  Globe2,
  HelpCircle,
  Layers,
  Menu,
  Route,
  Scale,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../lib/theme'
import LoadingLogo from '../components/LoadingLogo'
import { isInitialSplashFinished } from '../components/SplashLoader'
import CurvyArrow from '../components/CurvyArrow'
import KineticRollingHeadline from '../components/KineticRollingHeadline'
import PreferencesModal from '../components/PreferencesModal'
import ThemeToggle from '../components/ThemeToggle'
import FooterParticles from '../components/FooterParticles'
import { playClick } from '../utils/soundFx'

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
// Icons are chosen to match what each figure counts — a catalogue of schemes, a
// national programme, one state's catalogue, and the rule types behind them —
// so the row reads as four distinct facts rather than four bare numerals.
const COVERAGE_STATS = [
  { n: '20', key: 'stat0', icon: Layers },
  { n: '6', key: 'stat1', icon: Globe2 },
  { n: '14', key: 'stat2', icon: Globe },
  { n: '9', key: 'stat3', icon: Scale },
]
const COVERAGE_SAMPLES = [
  'PM-KISAN', 'Ayushman Bharat PM-JAY', 'PM Jan-Dhan Yojana', 'Jeevan Jyoti Bima',
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

const TYPING_MIN = 22
const TYPING_MAX = 42
const HOLD_MS = 3400
const ERASE_MS = 14
const GAP_MS = 120

function useTypewriter(phrases, active) {
  const [text, setText] = useState('')
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState('typing')
  const timer = useRef(null)

  // Reset to first phrase cleanly if language changes
  useEffect(() => {
    setText('')
    setIndex(0)
    setPhase('typing')
  }, [phrases])

  useEffect(() => {
    if (!active || !phrases.length) return
    const phrase = phrases[index % phrases.length] || ''

    if (phase === 'typing') {
      if (text.length < phrase.length) {
        timer.current = setTimeout(() => {
          setText(phrase.slice(0, text.length + 1))
        }, TYPING_MIN + Math.random() * (TYPING_MAX - TYPING_MIN))
      } else {
        timer.current = setTimeout(() => setPhase('holding'), HOLD_MS)
      }
    } else if (phase === 'holding') {
      timer.current = setTimeout(() => setPhase('erasing'), 150)
    } else if (phase === 'erasing') {
      if (text.length > 0) {
        timer.current = setTimeout(() => setText(phrase.slice(0, text.length - 1)), ERASE_MS)
      } else {
        timer.current = setTimeout(() => {
          setIndex((i) => (i + 1) % phrases.length)
          setPhase('typing')
        }, GAP_MS)
      }
    }

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


function SectionHeading({ title, desc, arrow, className = '' }) {
  return (
    <div className={`max-w-2xl mx-auto text-center ${className}`}>
      <div className="relative group max-w-fit mx-auto">
        {arrow}
        <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-balance text-neutral-950 dark:text-white">
          {title}
        </h2>
      </div>
      {desc ? (
        <p className="mt-3.5 text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300 text-balance">
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
  const { t, i18n } = useTranslation()
  const { dark, setDark } = useTheme()
  const [query, setQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchHovered, setSearchHovered] = useState(false)
  // Drives the staggered reveal on the coverage stat row.
  const coverageRef = useRef(null)
  const [coverageInView, setCoverageInView] = useState(false)

  useEffect(() => {
    const el = coverageRef.current
    // Without IntersectionObserver the tiles must still be visible, so this
    // fails open rather than leaving the section blank.
    if (!el || typeof IntersectionObserver === 'undefined') {
      setCoverageInView(true)
      return undefined
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setCoverageInView(true)
        io.disconnect()
      },
      { threshold: 0.2 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const [open, setOpen] = useState(null)
  const navigate = useNavigate()
  const searchRef = useRef(null)
  const mobileMenuRef = useRef(null)
  const promptTexts = useMemo(() => PROMPTS.map((k) => t(`landing.hero.${k}`)), [t])
  const prompt = useTypewriter(promptTexts, !searchFocused && query.length === 0)
  const [scrolled, setScrolled] = useState(false)
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Sahnirmaan morphing navbar scroll engine
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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

  const scrollToSection = (e, id) => {
    if (e) e.preventDefault()
    if (window.lenis) {
      window.lenis.scrollTo(`#${id}`, { offset: -90, duration: 1.2 })
    } else {
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  const handleMobileNav = (sectionId) => {
    playClick()
    setIsMobileMenuOpen(false)
    setTimeout(() => {
      const el = document.getElementById(sectionId)
      if (el) {
        if (window.lenis) {
          window.lenis.scrollTo(el, { offset: -80, duration: 1.2 })
        } else {
          const top = el.getBoundingClientRect().top + window.pageYOffset - 80
          window.scrollTo({ top, behavior: 'smooth' })
        }
      }
    }, 250)
  }

  const handleMobilePrefs = () => {
    playClick()
    setIsMobileMenuOpen(false)
    setTimeout(() => {
      setIsPreferencesOpen(true)
    }, 200)
  }

  const onSearch = (e) => {
    e.preventDefault()
    if (!query.trim()) return
    navigate('/app')
  }

  return (
    <div className="min-h-dvh w-full overflow-x-hidden bg-porcelain dark:bg-obsidian text-neutral-950 dark:text-white transition-colors">
      {/* ------------------------------------------------------ nav */}
      <header className={`portfolio-header ${scrolled ? 'scrolled' : ''}`}>
        {/* Left: Brand Logo & Name. Deliberately NOT `flex-1`: the header's own
            `justify-content: space-between` is what splits the leftover space
            into two equal gaps around the centre cluster. Letting the side
            clusters grow instead makes them absorb the slack, which is what left
            a wide void between the logo and the nav links once the bar floats. */}
        <div className="flex items-center flex-shrink-0 min-w-0">
          <Link to="/" className="flex items-center gap-2.5 min-w-0 group flex-shrink-0">
            <div className="relative flex items-center justify-center flex-shrink-0">
              <span
                aria-hidden="true"
                className="absolute inset-0 -m-1 rounded-full bg-amber-500/[0.08] blur-lg dark:block hidden pointer-events-none transition-opacity duration-500 group-hover:bg-amber-500/[0.15]"
              />
              <LoadingLogo 
                animate={true} 
                loop={false} 
                delay={
                  isInitialSplashFinished 
                    ? 0 
                    : (typeof window !== 'undefined' && sessionStorage.getItem('swatva_has_visited') ? 1150 : 2050)
                } 
              />
            </div>
            {!scrolled && (
              <span className="font-bold text-sm tracking-tight truncate hidden sm:inline-block text-neutral-950 dark:text-white transition-colors duration-150 ease-out">
                {t('common.appName')}
              </span>
            )}
          </Link>
        </div>

        {/* Center: Mathematically and Optically Centered Navigation Links */}
        <div className="flex items-center justify-center flex-shrink-0">
          {/* Left Hairline Divider - ONLY visible on floating scrolled navbar */}
          <div className={`hidden md:block h-3.5 w-[1px] bg-neutral-300 dark:bg-white/20 mr-4 transition-opacity duration-300 ${scrolled ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />

          <nav className="hidden md:flex items-center gap-4 lg:gap-5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
            <a href="#how" onClick={(e) => scrollToSection(e, 'how')} className="group inline-flex items-center gap-1.5 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer">
              <Route size={13} className="text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-950 dark:group-hover:text-white transition-all duration-300 flex-shrink-0 stroke-[1.8] group-hover:stroke-[2.5]" />
              <span>{t('nav.how')}</span>
            </a>
            <a href="#capabilities" onClick={(e) => scrollToSection(e, 'capabilities')} className="group inline-flex items-center gap-1.5 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer">
              <Layers size={13} className="text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-950 dark:group-hover:text-white transition-all duration-300 flex-shrink-0 stroke-[1.8] group-hover:stroke-[2.5]" />
              <span>{t('nav.platform')}</span>
            </a>
            <a href="#coverage" onClick={(e) => scrollToSection(e, 'coverage')} className="group inline-flex items-center gap-1.5 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer">
              <BarChart3 size={13} className="text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-950 dark:group-hover:text-white transition-all duration-300 flex-shrink-0 stroke-[1.8] group-hover:stroke-[2.5]" />
              <span>{t('nav.coverage')}</span>
            </a>
            <a href="#faq" onClick={(e) => scrollToSection(e, 'faq')} className="group inline-flex items-center gap-1.5 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer">
              <HelpCircle size={13} className="text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-950 dark:group-hover:text-white transition-all duration-300 flex-shrink-0 stroke-[1.8] group-hover:stroke-[2.5]" />
              <span>{t('nav.faq')}</span>
            </a>
          </nav>

          {/* Right Hairline Divider - ONLY visible on floating scrolled navbar */}
          <div className={`hidden md:block h-3.5 w-[1px] bg-neutral-300 dark:bg-white/20 ml-4 transition-opacity duration-300 ${scrolled ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />
        </div>

        {/* Right: Preferences Gear, 360° Theme Toggle & Sign In CTA.
            Also not `flex-1` — see the note on the left cluster. */}
        <div className="flex items-center justify-end flex-shrink-0 gap-1.5 sm:gap-2">
          {/* Preferences Button (Desktop) */}
          <button
            type="button"
            onClick={() => { playClick(); setIsPreferencesOpen(true); }}
            className="hidden sm:flex w-8 h-8 rounded-full items-center justify-center cursor-pointer border border-neutral-200/80 dark:border-white/20 bg-neutral-100/80 dark:bg-white/[0.08] hover:bg-neutral-200/70 dark:hover:bg-white/15 text-neutral-800 dark:text-neutral-200 hover:text-neutral-950 dark:hover:text-white transition-all shadow-2xs backdrop-blur-md group"
            aria-label="Preferences"
            title="Preferences"
          >
            <Settings size={14} className="text-neutral-600 dark:text-neutral-300 group-hover:rotate-90 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" />
          </button>

          <ThemeToggle darkMode={dark} toggleTheme={() => setDark(!dark)} />

          <Link
            to="/app"
            onClick={playClick}
            className="h-8 sm:h-8.5 px-3 sm:px-4 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity flex-shrink-0"
          >
            <span>{t('nav.cta')}</span>
            <ArrowUpRight size={13} strokeWidth={2.2} />
          </Link>

          {/* Mobile-only: Hamburger Menu Button */}
          <button
            type="button"
            onClick={() => { playClick(); setIsMobileMenuOpen(prev => !prev); }}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
            className="w-8 h-8 rounded-full md:hidden flex items-center justify-center cursor-pointer border border-neutral-200/80 dark:border-white/20 bg-neutral-100/80 dark:bg-white/[0.08] hover:bg-neutral-200/70 dark:hover:bg-white/15 text-neutral-800 dark:text-neutral-200 hover:text-neutral-950 dark:hover:text-white transition-all shadow-2xs backdrop-blur-md focus:outline-none flex-shrink-0"
          >
            {isMobileMenuOpen ? <X size={15} /> : <Menu size={15} />}
          </button>
        </div>
      </header>

      {/* Mobile-only: Full-Height Glassmorphism Navigation Drawer (copied from SAHNIRMAAN) */}
      <div 
        className={`fixed inset-0 z-[10000] md:hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Dim, blurred backdrop — tap to close */}
        <div
          className={`absolute inset-0 bg-neutral-950/60 dark:bg-black/85 backdrop-blur-md transition-opacity duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />

        {/* Glass panel sliding in from the right with ultra-smooth 500ms ease */}
        <div
          ref={mobileMenuRef}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Menu"
          className={`absolute inset-y-0 right-0 w-[85%] max-w-xs sm:max-w-sm flex flex-col overflow-y-auto bg-white/95 dark:bg-[#08080a] backdrop-blur-2xl border-l border-neutral-200 dark:border-white/15 shadow-2xl dark:shadow-[0_0_50px_rgba(0,0,0,0.9)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Sidebar header: brand + close */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200/80 dark:border-white/10 flex-shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <LoadingLogo size="h-7 w-7" animate={false} />
              <span className="font-bold tracking-tight text-sm text-neutral-950 dark:text-white whitespace-nowrap">
                SWATVA
              </span>
            </div>
            <button
              type="button"
              onClick={() => { playClick(); setIsMobileMenuOpen(false); }}
              aria-label="Close menu"
              className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer border border-neutral-200/80 dark:border-white/20 bg-neutral-100/80 dark:bg-white/10 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-white/20 transition flex-shrink-0"
            >
              <X size={15} />
            </button>
          </div>

          {/* Section nav links */}
          <nav className="flex flex-col px-4 pt-3 pb-1 flex-shrink-0 space-y-1">
            <button 
              type="button"
              onClick={() => handleMobileNav('how')}
              className="group w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/10 transition cursor-pointer bg-transparent border-none text-left"
            >
              <Layers size={16} className="text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-950 dark:group-hover:text-white transition flex-shrink-0" />
              <span>{t('nav.how')}</span>
            </button>
            <button 
              type="button"
              onClick={() => handleMobileNav('capabilities')}
              className="group w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/10 transition cursor-pointer bg-transparent border-none text-left"
            >
              <Cpu size={16} className="text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-950 dark:group-hover:text-white transition flex-shrink-0" />
              <span>{t('nav.platform')}</span>
            </button>
            <button 
              type="button"
              onClick={() => handleMobileNav('coverage')}
              className="group w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/10 transition cursor-pointer bg-transparent border-none text-left"
            >
              <ShieldCheck size={16} className="text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-950 dark:group-hover:text-white transition flex-shrink-0" />
              <span>{t('nav.coverage')}</span>
            </button>
            <button 
              type="button"
              onClick={() => handleMobileNav('faq')}
              className="group w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/10 transition cursor-pointer bg-transparent border-none text-left"
            >
              <HelpCircle size={16} className="text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-950 dark:group-hover:text-white transition flex-shrink-0" />
              <span>{t('nav.faq')}</span>
            </button>
          </nav>

          {/* Divider */}
          <div aria-hidden="true" className="mx-5 my-2 border-t border-neutral-200/70 dark:border-white/10" />

          {/* Mobile Language Switcher */}
          <div className="px-4 py-2 flex-shrink-0">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-semibold flex items-center gap-1.5">
                <Globe2 size={13} className="text-neutral-400" />
                <span>Language / भाषा</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200/80 dark:border-white/10">
              {[
                { code: 'en', label: 'English' },
                { code: 'hi', label: 'हिन्दी' },
              ].map((lang) => {
                const isSelected = i18n.language?.startsWith(lang.code);
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      playClick();
                      i18n.changeLanguage(lang.code);
                    }}
                    className={`py-2 px-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center truncate ${
                      isSelected
                        ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
                    }`}
                  >
                    {lang.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Distinct System Utility Card: Preferences Panel Trigger */}
          <div className="px-4 py-2 flex-shrink-0">
            <button 
              type="button"
              onClick={handleMobilePrefs}
              className="group w-full flex items-center justify-between p-3.5 rounded-2xl bg-neutral-100/90 dark:bg-white/[0.05] border border-neutral-200/80 dark:border-white/10 hover:border-neutral-300 dark:hover:border-white/20 transition cursor-pointer text-left shadow-2xs active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white dark:bg-white/10 border border-neutral-200/80 dark:border-white/10 flex items-center justify-center text-neutral-900 dark:text-white flex-shrink-0 shadow-2xs">
                  <Settings size={15} className="group-hover:rotate-45 transition-transform duration-500" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-neutral-950 dark:text-white leading-snug">
                    System Preferences
                  </div>
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-snug">
                    Theme, Audio Feedback & Physics
                  </div>
                </div>
              </div>
              <ChevronRight size={14} className="text-neutral-400 dark:text-neutral-500 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
            </button>
          </div>

          {/* Mobile Drawer Footer: Primary Solid Sign In CTA Button */}
          <div className="px-4 pb-6 pt-2 flex-shrink-0 mt-auto">
            <Link
              to="/app"
              onClick={() => { playClick(); setIsMobileMenuOpen(false); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 hover:opacity-90 transition cursor-pointer shadow-md active:scale-[0.98]"
            >
              <span>{t('nav.cta')}</span>
              <ArrowUpRight size={14} className="text-current flex-shrink-0 stroke-[2.2]" />
            </Link>
          </div>
        </div>
      </div>

      {/* Preferences Modal (Language & Theme Selection) */}
      <PreferencesModal 
        isOpen={isPreferencesOpen} 
        onClose={() => setIsPreferencesOpen(false)} 
      />

      {/* ---------------------------------------------------- hero */}
      <section className="relative w-full flex flex-col items-center text-center px-4 sm:px-6 pt-32 sm:pt-40 pb-20 sm:pb-28 min-h-[88vh] sm:min-h-[92vh] justify-center">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[680px] h-[200px] sm:h-[340px] bg-gradient-to-b from-amber-500/[0.05] via-amber-500/[0.015] to-transparent rounded-full blur-[80px] sm:blur-[100px] pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative w-full max-w-4xl z-10 flex flex-col items-center">
          <h1 className="tracking-tight text-balance relative z-10 mb-4 flex flex-col items-center w-full">
            <span className="relative inline-block max-w-fit group cursor-default whitespace-nowrap font-black text-[clamp(1.35rem,6.6vw,4rem)] leading-[1.18] bg-clip-text text-transparent bg-gradient-to-b from-neutral-950 via-neutral-800 to-neutral-500 dark:from-white dark:via-neutral-200 dark:to-neutral-400">
              <CurvyArrow 
                direction="top-left" 
                className="-left-12 sm:-left-24 -top-8 sm:-top-10"
                label={t('landing.arrowTags.citizenEmpowerment')}

              />
              {t('landing.hero.title')}
            </span>
            <span className="block mt-2 sm:mt-3 text-xl sm:text-3xl md:text-5xl font-semibold leading-[1.2] w-full">
              <KineticRollingHeadline />
            </span>
          </h1>
        </div>

        {/* search box with Curvy Arrow */}
        <div
          className="relative group w-full max-w-2xl mt-8 z-10"
          onMouseEnter={() => setSearchHovered(true)}
          onMouseLeave={() => setSearchHovered(false)}
        >
          {/* The callout is a hint for the search field, so it only earns its
              space while the field is in play: hovered, focused, or already
              holding a query. Once dismissed the pointer is free again. */}
          <CurvyArrow 
            direction="top-right" 
            className="-right-2 sm:-right-14 -top-10 sm:-top-12" 
            label={t('landing.arrowTags.allSchemes')} 
            visible={searchFocused || searchHovered || query.length > 0}
            active={searchFocused || query.length > 0}
            revealDuration={320}
          />
          <form onSubmit={onSearch} className="w-full">
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
                  placeholder={searchFocused ? '' : (prompt || ' ')}
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
        </div>

        {/* Suggested Quick Prompts with crisp visible outlines */}
        <div className="relative z-10 mt-6 flex flex-wrap items-center justify-center gap-2 max-w-2xl">
          {PROMPTS.slice(0, 3).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => { setQuery(t(`landing.hero.${k}`)); navigate('/app') }}
              className="px-3.5 py-1.5 rounded-full text-[11px] font-medium border border-neutral-300 dark:border-white/20 bg-neutral-100/90 dark:bg-white/[0.06] text-neutral-700 dark:text-neutral-300 hover:border-neutral-500 dark:hover:border-white/40 hover:bg-neutral-200/80 dark:hover:bg-white/10 transition-all shadow-2xs cursor-pointer"
            >
              {t(`landing.hero.${k}`)}
            </button>
          ))}
        </div>
      </section>

      {/* ------------------------------------------- how it works */}
      <section id="how" className="relative w-full flex flex-col items-center px-6 py-16 sm:py-24 scroll-mt-20 sm:scroll-mt-24">
        <Watermark>{t('landing.steps.watermark')}</Watermark>
        <div className="w-full max-w-5xl relative z-10">
          <SectionHeading
            title={t('landing.steps.title')}
            desc={t('landing.steps.desc')}
            arrow={
              <CurvyArrow
                direction="top-right"
                className="-right-6 sm:-right-20 -top-9 sm:-top-11"
                label={t('landing.arrowTags.threeStepFlow')}
              />
            }
          />
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
      <section id="capabilities" className="relative w-full flex flex-col items-center px-6 py-16 sm:py-24 scroll-mt-20 sm:scroll-mt-24">
        <Watermark>{t('landing.capabilities.watermark')}</Watermark>
        <div className="w-full max-w-5xl relative z-10">
          <SectionHeading
            title={t('landing.capabilities.title')}
            desc={t('landing.capabilities.desc')}
            arrow={
              <CurvyArrow
                direction="top-left"
                className="-left-4 sm:-left-16 -top-9 sm:-top-11"
                label={t('landing.arrowTags.aiSuite')}
              />
            }
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
            <SectionHeading
              title={t('landing.trust.title')}
              desc={t('landing.trust.body')}
              arrow={
                <CurvyArrow
                  direction="top-right"
              className="-right-8 sm:-right-24 -top-9 sm:-top-11"

                  label={t('landing.arrowTags.auditIntegrity')}
                />
              }
            />
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

      {/* --------------------------------- bento grid architecture */}
      <section className="relative w-full flex flex-col items-center px-6 py-16 sm:py-24">
        <Watermark>ARCHITECTURE</Watermark>
        <div className="w-full max-w-5xl relative z-10">
          <SectionHeading
            title={t('landing.bento.title')}
            desc={t('landing.bento.desc')}
            arrow={
              <CurvyArrow
                direction="top-right"
                className="-right-4 sm:-right-16 -top-9 sm:-top-11"
                label={t('landing.arrowTags.platformArchitecture')}
              />
            }
          />

          {/* Asymmetric Minimalist Bento Grid */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Bento Card 1: Featured 2-Column Deterministic Verification Node */}
            <div className="md:col-span-2 neo-glass-card p-7 sm:p-9 flex flex-col justify-between text-left relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/5 rounded-bl-full pointer-events-none transition-transform duration-500 group-hover:scale-110" />
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2 text-xs text-neutral-500 font-medium">
                    <Scale size={14} className="text-amber-600 dark:text-amber-400" />
                    <span className="font-semibold text-neutral-950 dark:text-white">{t('landing.bento.card1Tag')}</span>
                    <span className="text-neutral-400">• {t('landing.bento.card1Meta')}</span>
                  </div>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-neutral-950 dark:bg-white text-white dark:text-neutral-950">
                    {t('landing.bento.card1Badge')}
                  </span>
                </div>

                <h3 className="text-lg sm:text-2xl font-bold text-neutral-950 dark:text-white mb-3 tracking-tight text-balance">
                  {t('landing.bento.card1Title')}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed font-normal mb-8 text-balance max-w-xl">
                  {t('landing.bento.card1Desc')}
                </p>
              </div>

              <div className="mt-auto pt-4 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-neutral-200/80 dark:border-white/10">
                <div className="flex items-center space-x-2.5 text-neutral-700 dark:text-neutral-300">
                  <div className="h-8 w-8 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center font-bold text-xs shadow-2xs">
                    RE
                  </div>
                  <div>
                    <div className="text-xs font-bold text-neutral-950 dark:text-white">{t('landing.bento.card1FooterTitle')}</div>
                    <div className="text-[10px] text-neutral-500">{t('landing.bento.card1FooterSub')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono">
                  <span>{t('landing.bento.card1StatusLabel')}</span>
                  <span className="text-neutral-950 dark:text-white font-medium">{t('landing.bento.card1StatusVal')}</span>
                </div>
              </div>
            </div>

            {/* Bento Card 2: 1-Column Live State Telemetry Node */}
            <div className="md:col-span-1 neo-glass-card p-7 flex flex-col justify-between text-left">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                    {t('landing.bento.card2Tag')}
                  </span>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-600 dark:bg-amber-400" />
                  </span>
                </div>
                <h3 className="text-base font-bold text-neutral-950 dark:text-white mb-4 tracking-tight">
                  {t('landing.bento.card2Title')}
                </h3>

                <div className="space-y-2.5 font-mono">
                  <div className="p-3 rounded-2xl bg-white/60 dark:bg-white/[0.03] flex justify-between items-center border border-neutral-200/50 dark:border-white/5">
                    <span className="text-xs text-neutral-600 dark:text-neutral-400">{t('landing.bento.card2Metric1')}</span>
                    <span className="text-xs font-bold text-neutral-950 dark:text-white">{t('landing.bento.card2Val1')}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/60 dark:bg-white/[0.03] flex justify-between items-center border border-neutral-200/50 dark:border-white/5">
                    <span className="text-xs text-neutral-600 dark:text-neutral-400">{t('landing.bento.card2Metric2')}</span>
                    <span className="text-xs font-bold text-neutral-950 dark:text-white">{t('landing.bento.card2Val2')}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/60 dark:bg-white/[0.03] flex justify-between items-center border border-neutral-200/50 dark:border-white/5">
                    <span className="text-xs text-neutral-600 dark:text-neutral-400">{t('landing.bento.card2Metric3')}</span>
                    <span className="text-xs font-bold text-neutral-950 dark:text-white">{t('landing.bento.card2Val3')}</span>
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-5 text-[11px] text-neutral-500 flex items-center justify-between border-t border-neutral-200/80 dark:border-white/10">
                <span>{t('landing.bento.card2Footer')}</span>
                <span className="font-mono font-semibold text-neutral-950 dark:text-white">{t('landing.bento.card2FooterVal')}</span>
              </div>
            </div>

            {/* Bento Card 3: 1-Column Document Vault Tile */}
            <div className="md:col-span-1 neo-glass-card p-7 flex flex-col justify-between text-left">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-1.5 text-xs text-neutral-500 font-medium">
                    <FileStack size={13} className="text-amber-600 dark:text-amber-400" />
                    <span>{t('landing.bento.card3Sub')}</span>
                  </div>
                  <span className="text-[10px] font-mono font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    {t('landing.bento.card3Badge')}
                  </span>
                </div>

                <h3 className="text-sm sm:text-base font-bold text-neutral-950 dark:text-white mb-2 text-balance">
                  {t('landing.bento.card3Title')}
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed font-normal mb-6 text-balance">
                  {t('landing.bento.card3Desc')}
                </p>
              </div>

              <div className="mt-auto pt-3 flex items-center justify-between text-xs font-medium border-t border-neutral-200/80 dark:border-white/10">
                <div className="flex items-center space-x-1.5 text-neutral-700 dark:text-neutral-300">
                  <ShieldCheck size={14} className="text-neutral-700 dark:text-neutral-300" />
                  <span className="truncate max-w-[150px] text-[11px] font-medium">{t('landing.bento.card3Security')}</span>
                </div>
                <span className="text-[10px] font-mono text-neutral-500">{t('landing.bento.card3Tech')}</span>
              </div>
            </div>

            {/* Bento Card 4: 2-Column Vernacular Natural Language Assistant Tile */}
            <div className="md:col-span-2 neo-glass-card p-7 flex flex-col justify-between text-left">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-y-2 mb-3">
                  <div className="flex items-center space-x-1.5 text-xs text-neutral-500 font-medium">
                    <Sparkles size={12} className="flex-shrink-0 text-amber-500" />
                    <span>{t('landing.bento.card4Location')}</span>
                    <span className="text-neutral-300 dark:text-neutral-600">•</span>
                    <span>{t('landing.bento.card4Dialects')}</span>
                  </div>
                  <span className="text-[10px] font-mono font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    {t('landing.bento.card4Badge')}
                  </span>
                </div>

                <h3 className="text-sm sm:text-base font-bold text-neutral-950 dark:text-white mb-2 text-balance">
                  {t('landing.bento.card4Title')}
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed font-normal mb-6 text-balance">
                  {t('landing.bento.card4Desc')}
                </p>
              </div>

              <div className="mt-auto pt-3 flex items-center justify-between text-xs font-medium border-t border-neutral-200/80 dark:border-white/10">
                <div className="flex items-center space-x-1.5 text-neutral-700 dark:text-neutral-300">
                  <Globe size={14} className="text-neutral-700 dark:text-neutral-300" />
                  <span className="truncate max-w-[220px] text-[11px] font-medium">{t('landing.bento.card4Engine')}</span>
                </div>
                <span className="text-[10px] font-mono text-neutral-500">{t('landing.bento.card4Citation')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------- coverage */}
      <section id="coverage" className="relative w-full flex flex-col items-center px-6 py-16 sm:py-24 scroll-mt-20 sm:scroll-mt-24">
        <Watermark>{t('landing.coverage.watermark')}</Watermark>
        <div className="w-full max-w-5xl relative z-10">
          <SectionHeading
            title={t('landing.coverage.title')}
            desc={t('landing.coverage.desc')}
            arrow={
              <CurvyArrow
                direction="top-left"
                className="-left-4 sm:-left-16 -top-9 sm:-top-11"
                label={t('landing.arrowTags.schemesCoverage')}
              />
            }
          />
          {/* One observer on the row drives all four tiles; the per-tile stagger
              is a CSS delay off the shared `data-inview` flag, so the numbers
              land in sequence and the row then behaves like a plain grid. */}
          <div
            ref={coverageRef}
            data-inview={coverageInView ? 'true' : 'false'}
            className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
          >
            {COVERAGE_STATS.map((s, i) => {
              const Icon = s.icon
              return (
                <div key={s.key} className="coverage-stat-cell" style={{ '--i': i }}>
                  <div className="dashboard-amber-card coverage-stat p-6 text-center">
                    <span className="coverage-stat-icon" aria-hidden="true">
                      <Icon size={16} />
                    </span>
                    <div className="coverage-stat-n text-3xl sm:text-4xl font-black tracking-tight font-mono tabular-nums">
                      {s.n}
                    </div>
                    <div className="mt-1.5 mono-badge text-neutral-500 dark:text-neutral-400">
                      {t(`landing.coverage.${s.key}`)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {/* Equal-width cells so every pill gets identical spacing, instead of
              the ragged rhythm that variable label lengths produce when the row
              is sized by content. */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {COVERAGE_SAMPLES.map((s) => (
              <span
                key={s}
                className="px-3 py-1.5 rounded-full text-[11px] font-medium leading-tight text-center bg-neutral-950 dark:bg-white text-white dark:text-neutral-950"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------- faq (SAHNIRMAAN style) */}
      <section id="faq" className="relative w-full flex flex-col items-center px-6 py-16 sm:py-24 scroll-mt-20 sm:scroll-mt-24">
        <Watermark>FAQ</Watermark>
        <div className="w-full max-w-3xl relative z-10">
          <SectionHeading
            title={t('landing.faq.title')}
            arrow={
              <CurvyArrow
                direction="top-right"
                className="-right-4 sm:-right-16 -top-9 sm:-top-11"
                label={t('landing.arrowTags.helpFaq')}
              />
            }
          />

          <div className="mt-8 space-y-3">
            {FAQ_ITEMS.map((item) => {
              const isOpen = open === item.q
              return (
                <div
                  key={item.q}
                  className="p-5 rounded-2xl neo-glass-card cursor-pointer transition-all hover:border-neutral-300 dark:hover:border-white/20 select-none group"
                  onClick={() => {
                    playClick()
                    setOpen(isOpen ? null : item.q)
                  }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white tracking-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {t(`landing.faq.${item.q}`)}
                    </span>
                    <span className="text-neutral-400 text-sm font-mono font-medium flex-shrink-0 transition-transform duration-200">
                      {isOpen ? '−' : '+'}
                    </span>
                  </div>
                  <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                      <p className="mt-3 text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed font-sans">
                        {t(`landing.faq.${item.a}`)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------- cta */}
      <section className="relative w-full flex flex-col items-center text-center px-6 py-20 sm:py-28">
        <div className="max-w-2xl relative z-10 flex flex-col items-center">
          <div className="relative group max-w-fit mx-auto">
            <CurvyArrow
              direction="top-right"
              className="-right-4 sm:-right-16 -top-9 sm:-top-11"
              label={t('landing.arrowTags.instantAccess')}
            />
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-balance bg-clip-text text-transparent bg-gradient-to-b from-neutral-950 via-neutral-800 to-neutral-500 dark:from-white dark:via-neutral-200 dark:to-neutral-400">
              {t('landing.cta.title')}
            </h2>
          </div>
          <p className="mt-4 text-sm sm:text-base text-neutral-600 dark:text-neutral-300 text-balance">{t('landing.cta.body')}</p>
          <Link
            to="/app"
            onClick={playClick}
            className="mt-8 inline-flex h-11 items-center gap-2 px-6 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            {t('nav.cta')}
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {/* ----------------- Dynamic Pointillism Particle Canvas (from SAHNIRMAAN) */}
      <div className="w-full border-t border-neutral-200/50 dark:border-white/5 py-4">
        <FooterParticles text="SWATVA" darkMode={dark} />
      </div>

      {/* -------------------------------------------- footer */}
      <footer className="w-full relative border-t border-neutral-200 dark:border-white/15 py-8 px-6 max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-600 dark:text-neutral-300 gap-3 mt-6">
        {/* Absolute Centered Top-Border Scroll-to-Top Button */}
        <button
          type="button"
          onClick={() => {
            playClick()
            window.dispatchEvent(new CustomEvent('swatva-trigger-particle-dissolve'))
            setTimeout(() => {
              if (window.lenis) {
                window.lenis.scrollTo(0, { duration: 1.2 })
              } else {
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }
            }, 320)
          }}
          className="footer-scroll-top"
          aria-label="Scroll to top"
          title="Scroll to top"
        >
          <ChevronUp size={16} />
        </button>

        <div className="flex items-center gap-2.5">
          <LoadingLogo size="h-7 w-7" animate={false} />
          <span className="text-xs font-bold tracking-tight text-neutral-950 dark:text-white">SWATVA</span>
          <span className="h-3 w-px bg-neutral-300 dark:bg-white/20" aria-hidden="true" />
          <span className="text-[9px] uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400 font-medium">
            {t('landing.footer.tagline')}
          </span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-neutral-600 dark:text-neutral-300 font-medium">
          <a href="#how" onClick={(e) => scrollToSection(e, 'how')} className="hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer">{t('nav.how')}</a>
          <a href="#capabilities" onClick={(e) => scrollToSection(e, 'capabilities')} className="hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer">{t('nav.platform')}</a>
          <a href="#coverage" onClick={(e) => scrollToSection(e, 'coverage')} className="hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer">{t('nav.coverage')}</a>
          <a href="#faq" onClick={(e) => scrollToSection(e, 'faq')} className="hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer">{t('nav.faq')}</a>
        </div>
      </footer>
    </div>
  )
}

