import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'swatva_theme'
const ThemeContext = createContext(null)

function readInitialTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') return stored === 'dark'
  } catch {
    // Private mode or blocked storage — fall through to the system preference.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

/**
 * Single owner of the light/dark decision for the whole app. Toggling writes the
 * `dark` class on <html>, which is what every `dark:` variant in the Tailwind
 * config keys off. Landing, auth and the app shell all read from here rather
 * than each keeping their own copy of the flag.
 */
export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(readInitialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try {
      localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light')
    } catch {
      // Non-fatal: the theme still applies for this session.
    }
  }, [dark])

  const toggle = useCallback(() => setDark((d) => !d), [])
  const value = useMemo(() => ({ dark, setDark, toggle }), [dark, toggle])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside a ThemeProvider')
  return ctx
}
