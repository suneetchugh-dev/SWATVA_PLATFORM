import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, CheckCircle2, ExternalLink, FileText, Info, MapPin, ShieldCheck } from 'lucide-react'
import { api } from '../api/client'
import { Badge, Banner, Button, Card, EmptyState, PageHeader, Spinner } from '../components/ui'

/**
 * Public scheme detail. `/api/schemes/**` is unauthenticated on purpose: someone
 * who has not signed up should still be able to read what a scheme is and what
 * it requires before deciding to trust us with a profile.
 */
export default function SchemeDetail() {
  const { t, i18n } = useTranslation()
  const { id } = useParams()
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.schemes
      .getById(id)
      .then((d) => !cancelled && setDetail(d))
      .catch((err) => !cancelled && setError(err?.message || t('scheme.notFoundBody')))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-neutral-500 dark:text-neutral-400">
        <Spinner />
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div>
        <BackLink />
        <EmptyState
          icon={Info}
          title={t('scheme.notFoundTitle')}
          body={error ?? t('scheme.notFoundBody')}
          action={
            <Button as={Link} to="/app/matches" variant="secondary">
              {t('scheme.backToMatches')}
            </Button>
          }
        />
      </div>
    )
  }

  const s = detail.scheme
  // `t` is i18next's translate function, so the transparency payload is
  // bound to an explicit name instead of shadowing it.
  const transparency = detail.transparency

  return (
    <div className="min-h-dvh w-full bg-porcelain dark:bg-obsidian text-neutral-950 dark:text-white">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-10">
      <BackLink />

      <header className="mt-6">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <Badge>{s.governmentLevel === 'CENTRAL' ? t('common.central') : s.state ? `${t('common.state')} · ${s.state}` : t('common.state')}</Badge>
          {s.category ? <Badge>{s.category}</Badge> : null}
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-balance">{s.name}</h1>
        {s.issuingAuthority ? (
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{s.issuingAuthority}</p>
        ) : null}
        {s.lastVerifiedAt ? (
          <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
            {t('scheme.lastVerified', {
              date: new Date(s.lastVerifiedAt).toLocaleDateString(i18n.resolvedLanguage === 'hi' ? 'hi-IN' : 'en-IN', {
                day: 'numeric', month: 'long', year: 'numeric',
              }),
            })}
          </p>
        ) : null}
      </header>

      {s.benefitInformation ? (
        <Card accent className="mt-6 p-5">
          <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">{t('scheme.whatYouGet')}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-balance">{s.benefitInformation}</p>
        </Card>
      ) : null}

      {/* Transparency first. The whole premise is that nobody should have to pay
          a middleman to find out about a free government scheme. */}
      {t ? (
        <Card className="mt-4 p-5">
          <h2 className="text-sm font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck size={15} className="text-amber-600 dark:text-amber-400" />
            {t('scheme.isFreeTitle')}
          </h2>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <p className="flex items-start gap-2">
              <span className={transparency.officialApplicationFeeExists ? 'text-amber-700 dark:text-amber-400 font-semibold' : 'font-semibold'}>
                {transparency.officialApplicationFeeExists
                  ? t('scheme.feeApplies', { amount: transparency.officialFeeAmount ?? '—' })
                  : t('scheme.noFee')}
              </span>
            </p>
            {transparency.transparencyWarning ? (
              <p className="text-xs text-neutral-600 dark:text-neutral-300 text-balance">{transparency.transparencyWarning}</p>
            ) : null}
            {transparency.notice ? (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 text-balance">{transparency.notice}</p>
            ) : null}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {transparency.officialSourceUrl ? (
              <Button size="sm" as="a" href={transparency.officialSourceUrl} target="_blank" rel="noopener noreferrer" variant="secondary">
                {t('scheme.officialSource')}
                <ExternalLink size={13} />
              </Button>
            ) : null}
            {transparency.officialGrievanceUrl ? (
              <Button size="sm" as="a" href={transparency.officialGrievanceUrl} target="_blank" rel="noopener noreferrer" variant="ghost">
                {t('scheme.fileGrievance')}
                <ExternalLink size={13} />
              </Button>
            ) : null}
          </div>
        </Card>
      ) : null}

      {detail.eligibilityCriteria?.length ? (
        <Section title={t('scheme.whoQualifies')} icon={CheckCircle2}>
          <ul className="flex flex-col gap-2">
            {detail.eligibilityCriteria.map((c, i) => (
              <li key={i} className="text-sm text-neutral-700 dark:text-neutral-200 flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 rounded-full bg-amber-500 flex-shrink-0" />
                {c}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {detail.requiredDocuments?.length ? (
        <Section title={t('scheme.documentsNeeded')} icon={FileText}>
          <div className="flex flex-col gap-2">
            {detail.requiredDocuments.map((d) => (
              <div key={d.code} className="flex items-start justify-between gap-3 py-2 border-b border-neutral-200 dark:border-white/10 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-semibold tracking-tight">{d.name}</p>
                  {d.notes ? <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-300">{d.notes}</p> : null}
                </div>
                <span className="mono-badge shrink-0 text-neutral-500 dark:text-neutral-400">
                  {d.required ? t('common.required') : t('common.optional')}
                </span>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {detail.applicationSteps?.length ? (
        <Section title={t('scheme.howToApply')} icon={MapPin}>
          <ol className="flex flex-col gap-4">
            {detail.applicationSteps
              .slice()
              .sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
              .map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 h-6 w-6 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-[11px] font-bold flex items-center justify-center">
                    {step.number ?? i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold tracking-tight">{step.title}</p>
                    {step.instructions ? (
                      <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300 text-balance">{step.instructions}</p>
                    ) : null}
                    {step.officialUrl ? (
                      <a
                        href={step.officialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline"
                      >
                        {t('scheme.openStep')}
                        <ExternalLink size={10} />
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
          </ol>
        </Section>
      ) : null}

      {s.officialSourceUrl ? (
        <div className="mt-6">
          <Banner tone="info" title={t('scheme.verifyTitle')}>
            {t('scheme.verifyBody')}
          </Banner>
          <Button
            className="mt-3"
            as="a"
            href={s.officialSourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="secondary"
          >
            {t('scheme.openOfficial')}
            <ExternalLink size={14} />
          </Button>
        </div>
      ) : null}

      <div className="mt-10 pt-6 border-t border-neutral-200 dark:border-white/10">
        <Button as={Link} to="/app/matches" variant="accent">
          {t('scheme.checkQualify')}
        </Button>
      </div>
      </div>
    </div>
  )
}

function BackLink() {
  const { t } = useTranslation()
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
    >
      <ArrowLeft size={13} />
      {t('scheme.back')}
    </Link>
  )
}

function Section({ title, icon: Icon, children }) {
  return (
    <section className="mt-4">
      <Card className="p-5">
        <h2 className="text-sm font-bold tracking-tight flex items-center gap-2 mb-3">
          <Icon size={15} className="text-amber-600 dark:text-amber-400" />
          {title}
        </h2>
        {children}
      </Card>
    </section>
  )
}
