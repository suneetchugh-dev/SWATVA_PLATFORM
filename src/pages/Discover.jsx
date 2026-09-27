import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  Compass,
  Search,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'
import { api } from '../api/client'
import { LIFE_EVENT_TYPES } from '../lib/india'
import {
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  Field,
  PageHeader,
  Spinner,
  StatusPill,
  Textarea,
  cx,
} from '../components/ui'

/**
 * Life-event discovery: describe a situation in plain language and see which
 * schemes surface, with the reason each one appeared.
 *
 * The backend splits the response into central and state schemes and returns
 * `whySurfaced` per match, so this page never has to invent its own reasoning.
 * Eligibility itself is still decided deterministically upstream — the extractor
 * only reads signals out of the sentence, it does not judge anything.
 */
export default function Discover() {
  const { t } = useTranslation()
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setData(null)
    try {
      setData(await api.benefits.discoverLifeEvent(description))
    } catch (err) {
      setError(err?.message || t('discover.failed'))
    } finally {
      setLoading(false)
    }
  }

  const signals = data?.extractedSignals
  const central = data?.centralSchemes ?? []
  const stateSchemes = data?.stateSchemes ?? []
  const total = data?.totalSurfacedSchemes ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        badge={t('discover.badge')}
        title={t('discover.title')}
        desc={t('discover.desc')}
      />

      <Card as="form" onSubmit={submit} className="p-5 space-y-4">
        <Field
          label={t('discover.prompt')}
          htmlFor="discover-description"
          hint={t('discover.promptHint')}
        >
          <Textarea
            id="discover-description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('discover.placeholder')}
            required
            minLength={5}
            maxLength={2000}
          />
        </Field>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={loading || description.trim().length < 5}>
            <Search size={13} />
            {loading ? t('common.searching') : t('discover.submit')}
          </Button>
          {loading ? (
            <span className="text-neutral-500 dark:text-neutral-400">
              <Spinner />
            </span>
          ) : null}
        </div>

        {/* Examples double as a discoverability device: the extractor keys off
            specific words, so showing them teaches the citizen what to write. */}
        <div className="pt-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
            {t('discover.examples')}
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {['discover.ex0', 'discover.ex1', 'discover.ex2', 'discover.ex3'].map((k) => (
              <li key={k}>
                <button
                  type="button"
                  onClick={() => setDescription(t(k))}
                  className="rounded-full bg-neutral-100 dark:bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  {t(k)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      {error ? <Banner tone="error" title={t('discover.failedTitle')}>{error}</Banner> : null}

      {/* Signals are shown read-only. They are what the extractor understood, so
          a wrong signal is visible and correctable rather than silently wrong. */}
      {signals ? (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={15} className="text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <h2 className="text-sm font-bold tracking-tight">{t('discover.signalsTitle')}</h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {signals.eventType ? (
              <Badge>
                {LIFE_EVENT_TYPES.includes(signals.eventType)
                  ? t(`discover.events.${signals.eventType}`)
                  : signals.eventType}
              </Badge>
            ) : null}
            {signals.affectedFamilyMember ? (
              <Badge>{t('discover.member', { member: signals.affectedFamilyMember })}</Badge>
            ) : null}
            {signals.occupation ? <Badge>{signals.occupation}</Badge> : null}
            {signals.education ? <Badge>{signals.education}</Badge> : null}
            {signals.location ? <Badge>{signals.location}</Badge> : null}
            {signals.income ? (
              <Badge>
                {t('discover.income', { amount: Number(signals.income).toLocaleString('en-IN') })}
              </Badge>
            ) : null}
          </div>

          {signals.relevantCircumstances?.length ? (
            <ul className="mt-4 space-y-1.5">
              {signals.relevantCircumstances.map((c, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-300"
                >
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-amber-500 flex-shrink-0" />
                  {c}
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      ) : null}

      {data && total === 0 ? (
        <EmptyState
          icon={Compass}
          title={t('discover.noResultsTitle')}
          body={t('discover.noResultsBody')}
          action={
            <Button as={Link} to="/app/matches" variant="secondary">
              {t('discover.browseMatches')}
            </Button>
          }
        />
      ) : null}

      {total > 0 ? (
        <div className="space-y-5">
          <MatchGroup
            title={t('discover.centralSchemes')}
            count={central.length}
            matches={central}
            showLevel={false}
          />
          <MatchGroup
            title={t('discover.stateSchemes')}
            count={stateSchemes.length}
            matches={stateSchemes}
            showLevel
          />
        </div>
      ) : null}
    </div>
  )
}

function MatchGroup({ title, count, matches, showLevel }) {
  const { t } = useTranslation()
  if (count === 0) return null

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-bold tracking-tight">{title}</h2>
        <Badge>{count}</Badge>
      </div>

      <ul className="space-y-3">
        {matches.map((m) => (
          <li key={m.schemeId}>
            <Card className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold tracking-tight">{m.schemeName}</h3>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {[m.issuingAuthority, showLevel ? m.state : null, m.category]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusPill status={m.eligibilityStatus} />
                  <span
                    className={cx(
                      'text-sm font-black tabular-nums',
                      m.matchPercentage >= 70
                        ? 'text-neutral-950 dark:text-white'
                        : 'text-amber-700 dark:text-amber-400',
                    )}
                  >
                    {m.matchPercentage}%
                  </span>
                </div>
              </div>

              {m.whySurfaced ? (
                <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">
                  {m.whySurfaced}
                </p>
              ) : null}

              <ConditionList
                satisfied={m.satisfiedConditions}
                failed={m.failedConditions}
                missing={m.missingInformation}
              />

              <div className="mt-4 flex flex-wrap gap-2">
                <Button as={Link} to={`/schemes/${m.schemeId}`} variant="secondary" size="sm">
                  {t('discover.viewScheme')}
                  <ArrowRight size={12} />
                </Button>
                {m.officialSourceUrl ? (
                  <a
                    href={m.officialSourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors"
                  >
                    {t('discover.officialSource')}
                  </a>
                ) : null}
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Shared condition renderer so the three lists cannot drift apart visually. */
function ConditionList({ satisfied = [], failed = [], missing = [] }) {
  const { t } = useTranslation()
  const groups = [
    { key: 'satisfied', items: satisfied, icon: null },
    { key: 'failed', items: failed, icon: TriangleAlert },
    { key: 'missing', items: missing, icon: null },
  ].filter((g) => g.items?.length)

  if (groups.length === 0) return null

  return (
    <div className="mt-4 space-y-2">
      {groups.map((g) => (
        <div key={g.key} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {t(`discover.conditions.${g.key}`)}
          </span>
          <span className="text-xs text-neutral-600 dark:text-neutral-300">
            {g.items.join(' · ')}
          </span>
        </div>
      ))}
    </div>
  )
}
