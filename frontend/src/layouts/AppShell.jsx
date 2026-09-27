import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import {
  Compass,
  FileStack,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Scale,
  Settings,
} from 'lucide-react'
import { api, getStoredUser } from '../api/client'
import { useTheme } from '../lib/theme'
import { PILL_TRANSITION, useSlidingPill } from '../lib/useSlidingPill'
import PreferencesModal from '../components/PreferencesModal'
import ThemeToggle from '../components/ThemeToggle'
import { cx } from '../components/ui'
import LoadingLogo from '../components/LoadingLogo'
import { playClick } from '../utils/soundFx'

// Routes are stable; only the labels are translated.
// Per-scheme readiness (/app/readiness/:id) is deliberately absent: it is a
// drill-down from a match, not a top-level destination, so it has no nav entry.
//
// The app has one job — find the schemes you qualify for, then apply — so the
// nav is that journey and nothing else: Home, Discover, Matches, Documents,
// Assistant. Per-scheme readiness, profile, benefits and transparency stay off
// the bar: readiness is a drill-down, profile and benefits are account/aggregate
// views, transparency is a trust showcase. All four remain routed and are one
// tap from Home, which links each of them, so no screen is orphaned.
const NAV = [
  { to: '/app', key: 'home', icon: LayoutDashboard, end: true },
  { to: '/app/discover', key: 'discover', icon: Compass },
  { to: '/app/matches', key: 'matches', icon: Scale },
  { to: '/app/documents', key: 'documents', icon: FileStack },
  { to: '/app/assistant', key: 'assistant', icon: MessageSquare },
]

