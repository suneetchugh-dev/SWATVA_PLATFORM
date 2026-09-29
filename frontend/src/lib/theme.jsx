import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

const STORAGE_KEY = 'swatva_theme'
const ThemeContext = createContext(null)

function isTouchDevice() {
  if (typeof window === 'undefined') return false
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia?.('(pointer: coarse)').matches ||
    false
  )
}

function readInitialTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') return stored === 'dark'
  } catch {
    // Private mode or blocked storage — fall through to default.
  }
  // For touch screen devices only: default to light theme
  if (isTouchDevice()) {
    return false
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
  const mounted = useRef(false)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', dark)
    try {
      localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light')
    } catch {
      // Non-fatal: the theme still applies for this session.
    }

    // Skipped on first paint — easing the colours in on page load reads as a
    // slow fade-in of the whole app, which is worse than an instant switch.
    if (!mounted.current) {
      mounted.current = true
      return undefined
    }

    // Flipping `dark` repaints every surface at once, which is the harsh part of
    // the toggle. Flag the switch so CSS can ease the colours, then drop the flag
    // once the ease is over so nothing else inherits the timing. Scoping it to
    // this window is what keeps hover states and the nav pill on their own
    // durations instead of a blanket global transition.
    root.classList.add('theme-switching')
    const clear = window.setTimeout(() => root.classList.remove('theme-switching'), 340)
    return () => window.clearTimeout(clear)
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
