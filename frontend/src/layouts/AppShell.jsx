import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  FileStack,
  Landmark,
  LogOut,
  MessageSquare,
  Moon,
  Scale,
  Sun,
  UserRound,
  Wallet,
} from 'lucide-react'
import { api, getStoredUser } from '../api/client'
import { useTheme } from '../lib/theme'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { cx } from '../components/ui'
import LoadingLogo from '../components/LoadingLogo'

// Routes are stable; only the labels are translated.
const NAV = [
  { to: '/app/profile', key: 'profile', icon: UserRound },
  { to: '/app/matches', key: 'matches', icon: Scale },
  { to: '/app/benefits', key: 'benefits', icon: Wallet },
  { to: '/app/documents', key: 'documents', icon: FileStack },
  { to: '/app/assistant', key: 'assistant', icon: MessageSquare },
]

export default function AppShell() {
  const { t } = useTranslation()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const user = getStoredUser()

  const signOut = () => {
    api.auth.logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-dvh w-full bg-porcelain dark:bg-obsidian text-neutral-950 dark:text-white">
      <header className="sticky top-0 z-40 pt-3 px-3 sm:px-5">
        <div className="mx-auto max-w-6xl neo-glass-card px-3 sm:px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <LoadingLogo />
            <span className="font-bold text-sm tracking-tight truncate">Swatva AI</span>
          </div>

          {/* Horizontal nav from `lg` up; the bottom bar takes over below it. */}
          <nav className="hidden lg:flex items-center gap-1" aria-label={t('nav.main')}>
            {NAV.map(({ to, key, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cx(
                    'inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950'
                      : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/10',
                  )
                }
              >
                <Icon size={14} />
                {t(`nav.${key}`)}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 flex-shrink-0">
            <LanguageSwitcher className="hidden sm:inline-flex" />
            <button
              type="button"
              onClick={toggle}
              aria-label={dark ? t('common.switchToLight') : t('common.switchToDark')}
              aria-pressed={dark}
              className="h-9 w-9 flex items-center justify-center rounded-full text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
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

      {/* Bottom bar on small screens. Respects the home-indicator inset. */}
      <nav className="app-bottom-bar lg:hidden fixed bottom-0 inset-x-0 z-40 px-3 pb-3 pt-2 pb-safe" aria-label={t('nav.main')}>
        <div className="neo-glass-card px-2 py-1.5 flex items-stretch justify-between">
          {NAV.map(({ to, key, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cx(
                  'flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-semibold transition-colors min-h-[44px]',
                  isActive
                    ? 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950'
                    : 'text-neutral-500 dark:text-neutral-400',
                )
              }
            >
              <Icon size={16} />
              <span className="truncate max-w-full px-1">{t(`nav.${key}`)}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

export { NAV }
