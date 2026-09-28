import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertCircle, ArrowUpRight, Check, Scale, X } from 'lucide-react'
import { api } from '../api/client'
import {
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Spinner,
  StatusPill,
  cx,
} from '../components/ui'
import { useSlidingPill, PILL_TRANSITION } from '../lib/useSlidingPill'
import { playClick } from '../utils/soundFx'
import AIOrbFace from '../components/AIOrbFace'
import { PageTourButton } from '../components/GuidedTour'

// Filter ids double as translation keys under matches.filters.*, except ALL.
const FILTER_IDS = ['ELIGIBLE', 'NEEDS_INFORMATION', 'NOT_ELIGIBLE', 'ALL']

/**
 * The core payoff: every scheme the deterministic evaluator considered, split by
 * verdict. Each card shows the satisfied / failed / missing conditions verbatim
 * so the citizen can see *why*, which is the whole point — an unexplained
 * "not eligible" is indistinguishable from a wrong answer.
 */
export default function Matches() {
  const { t, i18n } = useTranslation()
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('ELIGIBLE')
  const [openId, setOpenId] = useState(null)

  const filterIndex = Math.max(0, FILTER_IDS.indexOf(filter))
  const { trackRef: filterTrackRef, pill: filterPill } = useSlidingPill(
    FILTER_IDS.length,
    filterIndex,
    `${i18n.resolvedLanguage}_${loading}_${results?.length}`,
  )

  const load = () => {
    setLoading(true)
    setError(null)
    api.eligibility
      .getMatches()
      .then((data) => setResults(data ?? []))
      .catch((err) => setError(err?.message || t('matches.loadError')))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const counts = useMemo(() => {
    const c = { ELIGIBLE: 0, NOT_ELIGIBLE: 0, NEEDS_INFORMATION: 0 }
    for (const r of results ?? []) if (c[r.status] != null) c[r.status] += 1
    return c
  }, [results])

  const visible = useMemo(() => {
    const list = results ?? []
    // Default to the affirmative view: lead with what they can actually get.
    const base = filter === 'ALL' ? list : list.filter((r) => r.status === filter)
    return [...base].sort((a, b) => (b.matchPercentage ?? 0) - (a.matchPercentage ?? 0))
  }, [results, filter])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-neutral-500 dark:text-neutral-400">
        <Spinner />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={t('matches.title')}
        desc={t('matches.desc')}
        actions={
          <div className="flex items-center gap-2">
            <PageTourButton pageKey="matches" />
            <Button variant="secondary" onClick={() => { playClick(); load(); }}>
              {t('matches.recheck')}
            </Button>
          </div>
        }
      />

      {error ? (
        <div className="mb-6">
          <Banner tone="error" title={t('common.loadingError')}>
            {error}{' '}
            <button type="button" onClick={load} className="font-semibold underline cursor-pointer">
              Try again
            </button>
          </Banner>
        </div>
      ) : null}

      {results?.length === 0 ? (
        <EmptyState
          icon={Scale}
          title={t('matches.emptyTitle')}
          body={t('matches.emptyBody')}
          action={
            <Button as={Link} to="/app/profile" variant="accent">
              {t('matches.completeProfile')}
            </Button>
          }
        />
      ) : (
        <>
          {/* Filter Pills with smooth sliding background pill */}
          <div data-tour="matches-tabs" className="w-full max-w-full overflow-x-auto no-scrollbar pb-1 mb-6">
            <div className="p-1 rounded-full neo-glass-card inline-flex items-center min-w-max">
              <div ref={filterTrackRef} className="relative flex items-center gap-1 min-w-max px-0.5" role="tablist" aria-label="Filter matches">
                {filterPill ? (
                  <span
                    aria-hidden="true"
                    className="absolute z-0 rounded-full bg-neutral-950 dark:bg-white pointer-events-none"
                    style={{
                      transform: `translateX(${filterPill.x}px)`,
                      width: `${filterPill.w}px`,
                      height: `${filterPill.h}px`,
                      top: `${filterPill.y}px`,
                      transition: PILL_TRANSITION,
                    }}
                  />
                ) : null}
                {FILTER_IDS.map((id, index) => {
                  const n = id === 'ALL' ? (results?.length ?? 0) : counts[id]
                  const isActive = filter === id
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      data-pill-idx={index}
                      aria-selected={isActive}
                      onClick={() => { playClick(); setFilter(id); }}
                      className={cx(
                        'relative z-10 shrink-0 h-8 px-3.5 rounded-full text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 select-none',
                        isActive
                          ? filterPill
                            ? 'text-white dark:text-neutral-950'
                            : 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950'
                          : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white',
                      )}
                    >
                      <span>{t(`matches.filters.${id}`)}</span>
                      <span className={cx(
                        'mono-badge text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold',
                        isActive
                          ? 'bg-white/20 dark:bg-black/20 text-white dark:text-neutral-950'
                          : 'bg-neutral-200/70 dark:bg-white/10 text-neutral-600 dark:text-neutral-300'
                      )}>
                        {n}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={Scale}
              title={t('matches.nothingTitle')}
              body={t('matches.nothingBody')}
            />
          ) : (
            <div data-tour="matches-cards" className="flex flex-col gap-3">
              {visible.map((r) => {
                const open = openId === r.schemeId
                const needsInfo = (r.missingInformation ?? []).length > 0
                return (
                  <Card key={r.schemeId} className="overflow-hidden">
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <StatusPill status={r.status} />
                            <span className="mono-badge text-neutral-400">{t('status.match', { n: r.matchPercentage })}</span>
                          </div>
                          <h3 className="text-base font-bold tracking-tight text-balance">{r.scheme}</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setOpenId(open ? null : r.schemeId)}
                          aria-expanded={open}
                          className="shrink-0 h-8 px-3 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-white/[0.06] hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                        >
                          {open ? t('matches.hide') : t('matches.why')}
                          <ArrowUpRight size={13} className={cx('transition-transform', open && 'rotate-90')} />
                        </button>
                      </div>

                      {/* Surface the blocking reason inline for the two verdicts
                          where the citizen can act on it. */}
                      {r.status === 'NEEDS_INFORMATION' && needsInfo ? (
                        <p className="mt-3 text-xs text-neutral-600 dark:text-neutral-300 inline-flex items-start gap-1.5">
                          <AlertCircle size={13} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-px" />
                          {t('matches.tellUs', { what: joinAnd(r.missingInformation, i18n.resolvedLanguage) })}
                        </p>
                      ) : null}
                    </div>

                    {open ? (
                      <div className="border-t border-neutral-200 dark:border-white/10 px-5 py-4 bg-white/40 dark:bg-white/[0.02]">
                        <ConditionList
                          tone="pass"
                          items={r.satisfiedConditions}
                          empty="None recorded."
                        />
                        <ConditionList
                          tone="fail"
                          items={r.failedConditions}
                          empty="No failing conditions."
                        />
                        <ConditionList
                          tone="info"
                          items={r.missingInformation}
                          empty="Nothing missing."
                        />
                        <div className="mt-4 flex items-center gap-2 flex-wrap">
                          <Button size="sm" variant="secondary" as={Link} to={`/schemes/${r.schemeId}`}>
                            {t('matches.openScheme')}
                          </Button>
                          {/* Readiness is the actionable next step: a match only says
                              "you look eligible", this says what to actually upload. */}
                          <Button
                            size="sm"
                            variant="ghost"
                            as={Link}
                            to={`/app/readiness/${r.schemeId}`}
                          >
                            {t('matches.checkReadiness')}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            as={Link}
                            to={`/app/assistant?scheme=${r.schemeId}`}
                          >
                            {t('matches.askAboutThis')}
                          </Button>
                        </div>
                        {r.explanationData?.decisionType ? (
                          <p className="mt-4 mono-badge text-neutral-400">
                            {t('matches.decision', { value: String(r.explanationData.decisionType).toLowerCase() })}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

const TONES = {
  pass: { labelKey: 'pass', emptyKey: 'emptyPass', icon: Check, color: 'text-amber-600 dark:text-amber-400' },
  fail: { labelKey: 'fail', emptyKey: 'emptyFail', icon: X, color: 'text-neutral-500 dark:text-neutral-400' },
  info: { labelKey: 'info', emptyKey: 'emptyInfo', icon: AlertCircle, color: 'text-amber-600 dark:text-amber-400' },
}

/**
 * Join a list using the active language's conjunction — "a and b" in English,
 * "a और b" in Hindi. Intl.ListFormat gets the separator right per locale, which
 * a hand-rolled t() interpolation would not.
 */
function joinAnd(items, locale) {
  const list = (items ?? []).slice(0, 2)
  if (list.length < 2) return list.join(' ')
  try {
    return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(list)
  } catch {
    return list.join(', ')
  }
}

function ConditionList({ tone, items, empty }) {
  const { t } = useTranslation()
  const { labelKey, emptyKey, icon: Icon, color } = TONES[tone]
  const list = items ?? []
  return (
    <div className="mt-3 first:mt-0">
      <p className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5">
        <Icon size={12} className={color} />
        {t(`matches.conditions.${labelKey}`)}
      </p>
      {list.length === 0 ? (
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{t(`matches.conditions.${emptyKey}`)}</p>
      ) : (
        <ul className="mt-1.5 flex flex-col gap-1">
          {list.map((c, i) => (
            <li key={i} className="text-xs text-neutral-600 dark:text-neutral-300 flex items-start gap-1.5">
              <span className="mt-1.5 h-1 w-1 rounded-full bg-neutral-400 dark:bg-neutral-500 flex-shrink-0" />
              {c}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