// Mirrors NavLink's own matching so the pill and the router never disagree about
// which item is current. `end` items match only the exact path, otherwise a
// prefix match — `/app` would otherwise swallow every child route.
const isNavItemActive = ({ to, end }, pathname) =>
  end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`)

// Shared by both bars so the two rows can never drift apart.
const renderNavItem = ({ to, key, icon: Icon, end }, t, cx, index, variant) =>
  (
    <NavLink
      key={to}
      to={to}
      end={end}
      data-pill-idx={index}
      className={({ isActive }) =>
        cx(
          variant === 'bar'
            ? 'relative flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-semibold transition-colors min-h-[44px]'
            : 'relative inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-medium transition-colors',
          // No background here: the travelling pill is the only thing that paints
          // the fill, otherwise two highlights show at once mid-transition.
          isActive
            ? variant === 'bar'
              ? 'text-white dark:text-neutral-950'
              : 'text-white dark:text-neutral-950'
            : variant === 'bar'
              ? 'text-neutral-500 dark:text-neutral-400'
              : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white',
        )
      }
    >
      <Icon size={variant === 'bar' ? 16 : 14} />
      <span className={variant === 'bar' ? 'truncate max-w-full px-1' : undefined}>
        {t(`nav.${key}`)}
      </span>
    </NavLink>
  )

export default function AppShell() {
  const { t, i18n } = useTranslation()
  const { dark, toggle } = useTheme()
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const user = getStoredUser()

  // The pill is driven by the location rather than by NavLink's own render, so
  // the highlight and the router can never disagree about which item is current.
  const activeIndex = NAV.findIndex((item) => isNavItemActive(item, pathname))
  // Both bars track together, so the phone and desktop highlights stay in step.
  // The language is a dependency because switching it relabels every item, which
  // changes their widths and leaves the pill the size of the previous language.
  const { trackRef: topTrackRef, pill: topPill } = useSlidingPill(
    NAV.length,
    activeIndex,
    i18n.resolvedLanguage,
  )
  const { trackRef: bottomTrackRef, pill: bottomPill } = useSlidingPill(
    NAV.length,
    activeIndex,
    i18n.resolvedLanguage,
  )

  const signOut = () => {
    api.auth.logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-dvh w-full bg-porcelain dark:bg-obsidian text-neutral-950 dark:text-white">
      <header className="sticky top-0 z-40 pt-3 px-3 sm:px-5">
        <div className="mx-auto max-w-7xl neo-glass-card px-3 sm:px-4 py-2.5 flex items-center gap-4">
          {/* Logo link: brings user back to home page */}
          <Link
            to="/"
            onClick={playClick}
            className="flex items-center gap-2.5 min-w-0 group cursor-pointer flex-shrink-0"
            title="Home"
            aria-label="Home"
          >
            <div className="relative flex items-center justify-center flex-shrink-0">
              <span
                aria-hidden="true"
                className="absolute inset-0 -m-1 rounded-full bg-amber-500/[0.08] blur-lg dark:block hidden pointer-events-none transition-opacity duration-500 group-hover:bg-amber-500/[0.15]"
              />
              <LoadingLogo animate={false} />
            </div>
          </Link>

          {/* Horizontal nav from `lg` up; the bottom bar takes over below it.
              The bar is wide, but the links stay packed: the row is `flex-shrink-0`
              with a plain `gap-1` instead of a `flex-1 justify-between` track,
              which used to hand every one of the five items an equal slice of the
              slack and opened ~110px holes between short labels. The leftover
              width collects in one place, before the account cluster, which is
              what `ml-auto` below is for. */}
          <nav
            ref={topTrackRef}
            className="hidden lg:flex flex-shrink-0 items-center gap-1 ml-4 relative"
            aria-label={t('nav.main')}
          >
            {topPill ? (
              <span
                aria-hidden="true"
                className="absolute z-0 rounded-full bg-neutral-950 dark:bg-white pointer-events-none"
                style={{
                  transform: `translateX(${topPill.x}px)`,
                  width: `${topPill.w}px`,
                  height: `${topPill.h}px`,
                  top: `${topPill.y}px`,
                  transition: PILL_TRANSITION,
                }}
              />
            ) : null}
            {NAV.map((item, index) => renderNavItem(item, t, cx, index, 'pill'))}
          </nav>

          <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
            {/* Preferences Button triggering Lightbox Modal */}
            <button
              type="button"
              onClick={() => { playClick(); setIsPreferencesOpen(true); }}
              className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer border border-neutral-200/80 dark:border-white/20 bg-neutral-100/80 dark:bg-white/[0.06] hover:bg-neutral-200/70 dark:hover:bg-white/15 text-neutral-800 dark:text-neutral-200 hover:text-neutral-950 dark:hover:text-white transition-all shadow-2xs backdrop-blur-md group"
              aria-label="Preferences"
              title="Preferences"
            >
              <Settings size={14} className="text-neutral-600 dark:text-neutral-300 group-hover:rotate-90 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" />
            </button>

            {/* Shared toggle so the dashboard gets the same 360° spin physics as
                the landing header, instead of a bare sun/moon swap. */}
            <ThemeToggle darkMode={dark} toggleTheme={toggle} />
            <span
              className="hidden sm:inline mono-badge text-neutral-500 dark:text-neutral-400 max-w-[10rem] truncate"
              title={user?.email}
            >
              {user?.email}
            </span>
            <button
              type="button"
              onClick={signOut}
              className="h-9 px-3 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-white/[0.06] text-neutral-700 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">{t('common.signOut')}</span>
            </button>
          </div>
        </div>
      </header>

      <PreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
      />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-10 pb-28 lg:pb-10">
        <Outlet />
      </main>

      {/* Bottom bar on phones only. Respects the home-indicator inset.
          `flex-1` on every item gives each one an identical share of the track,
          so the spacing is equal by construction rather than by a fixed gap.
          Five targets is the whole nav, so there is a single row and no
          breakpoint variant to keep in sync. The highlight travels here for the
          same reason it does on the top bar. */}
      <nav className="app-bottom-bar lg:hidden fixed bottom-0 inset-x-0 z-40 px-3 pb-3 pt-2 pb-safe" aria-label={t('nav.main')}>
        <div className="neo-glass-card px-2 py-1.5">
          <div ref={bottomTrackRef} className="relative flex items-stretch">
            {bottomPill ? (
              <span
                aria-hidden="true"
                className="absolute z-0 rounded-xl bg-neutral-950 dark:bg-white pointer-events-none"
                style={{
                  transform: `translateX(${bottomPill.x}px)`,
                  width: `${bottomPill.w}px`,
                  height: `${bottomPill.h}px`,
                  top: `${bottomPill.y}px`,
                  transition: PILL_TRANSITION,
                }}
              />
            ) : null}
            {NAV.map((item, index) => renderNavItem(item, t, cx, index, 'bar'))}
          </div>
        </div>
      </nav>
    </div>
  )
}

export { NAV }
