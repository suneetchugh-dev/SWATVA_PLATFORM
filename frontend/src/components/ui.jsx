/**
 * Design-system primitives.
 *
 * Every accent in this file is amber. Do not add blue/green/cyan/teal/indigo
 * here — the palette in tailwind.config.js does not define those families, so
 * a banned colour cannot even be spelled.
 */
import { useTranslation } from 'react-i18next'

const cx = (...parts) => parts.filter(Boolean).join(' ')

export { cx }

/* ------------------------------------------------------------------ Button */

const BUTTON_VARIANTS = {
  // The single high-emphasis action. Monochrome inversion, never a colour fill.
  primary:
    'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 hover:opacity-90',
  // Amber is reserved for the one action we want the eye to land on first.
  accent:
    'bg-amber-500 text-neutral-950 hover:bg-amber-400 dark:text-neutral-950 shadow-[0_8px_24px_-8px_rgba(245,158,11,0.5)]',
  secondary:
    'bg-neutral-100 dark:bg-white/[0.06] text-neutral-800 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-white/10',
  ghost:
    'bg-transparent text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/10',
}

const BUTTON_SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-6 text-sm gap-2',
}

export function Button({
  as: Tag = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  children,
  ...rest
}) {
  return (
    <Tag
      disabled={Tag === 'button' ? disabled || loading : undefined}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex items-center justify-center rounded-full font-semibold tracking-tight',
        'transition-[background-color,opacity,transform] duration-200 active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-porcelain dark:focus-visible:ring-offset-obsidian',
        'disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner className="shrink-0" /> : null}
      {children}
    </Tag>
  )
}

/* ----------------------------------------------------------------- Spinner */

export function Spinner({ className = '' }) {
  const { t } = useTranslation()
  return (
    <span
      role="status"
      aria-label={t('common.loading')}
      className={cx(
        'inline-block h-4 w-4 rounded-full border-2 border-current border-r-transparent animate-spin',
        className,
      )}
    />
  )
}

/* -------------------------------------------------------------------- Card */

export function Card({ as: Tag = 'div', accent = false, className = '', children, ...rest }) {
  return (
    <Tag className={cx(accent ? 'dashboard-amber-card' : 'neo-glass-card', className)} {...rest}>
      {children}
    </Tag>
  )
}

/* ------------------------------------------------------------------- Badge */

/** Monospace eyebrow. The design system forbids coloured status dots, so the
 *  only sanctioned way to signal a state in the chrome is a mono badge. */
export function Badge({ children, className = '' }) {
  return (
    <span
      className={cx(
        'inline-block mono-badge text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1',
        className,
      )}
    >
      {children}
    </span>
  )
}

const STATUS_STYLES = {
  ELIGIBLE: 'bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/30',
  NOT_ELIGIBLE: 'bg-neutral-200/70 dark:bg-white/[0.06] text-neutral-600 dark:text-neutral-300 border-neutral-300 dark:border-white/15',
  NEEDS_INFORMATION: 'bg-neutral-100 dark:bg-white/[0.04] text-neutral-700 dark:text-neutral-200 border-dashed border-neutral-400 dark:border-white/25',
}

/**
 * Renders an eligibility verdict as a monochrome monospace pill. Amber marks the
 * affirmative outcome because that is the only state worth drawing the eye to;
 * everything else stays achromatic so a screen of results does not read as a
 * fruit salad.
 */
export function StatusPill({ status, className = '' }) {
  const { t } = useTranslation()
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.NOT_ELIGIBLE
  return (
    <span
      className={cx(
        'inline-block mono-badge rounded-full border px-2.5 py-1 whitespace-nowrap',
        style,
        className,
      )}
    >
      {/* Unknown statuses fall back to the raw enum so a new backend verdict is
          visible rather than silently rendered as "not eligible". */}
      {t(`status.${status}`, { defaultValue: status })}
    </span>
  )
}

/* ------------------------------------------------------------------- Field */

export function Field({ label, hint, error, htmlFor, required, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label
          htmlFor={htmlFor}
          className="text-xs font-semibold text-neutral-700 dark:text-neutral-200 flex items-center gap-1"
        >
          {label}
          {required ? <span className="text-amber-600 dark:text-amber-400">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="text-[11px] text-amber-700 dark:text-amber-400">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{hint}</p>
      ) : null}
    </div>
  )
}

const CONTROL_BASE =
  'w-full rounded-xl px-3 py-2.5 text-sm text-neutral-950 dark:text-white placeholder:text-neutral-400 ' +
  'bg-white/70 dark:bg-white/[0.04] border border-neutral-300 dark:border-white/15 ' +
  'transition-colors focus:outline-none focus:border-amber-500/70 ' +
  'focus:ring-2 focus:ring-amber-500/25 disabled:opacity-50'

export function Input({ className = '', ...rest }) {
  return <input className={cx(CONTROL_BASE, className)} {...rest} />
}

export function Select({ className = '', children, ...rest }) {
  return (
    <select className={cx(CONTROL_BASE, 'cursor-pointer', className)} {...rest}>
      {children}
    </select>
  )
}

export function Textarea({ className = '', ...rest }) {
  return <textarea className={cx(CONTROL_BASE, 'resize-y min-h-24', className)} {...rest} />
}

/* ------------------------------------------------------------------ Layout */

export function PageHeader({ badge, title, desc, actions, className = '' }) {
  return (
    <header className={cx('flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8', className)}>
      <div className="max-w-2xl">
        {badge ? <Badge>{badge}</Badge> : null}
        <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-balance">
          {title}
        </h1>
        {desc ? (
          <p className="mt-2.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300 text-balance">
            {desc}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex-shrink-0 flex items-center gap-2">{actions}</div> : null}
    </header>
  )
}

export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <Card className="px-6 py-14 flex flex-col items-center text-center">
      {Icon ? (
        <span className="h-11 w-11 flex items-center justify-center rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950">
          <Icon size={19} strokeWidth={2} />
        </span>
      ) : null}
      <h3 className="mt-4 text-base font-bold tracking-tight">{title}</h3>
      {body ? (
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300 max-w-md text-balance">{body}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  )
}

export function Banner({ tone = 'info', title, children }) {
  const tones = {
    info: 'border-neutral-300 dark:border-white/15 bg-neutral-100/70 dark:bg-white/[0.04]',
    warn: 'border-amber-500/30 bg-amber-500/8',
    error: 'border-amber-600/40 bg-amber-500/10',
  }
  return (
    <div className={cx('rounded-xl border px-4 py-3 text-sm', tones[tone])} role={tone === 'error' ? 'alert' : undefined}>
      {title ? <p className="font-semibold tracking-tight">{title}</p> : null}
      {children ? <div className="text-neutral-600 dark:text-neutral-300 mt-0.5">{children}</div> : null}
    </div>
  )
}
