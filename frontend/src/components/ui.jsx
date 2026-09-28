/**
 * Design-system primitives.
 *
 * Every accent in this file is amber. Do not add blue/green/cyan/teal/indigo
 * here — the palette in tailwind.config.js does not define those families, so
 * a banned colour cannot even be spelled.
 */
import { useState, useRef, useEffect, useMemo, Children } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Check, Search } from 'lucide-react'
import CurvyArrow from './CurvyArrow'
import LoadingLogo from './LoadingLogo'
import { playClick } from '../utils/soundFx'

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

export function Spinner({ className = '', size = 'h-6 w-6', duration = 2.2 }) {
  const { t } = useTranslation()
  const hasCustomSize = className.includes('h-') || className.includes('w-')
  return (
    <div
      role="status"
      aria-label={t('common.loading')}
      className={cx('inline-flex items-center justify-center shrink-0 select-none', className)}
    >
      <LoadingLogo 
        size={hasCustomSize ? className : size}
        loop={true} 
        animate={true} 
        hoverable={false} 
        duration={duration}
      />
    </div>
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
/**
 * Informational chip: a fact attached to a card or result, not a verdict.
 *
 * Deliberately achromatic. It used to be an amber-tinted uppercase mono chip,
 * which meant a card with three of them read as a block of amber and shouted
 * at a size no other label on the page used. The amber survives as a single
 * small dot, so the brand accent is still present but the chip stays quiet.
 *
 * Verdict chips are a different component on purpose — see StatusPill, where
 * amber means "eligible" and carries meaning rather than decoration.
 */
export function Badge({ children, className = '', icon: Icon = null }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border border-neutral-200/90 dark:border-white/10 bg-white/70 dark:bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium leading-none text-neutral-600 dark:text-neutral-300 transition-all duration-300 hover:border-amber-500/40 hover:bg-amber-500/[0.06] hover:text-neutral-900 dark:hover:text-white group select-none',
        className,
      )}
    >
      {Icon ? <Icon size={12} className="flex-shrink-0" /> : null}
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

function extractSelectOptions(children, directOptions) {
  if (Array.isArray(directOptions) && directOptions.length > 0) {
    return directOptions.map((opt) =>
      typeof opt === 'string'
        ? { value: opt, label: opt, disabled: false }
        : {
            value: opt.value !== undefined ? String(opt.value) : '',
            label: opt.label !== undefined ? opt.label : String(opt.value ?? ''),
            disabled: Boolean(opt.disabled),
          }
    )
  }

  const options = []
  const traverse = (nodes) => {
    Children.forEach(nodes, (child) => {
      if (!child) return
      if (child.type === 'option' || (child.props && child.props.value !== undefined)) {
        options.push({
          value: child.props.value !== undefined ? String(child.props.value) : '',
          label: child.props.children ?? child.props.value ?? '',
          disabled: Boolean(child.props.disabled),
        })
      } else if (child.props && child.props.children) {
        traverse(child.props.children)
      }
    })
  }
  traverse(children)
  return options
}

export function Select({
  className = '',
  children,
  options: directOptions,
  value,
  defaultValue,
  onChange,
  placeholder,
  disabled = false,
  required = false,
  id,
  name,
  searchable,
  ...rest
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef(null)
  const searchInputRef = useRef(null)

  const rawOptions = useMemo(
    () => extractSelectOptions(children, directOptions),
    [children, directOptions]
  )

  const currentValue = value !== undefined ? String(value) : (defaultValue !== undefined ? String(defaultValue) : '')

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        setSearchTerm('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Focus search when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const isSearchEnabled = searchable ?? rawOptions.length > 6

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return rawOptions
    const q = searchTerm.toLowerCase().trim()
    return rawOptions.filter((opt) => {
      const labelText = typeof opt.label === 'string' ? opt.label : String(opt.value)
      return labelText.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q)
    })
  }, [rawOptions, searchTerm])

  const selectedOption = rawOptions.find((opt) => opt.value === currentValue)
  const displayLabel = selectedOption
    ? selectedOption.label
    : (placeholder || (rawOptions[0]?.value === '' ? rawOptions[0]?.label : 'Select an option'))

  const handleSelect = (optVal, optDisabled) => {
    if (optDisabled || disabled) return
    playClick()
    if (onChange) {
      const syntheticEvent = {
        target: { value: optVal, name: name || id, id },
        currentTarget: { value: optVal, name: name || id, id },
        stopPropagation: () => {},
        preventDefault: () => {},
      }
      onChange(syntheticEvent)
    }
    setIsOpen(false)
    setSearchTerm('')
  }

  return (
    <div ref={containerRef} className={cx('relative w-full select-none', isOpen ? 'z-[60]' : 'z-10', className)}>
      {/* Hidden native select for standard form accessibility / tests */}
      <select
        id={id}
        name={name}
        value={currentValue}
        required={required}
        disabled={disabled}
        aria-hidden="true"
        tabIndex={-1}
        className="sr-only"
        onChange={onChange}
        {...rest}
      >
        {rawOptions.map((opt, idx) => (
          <option key={`${opt.value}-${idx}`} value={opt.value} disabled={opt.disabled}>
            {typeof opt.label === 'string' ? opt.label : opt.value}
          </option>
        ))}
      </select>

      {/* Stylized Trigger Button */}
      <button
        type="button"
        id={id ? `${id}-btn` : undefined}
        disabled={disabled}
        onClick={() => {
          if (disabled) return
          playClick()
          setIsOpen((prev) => !prev)
          setSearchTerm('')
        }}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={cx(
          CONTROL_BASE,
          'flex items-center justify-between text-left cursor-pointer font-medium shadow-2xs group',
          isOpen ? 'border-amber-500/70 ring-2 ring-amber-500/25 bg-white dark:bg-[#161616]' : '',
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        )}
      >
        <span className={cx('truncate', !selectedOption || selectedOption.value === '' ? 'text-neutral-400 dark:text-neutral-500' : 'text-neutral-900 dark:text-white')}>
          {displayLabel}
        </span>
        <ChevronDown
          size={15}
          className={cx(
            'flex-shrink-0 ml-2 text-neutral-400 dark:text-neutral-500 transition-transform duration-200 stroke-[2.2] group-hover:text-neutral-700 dark:group-hover:text-neutral-300',
            isOpen ? 'rotate-180 text-amber-600 dark:text-amber-400' : ''
          )}
        />
      </button>

      {/* Floating Popover List (Floats above card boundaries) */}
      {isOpen && (
        <div
          role="listbox"
          className={cx(
            'absolute left-0 right-0 top-full mt-1.5 z-[100] overflow-hidden',
            'rounded-2xl border border-neutral-200/90 dark:border-white/15',
            'bg-white/95 dark:bg-[#121212]/95 backdrop-blur-xl',
            'shadow-[0_12px_36px_-6px_rgba(0,0,0,0.18),0_0_24px_-4px_rgba(245,158,11,0.08)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.8),0_0_30px_rgba(245,158,11,0.1)]',
            'p-1.5 animate-in fade-in-50 zoom-in-[0.98] duration-150'
          )}
        >
          {/* Optional Search Filter for long lists (e.g. 36 Indian States) */}
          {isSearchEnabled && (
            <div className="p-1 pb-1.5 border-b border-neutral-100 dark:border-white/10 mb-1">
              <div className="relative flex items-center">
                <Search size={14} className="absolute left-2.5 text-neutral-400 dark:text-neutral-500 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Type to filter..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-100/80 dark:bg-white/[0.06] border border-neutral-200 dark:border-white/10 rounded-lg text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}

          {/* Options Scrollable Container */}
          <div className="max-h-60 overflow-y-auto space-y-0.5 custom-scrollbar pr-0.5">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-neutral-400 dark:text-neutral-500 font-medium">
                No matching options
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === currentValue
                return (
                  <button
                    key={`${opt.value}-${idx}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={opt.disabled}
                    onClick={() => handleSelect(opt.value, opt.disabled)}
                    className={cx(
                      'w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl text-left transition-all duration-150 cursor-pointer',
                      isSelected
                        ? 'bg-amber-500/15 text-amber-900 dark:text-amber-200 font-semibold border border-amber-500/30 shadow-2xs'
                        : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/[0.07] hover:text-neutral-950 dark:hover:text-white',
                      opt.disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <Check size={14} className="flex-shrink-0 ml-2 text-amber-600 dark:text-amber-400 stroke-[2.5]" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function Textarea({ className = '', ...rest }) {
  return <textarea className={cx(CONTROL_BASE, 'resize-y min-h-24', className)} {...rest} />
}

/* ------------------------------------------------------------------ Layout */

export function PageHeader({ arrowLabel, arrowClassName = '', title, desc, actions, className = '' }) {
  return (
    <header className={cx('flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 pt-2 sm:pt-3', className)}>
      <div className="relative max-w-2xl">
        {/* Hand-drawn arrow + tag, matching the landing hero. Preferred over the
            flat amber `Badge` because it reads as a hand-annotated callout
            instead of a status chip, which is what these section labels are. */}
        {arrowLabel ? (
          <CurvyArrow
            direction="top-left"
            className={cx('-left-4 sm:-left-12 -top-9 sm:-top-11', arrowClassName)}
            label={arrowLabel}
          />
        ) : null}
        <h1 className="mt-4 sm:mt-5 text-2xl sm:text-3xl font-extrabold tracking-tight text-balance">
          {title}
        </h1>
        {desc ? (
          <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300 text-balance">
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
        <span className="h-11 w-11 flex items-center justify-center rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 shadow-sm animate-in zoom-in-75 fade-in duration-300 transition-transform hover:scale-105">
          <Icon size={19} strokeWidth={2} className="animate-in fade-in duration-500" />
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
