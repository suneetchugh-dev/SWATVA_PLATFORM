import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Globe, Settings2, X } from 'lucide-react'
import { LANGUAGES, setLanguage } from '../lib/i18n'
import { cx } from './ui'

/** Matches a media query and stays in sync with viewport changes. */
function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = (e) => setMatches(e.matches)
    setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/**
 * Language chooser, shared by both presentations below.
 */
function LanguageCards({ current, onPick, columns }) {
  const { t } = useTranslation()

  return (
    <div className="p-3 rounded-2xl bg-neutral-100/60 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/10">
      <div className="flex items-start gap-2.5 mb-3">
        <Globe size={15} className="text-neutral-900 dark:text-white flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-neutral-950 dark:text-white leading-snug">
            {t('settings.language')}
          </p>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight mt-0.5">
            {t('settings.languageDesc')}
          </p>
        </div>
      </div>

      <div className={cx('grid gap-2', columns === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
        {LANGUAGES.map((l) => {
          const selected = current === l.code
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => onPick(l.code)}
              aria-pressed={selected}
              lang={l.code}
              className={cx(
                'relative flex flex-col items-center justify-between p-3 h-20 rounded-xl border text-center',
                'transition-all cursor-pointer select-none active:scale-95',
                selected
                  ? 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 border-transparent shadow-md'
                  : 'bg-white dark:bg-white/[0.02] text-neutral-700 dark:text-neutral-200 border-neutral-200 dark:border-white/10 hover:border-neutral-300 dark:hover:border-white/20 hover:bg-neutral-50 dark:hover:bg-white/[0.06]',
              )}
            >
              {selected ? (
                <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-white dark:bg-black text-neutral-950 dark:text-white flex items-center justify-center">
                  <Check size={9} strokeWidth={4} />
                </span>
              ) : null}

              <span
                className={cx(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold leading-none mb-1.5 mt-0.5',
                  selected
                    ? 'bg-white text-neutral-950 dark:bg-neutral-950 dark:text-white'
                    : 'bg-neutral-100 dark:bg-white/10 text-neutral-500 dark:text-neutral-300',
                )}
                aria-hidden="true"
              >
                {l.monogram}
              </span>

              <span className="flex flex-col items-center w-full min-w-0">
                <span className="text-xs font-bold tracking-tight block truncate w-full">{l.native}</span>
                <span
                  className={cx(
                    'text-[9px] font-mono font-semibold px-1 rounded mt-1 block truncate max-w-full',
                    selected
                      ? 'bg-white/25 dark:bg-black/25 text-white dark:text-neutral-950'
                      : 'bg-neutral-100 dark:bg-white/10 text-neutral-500 dark:text-neutral-400',
                  )}
                >
                  {l.short}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Preferences panel for the authenticated app.
 *
 * Two presentations of one body: a popover anchored to the gear on desktop, and
 * a centred modal on mobile, following the Sahnirmaan client. Desktop keeps the
 * light/dark toggle inline in the navbar because it is toggled often, so theme
 * is intentionally absent here.
 */
export default function SettingsPanel({ className = '' }) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const [panelPos, setPanelPos] = useState(null)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const current = i18n.resolvedLanguage?.startsWith('hi') ? 'hi' : 'en'

  const close = () => setOpen(false)

  const pick = (code) => {
    setLanguage(code)
    close()
    // The popover unmounts on close, so hand focus back to the trigger.
    buttonRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return undefined

    const onPointerDown = (e) => {
      if (isDesktop && !rootRef.current?.contains(e.target)) close()
    }
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return
      close()
      buttonRef.current?.focus()
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, isDesktop])

  // Desktop popover is positioned against the viewport, not the trigger.
  // Anchored with `absolute`, the 288px panel reached ~252px to the left of the
  // gear and its top edge sat 44px down — inside the ~64px header — so it covered
  // the nav links and read as the bar shifting. Measuring the trigger and using
  // `fixed` puts it in a layer of its own: no reflow, no overlap. The node stays
  // a DOM child of `rootRef`, so outside-click detection is unaffected.
  useEffect(() => {
    if (!open || !isDesktop) {
      setPanelPos(null)
      return undefined
    }
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return
      setPanelPos({
        top: Math.round(rect.bottom + 8),
        right: Math.max(8, Math.round(window.innerWidth - rect.right)),
      })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, isDesktop])

  // Lock background scrolling behind the mobile sheet only.
  useEffect(() => {
    if (isDesktop || !open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open, isDesktop])

  const trigger = (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => setOpen((v) => !v)}
      aria-label={t('settings.title')}
      aria-expanded={open}
      aria-haspopup="dialog"
      className={cx(
        'h-9 w-9 flex items-center justify-center rounded-full transition-colors cursor-pointer',
        open
          ? 'bg-neutral-200/80 dark:bg-white/15 text-neutral-950 dark:text-white'
          : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/70 dark:hover:bg-white/10',
      )}
    >
      <Settings2 size={16} />
    </button>
  )

  const body = <LanguageCards current={current} onPick={pick} columns={2} />

  if (isDesktop) {
    return (
      <div ref={rootRef} className={cx('relative flex-shrink-0', className)}>
        {trigger}
        {open && panelPos ? (
          <div
            role="dialog"
            aria-label={t('settings.title')}
            style={{ top: panelPos.top, right: panelPos.right }}
            className="fixed z-50 w-72 rounded-2xl p-2 neo-glass-card animate-fade-up"
          >
            {body}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className={cx('relative flex-shrink-0', className)}>
      {trigger}
      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-up"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              close()
              buttonRef.current?.focus()
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('settings.title')}
            className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-t-3xl p-3 pb-5 neo-glass-card"
          >
            <div className="mb-3 flex items-center gap-2 px-1">
              <Settings2 size={17} className="text-neutral-950 dark:text-white flex-shrink-0" />
              <h2 className="text-sm font-bold tracking-tight text-neutral-950 dark:text-white">
                {t('settings.title')}
              </h2>
              <button
                type="button"
                onClick={() => {
                  close()
                  buttonRef.current?.focus()
                }}
                aria-label={t('common.close')}
                className="ml-auto h-7 w-7 flex items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
            {body}
          </div>
        </div>
      ) : null}
    </div>
  )
}
