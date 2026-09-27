import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertCircle, ArrowUpRight, Check, Scale, Sparkles, X } from 'lucide-react'
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
          <Button variant="secondary" onClick={load}>
            {t('matches.recheck')}
          </Button>
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
          {/* Verdict tally. Amber on the eligible count only — the design system
              does not allow a row of coloured status chips. */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { key: 'ELIGIBLE', value: counts.ELIGIBLE, accent: true },
              { key: 'NEEDS_INFORMATION', value: counts.NEEDS_INFORMATION, accent: false },
              { key: 'NOT_ELIGIBLE', value: counts.NOT_ELIGIBLE, accent: false },
            ].map(({ key, value, accent }) => (
              <Card key={key} accent={accent} className="p-4">
                <span
                  className={cx(
                    'mono-badge',
                    accent
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-neutral-500 dark:text-neutral-400',
                  )}
                >
                  {String(value).padStart(2, '0')}
                </span>
                <p className="mt-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 leading-tight">
                  {key === 'ELIGIBLE'
                    ? t('matches.tally.eligible')
                    : key === 'NEEDS_INFORMATION'
                      ? t('matches.tally.needsInfo')
                      : t('matches.tally.notEligible')}
                </p>
              </Card>
            ))}
          </div>

          <div className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1" role="tablist" aria-label="Filter matches">
            {FILTER_IDS.map((id) => {
              const n = id === 'ALL' ? (results?.length ?? 0) : counts[id]
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={filter === id}
                  onClick={() => setFilter(id)}
                  className={cx(
                    'shrink-0 h-8 px-3 rounded-full text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5',
                    filter === id
                      ? 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950'
                      : 'bg-neutral-100 dark:bg-white/[0.06] text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-white/10',
                  )}
                >
                  {t(`matches.filters.${id}`)}
                  <span className={cx('mono-badge', filter === id ? 'opacity-70' : 'opacity-60')}>{n}</span>
                </button>
              )
            })}
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title={t('matches.nothingTitle')}
              body={t('matches.nothingBody')}
            />
          ) : (
            <div className="flex flex-col gap-3">
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
