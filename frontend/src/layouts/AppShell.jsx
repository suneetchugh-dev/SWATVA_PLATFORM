import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState, useRef, useEffect } from 'react'
import {
  Bell,
  ChevronDown,
  ChevronRight,
  Compass,
  FileStack,
  LayoutDashboard,
  LogOut,
  Pencil,
  Scale,
  Settings,
  ShieldCheck,
  UserCog,
  Users2,
} from 'lucide-react'
import { api, getStoredUser } from '../api/client'
import { useTheme } from '../lib/theme'
import { PILL_TRANSITION, useSlidingPill } from '../lib/useSlidingPill'
import PreferencesModal from '../components/PreferencesModal'
import MeetTeamModal from '../components/MeetTeamModal'
import NotificationBadge from '../components/NotificationBadge'
import NotificationsPopover from '../components/NotificationsPopover'
import GuidedTour from '../components/GuidedTour'
import ThemeToggle from '../components/ThemeToggle'
import { cx } from '../components/ui'
import LoadingLogo from '../components/LoadingLogo'
import AIOrbIcon from '../components/AIOrbIcon'
import { playClick } from '../utils/soundFx'

// Routes are stable; only the labels are translated.
const NAV = [
  { to: '/app', key: 'home', icon: LayoutDashboard, end: true },
  { to: '/app/discover', key: 'discover', icon: Compass },
  { to: '/app/matches', key: 'matches', icon: Scale },
  { to: '/app/documents', key: 'documents', icon: FileStack },
  { to: '/app/assistant', key: 'assistant', icon: AIOrbIcon },
]

