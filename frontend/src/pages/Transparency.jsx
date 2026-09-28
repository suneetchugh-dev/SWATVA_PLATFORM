import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  Info,
  Lock,
  MapPin,
  Send,
  ShieldCheck,
} from 'lucide-react'
import { api } from '../api/client'
import { INDIAN_STATES, REPORT_CATEGORIES } from '../lib/india'
import {
  Badge,
  Banner,
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Select,
  Spinner,
  Textarea,
  cx,
} from '../components/ui'
import { PageTourButton } from '../components/GuidedTour'

/**
 * Exact ReportCategory values from the backend enum. These are sent verbatim, so
 * they must not be prettified or renamed here — a mismatch is a 400.
 */
const EMPTY = {
  department: '',
  officeLocation: '',
  district: '',
  state: '',
  reportCategory: '',
  description: '',
  schemeId: '',
  schemeName: '',
}

/**
 * Anonymous corruption reporting plus the public aggregate.
 *
 * Both endpoints are permitAll in SecurityConfig, which is deliberate: a citizen
 * being asked for a bribe must be able to submit this without an account. The
 * form therefore asks for no identity, and the response carries only a report id
 * — nothing that could identify the person who filed it.
 */
export default function Transparency() {
  const { t } = useTranslation()
  const [form, setForm] = useState(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryError, setSummaryError] = useState(null)

  useEffect(() => {
    let cancelled = false
    api.transparency
      .getSummary()
      .then((d) => !cancelled && setSummary(d))
      .catch((err) => !cancelled && setSummaryError(err?.message || t('transparency.loadFailed')))
      .finally(() => !cancelled && setSummaryLoading(false))
    return () => {
      cancelled = true
    }
  }, [t])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setResult(null)
    try {
      // schemeId is optional and only meaningful as a UUID, so an empty string
      // is dropped rather than sent as "".
      const payload = { ...form }
      if (!payload.schemeId) delete payload.schemeId
      if (!payload.schemeName) delete payload.schemeName
      const res = await api.transparency.submitReport(payload)
      setResult(res)
      setForm(EMPTY)
      // Refresh the aggregate so the citizen sees their own report counted.
      api.transparency.getSummary().then(setSummary).catch(() => {})
    } catch (err) {
      setError(err?.message || t('transparency.submitFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const official = summary?.officialInformation

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('transparency.title')}
        desc={t('transparency.desc')}
        actions={<PageTourButton pageKey="transparency" />}
      />

      {/* Success receipt — the only identifier the citizen ever receives. */}
      {result ? (
        <Card accent className="p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">{t('transparency.successTitle')}</p>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                {result.statusMessage}
              </p>
              <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                {t('transparency.reportId', { id: result.reportId })}
              </p>
              {result.officialGrievanceUrl ? (
                <a
                  href={result.officialGrievanceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
                >
                  {t('transparency.fileStatutory')}
                  <ExternalLink size={12} />
                </a>
              ) : null}
            </div>
          </div>
        </Card>
      ) : null}

      {error ? <Banner tone="error" title={t('transparency.submitFailedTitle')}>{error}</Banner> : null}

      <div className="grid gap-4 lg:grid-cols-5">
        {/* ---------------------------------------------------------- form */}
        <Card data-tour="transparency-form" as="form" onSubmit={submit} className="p-5 lg:col-span-3 space-y-4">
          <div className="flex items-center gap-2">
            <Lock size={15} className="text-neutral-500 dark:text-neutral-400" aria-hidden="true" />
            <h2 className="text-sm font-bold tracking-tight">{t('transparency.formTitle')}</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('transparency.state')} required htmlFor="tr-state">
              <Select id="tr-state" value={form.state} onChange={set('state')} required>
                <option value="">{t('transparency.selectState')}</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </Field>

            <Field label={t('transparency.district')} required htmlFor="tr-district">
              <Input
                id="tr-district"
                value={form.district}
                onChange={set('district')}
                required
                minLength={2}
              />
            </Field>

            <Field label={t('transparency.department')} required htmlFor="tr-department">
              <Input
                id="tr-department"
                value={form.department}
                onChange={set('department')}
                required
                minLength={2}
              />
            </Field>

            <Field label={t('transparency.officeLocation')} htmlFor="tr-office">
              <Input id="tr-office" value={form.officeLocation} onChange={set('officeLocation')} />
            </Field>
          </div>

          <Field label={t('transparency.category')} required htmlFor="tr-category">
            <Select
              id="tr-category"
              value={form.reportCategory}
              onChange={set('reportCategory')}
              required
            >
              <option value="">{t('transparency.selectCategory')}</option>
              {REPORT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{t(`transparency.categories.${c}`)}</option>
              ))}
            </Select>
          </Field>

          <Field
            label={t('transparency.description')}
            required
            htmlFor="tr-description"
            hint={t('transparency.descriptionHint')}
          >
            <Textarea
              id="tr-description"
              rows={4}
              value={form.description}
              onChange={set('description')}
              required
              minLength={10}
              maxLength={2000}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('transparency.schemeName')} htmlFor="tr-scheme">
              <Input id="tr-scheme" value={form.schemeName} onChange={set('schemeName')} />
            </Field>
            <Field label={t('transparency.schemeId')} htmlFor="tr-scheme-id">
              <Input id="tr-scheme-id" value={form.schemeId} onChange={set('schemeId')} />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button type="submit" disabled={submitting}>
              <Send size={13} />
              {submitting ? t('common.submitting') : t('transparency.submit')}
            </Button>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {t('transparency.anonymousNote')}
            </p>
          </div>
        </Card>

        {/* -------------------------------------------------------- summary */}
        <div data-tour="transparency-stats" className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={15} className="text-neutral-500 dark:text-neutral-400" aria-hidden="true" />
              <h2 className="text-sm font-bold tracking-tight">{t('transparency.aggregateTitle')}</h2>
            </div>

            {summaryLoading ? (
              <div className="flex items-center justify-center py-8 text-neutral-500 dark:text-neutral-400">
                <Spinner />
              </div>
            ) : summaryError ? (
              <p className="text-sm text-neutral-600 dark:text-neutral-300">{summaryError}</p>
            ) : (
              <>
                <p className="text-3xl font-black tabular-nums">{summary?.totalReports ?? 0}</p>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {t('transparency.totalReports')}
                </p>

                {summary?.byCategory?.length ? (
                  <div className="mt-5">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
                      {t('transparency.byCategory')}
                    </p>
                    <ul className="space-y-2">
                      {summary.byCategory.slice(0, 5).map((c) => (
                        <li key={c.category}>
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="truncate text-neutral-600 dark:text-neutral-300">
                              {c.displayName || t(`transparency.categories.${c.category}`)}
                            </span>
                            <span className="tabular-nums font-semibold flex-shrink-0">
                              {c.count}
                              <span className="ml-1.5 text-neutral-400">{c.percentage}%</span>
                            </span>
                          </div>
                          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-white/10">
                            <div
                              className="h-full rounded-full bg-amber-500"
                              style={{ width: `${Math.min(100, c.percentage || 0)}%` }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {summary?.byDistrict?.length ? (
                  <div className="mt-5">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
                      {t('transparency.byDistrict')}
                    </p>
                    <ul className="flex flex-wrap gap-1.5">
                      {summary.byDistrict.slice(0, 8).map((d) => (
                        <li key={d.district}>
                          <Badge>{d.district} · {d.count}</Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            )}
          </Card>

          {/* Official channels are verified, unlike the crowdsourced numbers
              above, and the card says so explicitly. */}
          {official ? (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Building2 size={15} className="text-neutral-500 dark:text-neutral-400" aria-hidden="true" />
                <h2 className="text-sm font-bold tracking-tight">{t('transparency.officialTitle')}</h2>
                {official.verifiedOfficial ? <Badge>{t('transparency.verified')}</Badge> : null}
              </div>

              <ul className="space-y-2.5">
                {official.centralGrievancePortal ? (
                  <li>
                    <a
                      href={official.centralGrievancePortal}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
                    >
                      {t('transparency.centralPortal')}
                      <ExternalLink size={11} />
                    </a>
                  </li>
                ) : null}
                {official.antiCorruptionHelpline ? (
                  <li className="text-xs text-neutral-600 dark:text-neutral-300">
                    {t('transparency.helpline')}:{' '}
                    <span className="font-semibold tabular-nums">
                      {official.antiCorruptionHelpline}
                    </span>
                  </li>
                ) : null}
              </ul>

              {official.stateGrievancePortals &&
              Object.keys(official.stateGrievancePortals).length > 0 ? (
                <details className="mt-4">
                  <summary className="cursor-pointer text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                    {t('transparency.statePortals')}
                  </summary>
                  <ul className="mt-2 space-y-1.5">
                    {Object.entries(official.stateGrievancePortals).map(([state, url]) => (
                      <li key={state} className="flex items-center justify-between gap-3 text-xs">
                        <span className="inline-flex items-center gap-1 text-neutral-600 dark:text-neutral-300">
                          <MapPin size={11} aria-hidden="true" />
                          {state}
                        </span>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400 hover:underline"
                        >
                          {t('common.open')}
                          <ExternalLink size={10} />
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </Card>
          ) : null}

          <Card className="p-4">
            <div className="flex items-start gap-2">
              <Info size={14} className="mt-0.5 flex-shrink-0 text-neutral-500 dark:text-neutral-400" aria-hidden="true" />
              <p className="text-xs text-neutral-600 dark:text-neutral-300">
                {summary?.crowdsourcedNotice?.notice || t('transparency.crowdsourcedNotice')}
              </p>
            </div>
          </Card>

          {summary?.byDepartment?.length ? (
            <Card className="p-5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
                {t('transparency.byDepartment')}
              </p>
              <ul className="space-y-1.5">
                {summary.byDepartment.slice(0, 6).map((d) => (
                  <li key={d.department} className="flex items-center justify-between gap-3 text-xs">
                    <span className={cx('truncate text-neutral-600 dark:text-neutral-300')}>
                      {d.department}
                    </span>
                    <span className="tabular-nums font-semibold flex-shrink-0">{d.count}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
