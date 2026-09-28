import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight, Coins, ExternalLink, IndianRupee, Sparkles, TrendingUp } from 'lucide-react'
import { api } from '../api/client'
import { Badge, Banner, Card, EmptyState, PageHeader, Spinner, StatusPill, cx } from '../components/ui'
import { PageTourButton } from '../components/GuidedTour'

/**
 * What the citizen is currently leaving on the table, and what they can get.
 *
 * The headline rupee figure is a computed estimate from seeded scheme data, not
 * a promise of payout, so the disclaimer the backend supplies is rendered
 * verbatim and never suppressed.
 */
export default function Benefits() {
  const { t, i18n } = useTranslation()
  const [rec, setRec] = useState(null)
  const [missed, setMissed] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    Promise.allSettled([api.benefits.getRecommended(), api.benefits.getMissedValue()])
      .then(([r, m]) => {
        if (cancelled) return
        if (r.status === 'fulfilled') setRec(r.value)
        if (m.status === 'fulfilled') setMissed(m.value)
        const failure = [r, m].find((x) => x.status === 'rejected')
        if (failure) setError(failure.reason?.message || t('benefits.loadError'))
      })
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-neutral-500 dark:text-neutral-400">
        <Spinner />
      </div>
    )
  }

  const central = rec?.centralBenefits ?? []
  const state = rec?.stateBenefits ?? []
  const actionable = [...central, ...state].filter((b) => b.status === 'ELIGIBLE')
  const total = rec?.totalPotentialBenefits ?? 0

  return (
    <div>
      <PageHeader
        title={t('benefits.title')}
        desc={t('benefits.desc')}
        actions={<PageTourButton pageKey="benefits" />}
      />

      {error ? (
        <div className="mb-6">
          <Banner tone="error" title={t('common.loadingError')}>{error}</Banner>
        </div>
      ) : null}

      {total === 0 && !error ? (
        <EmptyState
          icon={Coins}
          title={t('benefits.emptyTitle')}
          body={t('benefits.emptyBody')}
          action={
            <Link to="/app/profile" className="font-semibold text-amber-700 dark:text-amber-400 hover:underline">
              Complete your profile
            </Link>
          }
        />
      ) : (
        <>
          <div data-tour="benefits-summary" className="grid gap-4 sm:grid-cols-2 mb-8">
            <Card accent className="p-5">
              <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5">
                <TrendingUp size={13} className="text-amber-600 dark:text-amber-400" />
                {t('benefits.notClaiming')}
              </p>
              <p className="mt-2 text-3xl font-extrabold tracking-tight">
                <Money value={missed?.totalEstimatedAnnualBenefit ?? 0} />
              </p>
              <p className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-300">
                {t('benefits.acrossSchemes', { count: missed?.totalMissedBenefits ?? 0 })}
              </p>
              {missed?.disclaimer ? (
                <p className="mt-3 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                  {missed.disclaimer}
                </p>
              ) : null}
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-600 dark:text-amber-400" />
                {t('benefits.actOn')}
              </p>
              <p className="mt-2 text-3xl font-extrabold tracking-tight">
                {String(actionable.length).padStart(2, '0')}
              </p>
              <p className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-300">
                {t('benefits.ofConsidered', { n: total })}
              </p>
            </Card>
          </div>

          {missed?.headlineMessage ? (
            <div className="mb-8">
              <Banner tone="warn" title={t('benefits.worthALook')}>
                {missed.headlineMessage}
              </Banner>
            </div>
          ) : null}

          {missed?.breakdown?.length ? (
            <section data-tour="benefits-list" className="mb-10">
              <h2 className="text-sm font-bold tracking-tight mb-3">{t('benefits.gapTitle')}</h2>
              <div className="flex flex-col gap-2">
                {missed.breakdown.map((b) => {
                  const max = Math.max(...missed.breakdown.map((x) => x.estimatedAnnualBenefit || 0), 1)
                  const pct = Math.round(((b.estimatedAnnualBenefit || 0) / max) * 100)
                  return (
                    <Card key={b.schemeId} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold tracking-tight text-balance">{b.schemeName}</p>
                          <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                            {levelLabel(b, t)} {b.period ? `· ${b.period}` : ''}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-bold tracking-tight">
                          <Money value={b.estimatedAnnualBenefit} />
                        </span>
                      </div>
                      <div className="mt-3 h-1 rounded-full bg-neutral-200 dark:bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
                      </div>
                      {b.benefitDescription ? (
                        <p className="mt-2.5 text-xs text-neutral-600 dark:text-neutral-300 text-balance">
                          {b.benefitDescription}
                        </p>
                      ) : null}
                    </Card>
                  )
                })}
              </div>
            </section>
          ) : null}

          <section>
            <h2 className="text-sm font-bold tracking-tight mb-3">
              {t('benefits.assessedTitle')}
            </h2>
            <div className="flex flex-col gap-2">
              {[...central, ...state].map((b) => (
                <Card key={b.schemeId} className="p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <StatusPill status={b.status} />
                        <span className="mono-badge text-neutral-400">
                          {b.governmentLevel === 'CENTRAL' ? 'Central' : b.state ? `State · ${b.state}` : 'State'}
                        </span>
                      </div>
                      <p className="text-sm font-semibold tracking-tight text-balance">{b.schemeName}</p>
                      {b.benefitInformation ? (
                        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300 text-balance">
                          {b.benefitInformation}
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      {b.officialSourceUrl ? (
                        <a
                          href={b.officialSourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline"
                        >
                          {t('benefits.officialSource')}
                          <ExternalLink size={11} />
                        </a>
                      ) : null}
                      {b.issuingAuthority ? (
                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400 text-right">
                          {b.issuingAuthority}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {b.missingInformation?.length ? (
                    <p className="mt-2.5 text-[11px] text-neutral-600 dark:text-neutral-300">
                      {t('benefits.addInfo', { what: joinAnd(b.missingInformation, i18n.resolvedLanguage) })}
                    </p>
                  ) : null}
                </Card>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

/** "Central" or "State · Uttar Pradesh", localised. */
function levelLabel(b, t) {
  if (b.governmentLevel === 'CENTRAL') return t('common.central')
  return b.state ? `${t('common.state')} · ${b.state}` : t('common.state')
}

/** Conjunction-aware join; see Matches.joinAnd. */
function joinAnd(items, locale) {
  const list = (items ?? []).slice(0, 2)
  if (list.length < 2) return list.join(' ')
  try {
    return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(list)
  } catch {
    return list.join(', ')
  }
}

/** Indian digit grouping — ₹1,20,000 not ₹120,000. */
function Money({ value = 0 }) {
  const n = Number(value) || 0
  return (
    <span className="inline-flex items-baseline gap-0.5">
      <IndianRupee size={Math.max(14, 18)} className="self-center" strokeWidth={2.4} />
      <span>{n.toLocaleString('en-IN')}</span>
    </span>
  )
}

export { Money }
