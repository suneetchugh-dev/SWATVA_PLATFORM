import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleDashed,
  Clock,
  FileWarning,
  Upload,
} from 'lucide-react'
import { api } from '../api/client'
import {
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Spinner,
  cx,
} from '../components/ui'

/** Bucket key on the response -> icon + label key. Order is the reading order. */
const BUCKETS = [
  { key: 'completed', countKey: 'completedDocuments', icon: CheckCircle2, labelKey: 'readiness.completed', tone: 'good' },
  { key: 'missing', countKey: 'missingDocuments', icon: CircleDashed, labelKey: 'readiness.missing', tone: 'bad' },
  { key: 'invalid', countKey: 'invalidDocuments', icon: FileWarning, labelKey: 'readiness.invalid', tone: 'bad' },
  { key: 'needsReview', countKey: 'documentsNeedingReview', icon: Clock, labelKey: 'readiness.needsReview', tone: 'warn' },
]

// The palette is achromatic plus a single amber accent, so severity is encoded
// with weight and fill rather than hue: 'bad' is solid, 'good' is muted.
const TONE_CLASS = {
  good: 'text-neutral-700 dark:text-neutral-200',
  warn: 'text-amber-600 dark:text-amber-400',
  bad: 'text-amber-700 dark:text-amber-300',
  idle: 'text-neutral-300 dark:text-neutral-600',
}

// The design system bans blue/green/teal families, so the traffic light uses
// neutral + amber + rose only. RED/YELLOW/GREEN map onto those.
const LIGHT_CLASS = {
  RED: { dot: 'bg-amber-600', text: 'text-amber-700 dark:text-amber-300' },
  YELLOW: { dot: 'bg-amber-400', text: 'text-amber-600 dark:text-amber-400' },
  GREEN: { dot: 'bg-neutral-900 dark:bg-white', text: 'text-neutral-900 dark:text-white' },
}

/**
 * Per-scheme application readiness: how far along the citizen is, and exactly
 * which documents are blocking them.
 *
 * The buckets come straight from the backend's ApplicationReadinessResponse.
 * Anything in `invalid` or `needsReview` is already uploaded but will not be
 * accepted, so those are surfaced alongside `missing` rather than hidden in a
 * separate screen — from the citizen's side they are the same problem.
 */
export default function Readiness() {
  const { t } = useTranslation()
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.readiness
      .getSchemeReadiness(id)
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(err?.message || t('readiness.loadFailed')))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [id, t])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-neutral-500 dark:text-neutral-400">
        <Spinner />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-5">
        <BackLink />
        <EmptyState
          icon={AlertTriangle}
          title={t('readiness.loadFailedTitle')}
          body={error ?? t('readiness.loadFailed')}
          action={
            <Button as={Link} to="/app/matches" variant="secondary">
              {t('readiness.backToMatches')}
            </Button>
          }
        />
      </div>
    )
  }

  const light = LIGHT_CLASS[data.status] ?? LIGHT_CLASS.YELLOW
  const pct = Number(data.readinessPercentage ?? 0)

  return (
    <div className="space-y-6">
      <BackLink />

      <PageHeader
        title={data.schemeName || t('readiness.title')}
        desc={t('readiness.desc')}
        actions={
          <Button as={Link} to={`/schemes/${id}`} variant="secondary" size="sm">
            {t('readiness.viewScheme')}
          </Button>
        }
      />

      {/* Headline score */}
      <Card accent className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <span
              className={cx(
                'h-3.5 w-3.5 rounded-full flex-shrink-0',
                light.dot,
              )}
              aria-hidden="true"
            />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                {t('readiness.overallStatus')}
              </p>
              <p className={cx('mt-0.5 text-lg font-bold tracking-tight', light.text)}>
                {t(`readiness.status.${data.status}`)}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-4xl font-black tracking-tight tabular-nums">{pct}%</p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {t('readiness.completedOf', {
                done: data.completedDocuments ?? 0,
                total: data.totalRequiredDocuments ?? 0,
              })}
            </p>
          </div>
        </div>

        {/* Progress rail. Width is the backend's own percentage, not a
            client-side recomputation, so the bar can never disagree with the
            number beside it. */}
        <div
          className="mt-5 h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-white/10"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('readiness.overallStatus')}
        >
          <div
            className={cx('h-full rounded-full transition-all', light.dot)}
            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
          />
        </div>
      </Card>

      {(data.invalidDocuments > 0 || data.documentsNeedingReview > 0) ? (
        <Banner tone="warn" title={t('readiness.actionNeeded')}>
          {t('readiness.actionNeededBody', {
            invalid: data.invalidDocuments ?? 0,
            review: data.documentsNeedingReview ?? 0,
          })}
        </Banner>
      ) : null}

      {/* Bucket summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {BUCKETS.map(({ key, countKey, icon: Icon, labelKey, tone }) => {
          const count = Number(data[countKey] ?? 0)
          return (
            <Card key={key} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <Icon
                  size={15}
                  className={cx(count > 0 ? TONE_CLASS[tone] : TONE_CLASS.idle)}
                  aria-hidden="true"
                />
                <span className="text-xl font-black tabular-nums">{count}</span>
              </div>
              <p className="mt-2 text-xs font-medium text-neutral-600 dark:text-neutral-300">
                {t(labelKey)}
              </p>
            </Card>
          )
        })}
      </div>

      {/* Document lists */}
      <div className="space-y-4">
        {BUCKETS.map(({ key, icon: Icon, labelKey, tone }) => {
          const items = data[key] ?? []
          if (items.length === 0) return null
          return (
            <Card key={key} className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Icon
                  size={15}
                  className={cx(TONE_CLASS[tone])}
                  aria-hidden="true"
                />
                <h2 className="text-sm font-bold tracking-tight">{t(labelKey)}</h2>
                <Badge>{items.length}</Badge>
              </div>

              <ul className="divide-y divide-neutral-200 dark:divide-white/10">
                {items.map((doc, idx) => (
                  <li key={doc.userDocumentId ?? `${doc.documentTypeCode}-${idx}`} className="py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          {doc.documentTypeName || doc.documentTypeCode}
                        </p>
                        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                          {doc.reason}
                        </p>
                        {doc.filename ? (
                          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 truncate">
                            {doc.filename}
                            {doc.expiryDate ? ` · ${t('readiness.expires')} ${doc.expiryDate}` : ''}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {doc.required ? (
                          <Badge>{t('common.required')}</Badge>
                        ) : (
                          <Badge>{t('common.optional')}</Badge>
                        )}
                        {doc.userDocumentId ? (
                          <Button as={Link} to="/app/documents" variant="ghost" size="sm">
                            {t('readiness.manage')}
                          </Button>
                        ) : key === 'missing' ? (
                          <Button as={Link} to="/app/documents" variant="secondary" size="sm">
                            <Upload size={12} />
                            {t('readiness.upload')}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )
        })}
      </div>

      {data.missingDocuments === 0 &&
      data.invalidDocuments === 0 &&
      data.documentsNeedingReview === 0 ? (
        <Card accent className="p-6 text-center">
          <CheckCircle2
            size={22}
            className="mx-auto text-neutral-900 dark:text-white"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm font-semibold">{t('readiness.allSet')}</p>
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
            {t('readiness.allSetBody')}
          </p>
        </Card>
      ) : null}
    </div>
  )
}

function BackLink() {
  const { t } = useTranslation()
  return (
    <Link
      to="/app/matches"
      className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors"
    >
      <ArrowLeft size={13} />
      {t('readiness.back')}
    </Link>
  )
}
