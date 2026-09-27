import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import {
  Compass,
  FileStack,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Scale,
} from 'lucide-react'
import { api, getStoredUser } from '../api/client'
import { useTheme } from '../lib/theme'
import SettingsPanel from '../components/SettingsPanel'
import ThemeToggle from '../components/ThemeToggle'
import { cx } from '../components/ui'
import LoadingLogo from '../components/LoadingLogo'

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

/**
 * Positions one shared pill behind whichever item is current, so the highlight
 * travels between items instead of blinking out and in on each route change.
 * There is no animation library in the project, so the pill is measured and
 * moved with a CSS transition.
 *
 * `recalcKey` re-measures when something other than the route changes the item
 * widths — a language switch relabels every item, and the pill would otherwise
 * keep the old width.
 */
function useSlidingPill(count, activeIndex, recalcKey) {
  const trackRef = useRef(null)
  const [pill, setPill] = useState(null)

  const measure = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const item = track.querySelector(`[data-nav-idx="${activeIndex}"]`)
    if (!item) {
      setPill(null)
      return
    }
    setPill({
      x: item.offsetLeft,
      y: item.offsetTop,
      w: item.offsetWidth,
      h: item.offsetHeight,
    })
  }, [activeIndex])

  useLayoutEffect(() => {
    measure()
    // offsetWidth is 0 on the first paint if web fonts are still swapping in, so
    // re-measure once the font load settles rather than trusting frame one.
    const fonts = document.fonts?.ready
    if (fonts?.then) fonts.then(measure).catch(() => {})
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure, count, recalcKey])

  return { trackRef, pill }
}

const PILL_TRANSITION =
  'transform 0.34s cubic-bezier(0.32, 0.72, 0, 1), width 0.34s cubic-bezier(0.32, 0.72, 0, 1), height 0.34s cubic-bezier(0.32, 0.72, 0, 1)'

// Shared by both bars so the two rows can never drift apart.
const renderNavItem = ({ to, key, icon: Icon, end }, t, cx, index, variant) =>
  (
    <NavLink
      key={to}
      to={to}
      end={end}
      data-nav-idx={index}
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
          {/* Wordmark dropped: the account cluster already shows who is signed in,
              and the mark alone identifies the app inside the dashboard. */}
          <div className="flex items-center gap-2.5 min-w-0 group">
            <div className="relative flex items-center justify-center flex-shrink-0">
              <span
                aria-hidden="true"
                className="absolute inset-0 -m-1 rounded-full bg-amber-500/[0.08] blur-lg dark:block hidden pointer-events-none transition-opacity duration-500 group-hover:bg-amber-500/[0.15]"
              />
              <LoadingLogo animate={false} />
            </div>
          </div>

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
            <SettingsPanel />
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
