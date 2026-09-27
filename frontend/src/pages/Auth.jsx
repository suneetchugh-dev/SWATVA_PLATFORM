import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Landmark, Moon, Sun } from 'lucide-react'
import { api, getToken } from '../api/client'
import { useTheme } from '../lib/theme'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { Badge, Banner, Button, Field, Input } from '../components/ui'

// One component serves both routes; only the copy keys differ.
const MODE_KEYS = {
  login: {
    badge: 'loginBadge', title: 'loginTitle', desc: 'loginDesc', submit: 'loginSubmit',
    switchText: 'loginSwitchText', switchLabel: 'loginSwitchLabel', switchTo: '/register',
  },
  register: {
    badge: 'registerBadge', title: 'registerTitle', desc: 'registerDesc', submit: 'registerSubmit',
    switchText: 'registerSwitchText', switchLabel: 'registerSwitchLabel', switchTo: '/login',
  },
}

/**
 * Login and registration. The card follows the design system's amber,
 * borderless, backdrop-blur frosted-glass architecture — no stroke, no outline,
 * and a blurred amber halo sitting behind it via a ::before layer.
 */
export default function Auth({ mode = 'login' }) {
  const { t } = useTranslation()
  const copy = MODE_KEYS[mode] ?? MODE_KEYS.login
  const [dark, setDark] = useTheme()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  if (getToken()) return <Navigate to="/app" replace />

  const onSubmit = async (event) => {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'login') {
        await api.auth.login(email.trim(), password)
      } else {
        await api.auth.register(fullName.trim(), email.trim(), password)
      }
      navigate('/app', { replace: true })
    } catch (err) {
      // Field-level errors first, then the envelope message, then a fallback.
      const field = err?.fieldErrors
      if (field && Object.keys(field).length) {
        setError(Object.entries(field).map(([k, v]) => `${k}: ${v}`).join(' · '))
      } else {
        setError(err?.message || t('auth.genericError'))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-dvh w-full overflow-x-hidden bg-porcelain dark:bg-obsidian text-neutral-950 dark:text-white flex flex-col">
      <div className="fixed top-0 right-0 p-4 z-20 flex items-center gap-2">
        <LanguageSwitcher />
        <button
          type="button"
          onClick={() => setDark(!dark)}
          aria-label={dark ? t('common.switchToLight') : t('common.switchToDark')}
          aria-pressed={dark}
          className="h-9 w-9 flex items-center justify-center rounded-full text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:py-20">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center justify-center gap-2.5 mb-8">
            <span className="h-9 w-9 flex items-center justify-center rounded-lg bg-neutral-950 dark:bg-white text-white dark:text-neutral-950">
              <Landmark size={17} strokeWidth={2.2} />
            </span>
            <span className="font-bold tracking-tight">{t('common.appName')}</span>
          </Link>

          <div className="auth-glass-card rounded-3xl p-6 sm:p-8">
            <Badge>{t(`auth.${copy.badge}`)}</Badge>
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-balance">
              {t(`auth.${copy.title}`)}
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300 text-balance">
              {t(`auth.${copy.desc}`)}
            </p>

            {error ? (
              <div className="mt-5">
                <Banner tone="error">{error}</Banner>
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
              {mode === 'register' ? (
                <Field label={t('auth.fullName')} htmlFor="fullName" required>
                  <Input
                    id="fullName"
                    name="fullName"
                    autoComplete="name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t('auth.namePlaceholder')}
                  />
                </Field>
              ) : null}

              <Field label={t('auth.email')} htmlFor="email" required>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                />
              </Field>

              <Field
                label={t('auth.password')}
                htmlFor="password"
                required
                hint={mode === 'register' ? t('auth.passwordHint') : undefined}
              >
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  minLength={mode === 'register' ? 8 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.passwordPlaceholder')}
                />
              </Field>

              <Button type="submit" variant="accent" size="lg" loading={busy} className="w-full mt-1">
                {t(`auth.${copy.submit}`)}
                {!busy ? <ArrowRight size={15} /> : null}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-neutral-600 dark:text-neutral-300">
              {t(`auth.${copy.switchText}`)}{' '}
              <Link
                to={copy.switchTo}
                className="font-semibold text-amber-700 dark:text-amber-400 hover:underline"
              >
                {t(`auth.${copy.switchLabel}`)}
              </Link>
            </p>
          </div>

          <p className="mt-6 text-center text-[11px] text-neutral-500 dark:text-neutral-400 text-balance">
            {t('auth.reassurance')}
          </p>
        </div>
      </main>
    </div>
  )
}
