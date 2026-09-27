import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'
import { LANGUAGES, setLanguage } from '../lib/i18n'
import { cx } from './ui'

/**
 * Compact EN/हिन्दी toggle. Deliberately a two-state segmented control rather
 * than a select: there are only two languages, and a visible one-tap control is
 * how a first-time user discovers the app is bilingual at all.
 */
export default function LanguageSwitcher({ className = '' }) {
  const { i18n } = useTranslation()
  const current = i18n.resolvedLanguage?.startsWith('hi') ? 'hi' : 'en'

  return (
    <div
      className={cx(
        'inline-flex items-center gap-0.5 rounded-full p-0.5',
        'bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200 dark:border-white/10',
        className,
      )}
      role="group"
      aria-label="Language"
    >
      <Languages size={12} className="mx-1 text-neutral-400 flex-shrink-0" aria-hidden="true" />
      {LANGUAGES.map((l) => {
        const active = current === l.code
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => setLanguage(l.code)}
            aria-pressed={active}
            lang={l.code}
            className={cx(
              'h-7 px-2.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap',
              active
                ? 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100',
            )}
          >
            {l.native}
          </button>
        )
      })}
    </div>
  )
}