const isNavItemActive = ({ to, end }, pathname) =>
  end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`)

const renderNavItem = ({ to, key, icon: Icon, end }, t, cx, index, variant) =>
  (
    <NavLink
      key={to}
      to={to}
      end={end}
      data-tour={`nav-${key}`}
      data-pill-idx={index}
      className={({ isActive }) =>
        cx(
          variant === 'bar'
            ? 'relative flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-semibold transition-colors min-h-[44px]'
            : 'relative inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-medium transition-colors',
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
  const [isTeamOpen, setIsTeamOpen] = useState(false)
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(4)
  const [profileName, setProfileName] = useState('')

  const accountMenuRef = useRef(null)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [user, setUser] = useState(() => getStoredUser())

  useEffect(() => {
    let cancelled = false
    setUser(getStoredUser())
    api.user
      .getMe()
      .then((data) => {
        if (cancelled) return
        if (data?.fullName) setProfileName(data.fullName)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [pathname])

  useEffect(() => {
    const handleProfileUpdate = () => {
      setUser(getStoredUser())
    }
    window.addEventListener('swatva-profile-updated', handleProfileUpdate)
    return () => window.removeEventListener('swatva-profile-updated', handleProfileUpdate)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) {
        setIsAccountOpen(false)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsAccountOpen(false)
    }

    if (isAccountOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isAccountOpen])

  const activeIndex = NAV.findIndex((item) => isNavItemActive(item, pathname))
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

  const displayName = profileName || user?.fullName || (user?.email ? user.email.split('@')[0] : 'Citizen User')
  const photoURL = user?.photoURL
  const initial = (displayName[0] || 'S').toUpperCase()

  return (
    <div className="min-h-dvh w-full bg-porcelain dark:bg-obsidian text-neutral-950 dark:text-white">
      <header className="sticky top-0 z-40 pt-3 px-3 sm:px-5">
        <div className="mx-auto max-w-7xl neo-glass-card px-3 sm:px-4 py-2.5 flex items-center gap-4">
          {/* Logo link: takes logged-in users to dashboard home */}
          <Link
            to="/app"
            data-tour="brand"
            onClick={playClick}
            className="flex items-center gap-2.5 min-w-0 group cursor-pointer flex-shrink-0"
            title="Dashboard"
            aria-label="Dashboard home"
          >
            <div className="relative flex items-center justify-center flex-shrink-0">
              <span
                aria-hidden="true"
                className="absolute inset-0 -m-1 rounded-full bg-amber-500/[0.08] blur-lg dark:block hidden pointer-events-none transition-opacity duration-500 group-hover:bg-amber-500/[0.15]"
              />
              <LoadingLogo animate={false} />
            </div>
          </Link>

          {/* Center Navigation Bar */}
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

          {/* Right side Navbar Actions (SAHNIRMAAN Style) */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0 ml-auto">
            {/* Notification Bell with Badge & Popover */}
            <div className="relative">
              <button
                type="button"
                data-tour="notifications"
                onClick={() => {
                  playClick()
                  setIsNotifOpen((prev) => !prev)
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer border border-neutral-200/80 dark:border-white/20 bg-neutral-100/80 dark:bg-white/[0.06] hover:bg-neutral-200/70 dark:hover:bg-white/15 text-neutral-800 dark:text-neutral-200 hover:text-neutral-950 dark:hover:text-white transition-all shadow-2xs backdrop-blur-md focus:outline-none group"
                aria-label="Notifications"
                title="Notifications"
              >
                <NotificationBadge count={unreadCount} ping={unreadCount > 0}>
                  <Bell size={14} className="text-neutral-700 dark:text-neutral-200 group-hover:text-neutral-950 dark:group-hover:text-white transition-all duration-200" />
                </NotificationBadge>
              </button>

              <NotificationsPopover
                isOpen={isNotifOpen}
                onClose={() => setIsNotifOpen(false)}
                onUnreadChange={setUnreadCount}
              />
            </div>

            {/* Theme toggle */}
            <ThemeToggle darkMode={dark} toggleTheme={toggle} />

            {/* Hairline Divider */}
            <div aria-hidden="true" className="h-6 w-px bg-neutral-300/80 dark:bg-white/20 flex-shrink-0" />

            {/* Profile Avatar Trigger with Glowing Ring & Dropdown */}
            <div className="relative" ref={accountMenuRef}>
              <button
                type="button"
                data-tour="profile"
                onClick={() => {
                  playClick()
                  setIsAccountOpen((prev) => !prev)
                }}
                className="flex items-center gap-1.5 rounded-full cursor-pointer border border-neutral-200/80 dark:border-white/15 bg-neutral-100/80 dark:bg-white/[0.06] hover:bg-neutral-200/70 dark:hover:bg-white/15 p-0.5 pr-1.5 transition-all shadow-2xs backdrop-blur-md focus:outline-none group"
                aria-label="User Account"
                title={displayName}
              >
                <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-neutral-100 dark:bg-white/10 border border-neutral-200/80 dark:border-white/20 ring-2 ring-amber-400/80 shadow-[0_0_12px_rgba(245,158,11,0.55)] flex items-center justify-center font-bold text-xs uppercase text-neutral-800 dark:text-neutral-200">
                  {photoURL ? (
                    <img src={photoURL} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    initial
                  )}
                </div>
                <ChevronDown
                  size={12}
                  className={`text-neutral-700 dark:text-neutral-200 transition-transform duration-200 ${isAccountOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Profile Dropdown Card Popover */}
              {isAccountOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white dark:bg-[#151618] border border-neutral-200 dark:border-white/10 shadow-2xl backdrop-blur-xl overflow-hidden z-50 origin-top-right animate-in fade-in zoom-in-95 duration-200 font-sans">
                  {/* Identity Header */}
                  <div className="relative flex flex-col items-center text-center px-4 pt-5 pb-4 border-b border-neutral-100 dark:border-white/5">
                    {/* Pencil Edit Icon with Custom Styled Floating Tooltip */}
                    <div className="absolute top-3 right-3 group/pencil">
                      <button
                        type="button"
                        onClick={() => {
                          playClick()
                          setIsAccountOpen(false)
                          navigate('/app/profile')
                        }}
                        aria-label={i18n.language === 'hi' ? 'प्रोफ़ाइल सेट करें' : 'Set Up Profile'}
                        className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors duration-200 cursor-pointer"
                      >
                        <Pencil size={13} />
                      </button>
                      <div className="absolute right-0 top-full mt-1.5 pointer-events-none opacity-0 group-hover/pencil:opacity-100 transition-all duration-200 ease-out translate-y-1 group-hover/pencil:translate-y-0 z-50 whitespace-nowrap">
                        <div className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-[10px] font-semibold tracking-wide py-1 px-2 rounded-md shadow-lg border border-white/10 dark:border-neutral-900/10 flex items-center gap-1">
                          <span>{i18n.language === 'hi' ? 'प्रोफ़ाइल सेट करें' : 'Set Up Profile'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="h-14 w-14 rounded-full overflow-hidden mb-2.5 bg-neutral-100 dark:bg-white/10 border border-neutral-200/80 dark:border-white/15 flex items-center justify-center flex-shrink-0 shadow-sm ring-2 ring-amber-400/80 shadow-[0_0_14px_rgba(245,158,11,0.5)] text-lg font-bold uppercase text-neutral-800 dark:text-neutral-200">
                      {photoURL ? (
                        <img src={photoURL} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        initial
                      )}
                    </div>
                    <div className="flex items-center justify-center space-x-1.5 min-w-0 max-w-full">
                      <span className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                        {displayName}
                      </span>
                      <ShieldCheck size={14} className="text-amber-500 flex-shrink-0 hover:text-amber-400 hover:scale-105 transition-all duration-300 ease-out cursor-default" />
                    </div>
                    <div className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate max-w-full mt-0.5">
                      {user?.email || 'citizen@swatva.in'}
                    </div>
                  </div>

                  {/* Dropdown Actions */}
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        playClick()
                        setIsAccountOpen(false)
                        setIsPreferencesOpen(true)
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-neutral-50 dark:hover:bg-white/[0.03] transition cursor-pointer text-left group"
                    >
                      <span className="flex items-center space-x-3 min-w-0">
                        <Settings 
                          size={15} 
                          className="flex-shrink-0 text-neutral-400 dark:text-neutral-500 origin-center transform-gpu transition-transform duration-300 ease-out group-hover:rotate-45 group-hover:text-neutral-950 dark:group-hover:text-white" 
                        />
                        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200 group-hover:text-neutral-950 dark:group-hover:text-white transition-colors truncate">
                          {i18n.language === 'hi' ? 'प्राथमिकताएं एवं सेटिंग्स' : 'Preferences'}
                        </span>
                      </span>
                      <ChevronRight size={14} className="text-neutral-300 dark:text-neutral-600 flex-shrink-0 group-hover:translate-x-0.5 group-hover:text-neutral-900 dark:group-hover:text-white transition-all duration-200" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playClick()
                        setIsAccountOpen(false)
                        navigate('/team')
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-neutral-50 dark:hover:bg-white/[0.03] transition cursor-pointer text-left group"
                    >
                      <span className="flex items-center space-x-3 min-w-0">
                        <Users2 
                          size={15} 
                          className="flex-shrink-0 text-neutral-400 dark:text-neutral-500 origin-center transform-gpu transition-transform duration-300 ease-out group-hover:scale-110 group-hover:text-neutral-950 dark:group-hover:text-white" 
                        />
                        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200 group-hover:text-neutral-950 dark:group-hover:text-white transition-colors truncate">
                          {i18n.language === 'hi' ? 'मीट द क्वर्कीज़' : 'Meet TheQuirkies'}
                        </span>
                      </span>
                      <ChevronRight size={14} className="text-neutral-300 dark:text-neutral-600 flex-shrink-0 group-hover:translate-x-0.5 group-hover:text-neutral-900 dark:group-hover:text-white transition-all duration-200" />
                    </button>

                    <div className="my-1 h-px bg-neutral-100 dark:bg-white/5" />

                    <button
                      type="button"
                      onClick={() => {
                        playClick()
                        setIsAccountOpen(false)
                        signOut()
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-red-50/70 dark:hover:bg-red-500/[0.08] transition cursor-pointer text-left group"
                    >
                      <span className="flex items-center space-x-3 min-w-0">
                        <LogOut 
                          size={15} 
                          className="flex-shrink-0 text-red-500 dark:text-red-400 origin-center transform-gpu transition-all duration-300 ease-out group-hover:translate-x-0.5 group-hover:text-red-600 dark:group-hover:text-red-300" 
                        />
                        <span className="text-xs font-medium text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300 transition-colors truncate">
                          {t('common.signOut')}
                        </span>
                      </span>
                      <ChevronRight size={14} className="text-neutral-300 dark:text-neutral-600 flex-shrink-0 group-hover:translate-x-0.5 group-hover:text-red-500 dark:group-hover:text-red-400 transition-all duration-200" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <PreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
      />

      <MeetTeamModal
        isOpen={isTeamOpen}
        onClose={() => setIsTeamOpen(false)}
      />

      <GuidedTour />

      <main key={pathname} className="mx-auto max-w-7xl px-3 sm:px-5 py-6 sm:py-8 pb-28 lg:pb-10 page-transition-enter">
        <Outlet />
      </main>

      {/* Bottom bar on phones only */}
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
