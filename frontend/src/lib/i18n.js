import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../locales/en.json'
import hi from '../locales/hi.json'

export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
]

const STORAGE_KEY = 'swatva_lang'

function detect() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && LANGUAGES.some((l) => l.code === stored)) return stored
  } catch {
    // Blocked storage — fall through to the browser preference.
  }
  const nav = navigator.language?.toLowerCase() ?? ''
  if (nav.startsWith('hi')) return 'hi'
  return 'en'
}

export const initialLanguage = detect()

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
  },
  lng: initialLanguage,
  fallbackLng: 'en',
  // Interpolation is off: every value in the catalogue is authored copy, and a
  // user-supplied string must never be treated as a template.
  interpolation: { escapeValue: false },
  returnObjects: true,
})

/** Keep the document language honest for screen readers and browser translation. */
function syncHtmlLang(code) {
  document.documentElement.setAttribute('lang', code)
}
syncHtmlLang(i18n.language)
i18n.on('languageChanged', syncHtmlLang)

export function setLanguage(code) {
  i18n.changeLanguage(code)
  try {
    localStorage.setItem(STORAGE_KEY, code)
  } catch {
    // Non-fatal: the language still applies for this session.
  }
}

export default i18n
