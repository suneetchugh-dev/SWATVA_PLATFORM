import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  BadgeIndianRupee,
  FileStack,
  Scale,
  Sparkles,
  UserCog,
} from 'lucide-react'
import { api } from '../api/client'
import { Badge, Button, Card, PageHeader, Spinner, StatusPill, cx } from '../components/ui'

/**
 * The signed-in landing view. Answers the three questions a citizen actually
 * has when they log in: what am I eligible for, what am I leaving on the table,
 * and what still blocks an application.
 *
 * Every tile degrades independently — one failing endpoint must not blank the
 * whole dashboard, so each panel owns its own loading and error state and a
 * failure renders as a retry rather than an exception.
 */
function Tile({ icon: Icon, label, value, hint, to, cta, tone = 'default', status }) {
  return (
    <Card
      as={Link}
      to={to}
      className="p-5 flex flex-col gap-3 group hover:border-amber-500/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cx(
            'inline-flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0',
            tone === 'accent'
              ? 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950'
              : 'bg-neutral-100 dark:bg-white/[0.06] text-neutral-600 dark:text-neutral-300',
          )}
        >
          <Icon size={16} />
        </span>
        {status ? <StatusPill status={status} /> : null}
      </div>

      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          {label}
        </p>
        {value == null ? (
          <div className="mt-1.5 h-7 w-20 rounded bg-neutral-100 dark:bg-white/[0.06] animate-pulse" />
        ) : (
          <p className="mt-1 text-2xl font-black tracking-tight tabular-nums">{value}</p>
        )}
        {hint ? (
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>
        ) : null}
      </div>

      {cta ? (
        <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
          {cta}
          <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      ) : null}
    </Card>
  )
}

/** A panel that renders its own spinner/retry so one bad endpoint is contained. */
function Loadable({ load, children, onRetry }) {
  const [state, setState] = useState({ loading: true, data: null, error: null })

  const run = () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    load()
      .then((data) => setState({ loading: false, data, error: null }))
      .catch((err) =>
        setState({ loading: false, data: null, error: err?.message || 'Failed to load' }),
      )
  }

  useEffect(run, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (state.loading) {
    return (
      <div className="flex items-center justify-center py-10 text-neutral-500 dark:text-neutral-400">
        <Spinner />
      </div>
    )
  }
  if (state.error) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-neutral-600 dark:text-neutral-300">{state.error}</p>
        <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={run}>
          {onRetry}
        </Button>
      </div>
    )
  }
  return children(state.data)
}

export default function Dashboard() {
  const { t } = useTranslation()
  const [user, setUser] = useState(null)

  useEffect(() => {
    api.user.getMe().then(setUser).catch(() => {})
  }, [])

  return (
    <div className="space-y-6 mt-10 sm:mt-12">
      <PageHeader
        arrowLabel={t('dashboard.badge')}
        title={t('dashboard.title', { name: user?.fullName?.split(' ')[0] || t('dashboard.citizen') })}
        desc={t('dashboard.desc')}
      />

      {/* Missed value is the strongest single number we can show, so it gets
          the full-width accent card rather than one tile among four. */}
      <Card accent className="p-6">
        <Loadable
          load={() => api.benefits.getMissedValue()}
          onRetry={t('common.retry')}
        >
          {(missed) => (
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  {t('dashboard.missedValueLabel')}
                </p>
                <p className="mt-1.5 text-3xl sm:text-4xl font-black tracking-tight tabular-nums">
                  ₹{Number(missed?.totalEstimatedAnnualBenefit ?? 0).toLocaleString('en-IN')}
                </p>
                <p className="mt-1.5 text-sm text-neutral-600 dark:text-neutral-300">
                  {t('dashboard.missedValueHint', {
                    count: missed?.totalMissedBenefits ?? 0,
                    n: missed?.totalMissedBenefits ?? 0,
                  })}
                </p>
              </div>
              <Button as={Link} to="/app/benefits" variant="primary">
                {t('dashboard.missedValueCta')}
                <ArrowRight size={14} />
              </Button>
            </div>
          )}
        </Loadable>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Loadable load={() => api.eligibility.getMatches()} onRetry={t('common.retry')}>
          {(matches) => {
            const list = matches ?? []
            const eligible = list.filter((m) => m.status === 'ELIGIBLE').length
            return (
              <Tile
                icon={Scale}
                label={t('dashboard.eligibleLabel')}
                value={eligible}
                hint={t('dashboard.eligibleHint', { count: list.length, n: list.length })}
                to="/app/matches"
                cta={t('dashboard.ctaReview')}
                status={eligible > 0 ? 'ELIGIBLE' : null}
              />
            )
          }}
        </Loadable>

        <Loadable load={() => api.documents.list()} onRetry={t('common.retry')}>
          {(docs) => (
            <Tile
              icon={FileStack}
              label={t('dashboard.documentsLabel')}
              value={(docs ?? []).length}
              hint={t('dashboard.documentsHint')}
              to="/app/documents"
              cta={t('dashboard.ctaOpen')}
            />
          )}
        </Loadable>

        {/* The header already needs the signed-in user for the greeting, so the
            profile tile reads that same fetch rather than issuing a second one. */}
        <Tile
          icon={UserCog}
          label={t('dashboard.profileLabel')}
          value={
            user?.profile?.age
              ? t('dashboard.profileAge', { age: user.profile.age })
              : user
                ? '—'
                : <Spinner />
          }
          hint={user?.profile?.state || t('dashboard.profileHint')}
          to="/app/profile"
          cta={t('dashboard.ctaUpdate')}
        />

        <Tile
          icon={Sparkles}
          label={t('dashboard.discoverLabel')}
          value={t('dashboard.discoverValue')}
          hint={t('dashboard.discoverHint')}
          to="/app/discover"
          cta={t('dashboard.ctaStart')}
          tone="accent"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-bold tracking-tight">{t('dashboard.whyTitle')}</h2>
          <p className="mt-1.5 text-sm text-neutral-600 dark:text-neutral-300">
            {t('dashboard.whyBody')}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge>{t('dashboard.badgeDeterministic')}</Badge>
            <Badge>{t('dashboard.badgeSourceBacked')}</Badge>
            <Badge>{t('dashboard.badgeAnonymous')}</Badge>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-bold tracking-tight">{t('dashboard.reportTitle')}</h2>
          <p className="mt-1.5 text-sm text-neutral-600 dark:text-neutral-300">
            {t('dashboard.reportBody')}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button as={Link} to="/app/transparency" variant="secondary" size="sm">
              <BadgeIndianRupee size={13} />
              {t('dashboard.reportCta')}
            </Button>
            <Button as={Link} to="/app/matches" variant="ghost" size="sm">
              {t('dashboard.browseSchemes')}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
