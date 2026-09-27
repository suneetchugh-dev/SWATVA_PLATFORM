import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileStack, Plus, RefreshCw, Trash2, Upload } from 'lucide-react'
import { api } from '../api/client'
import {
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  Spinner,
  cx,
} from '../components/ui'
import { playClick } from '../utils/soundFx'

/**
 * The document locker. Documents are stored in S3-compatible storage and tracked
 * with an expiry date so a lapsed certificate surfaces before it blocks an
 * application.
 */
const DOC_TYPES = [
  'AADHAAR', 'INCOME_CERTIFICATE', 'CASTE_CERTIFICATE', 'RATION_CARD',
  'RESIDENCE_PROOF', 'BANK_ACCOUNT', 'ELECTRICITY_CONNECTION',
  'EDUCATION_CERTIFICATE', 'OFFICIAL_ID', 'OTHER',
]

const STATUS_STYLES = {
  ACTIVE: 'text-amber-700 dark:text-amber-400 border-amber-500/30 bg-amber-500/10',
  EXPIRED: 'text-neutral-600 dark:text-neutral-300 border-neutral-300 dark:border-white/20 bg-neutral-500/10',
  NEEDS_REVIEW: 'text-amber-700 dark:text-amber-400 border-dashed border-amber-500/40 bg-transparent',
  ARCHIVED: 'text-neutral-500 dark:text-neutral-400 border-neutral-300 dark:border-white/15 bg-transparent',
}

const fmtDate = (d) => {
  if (!d) return null
  const dt = new Date(d)
  return Number.isNaN(dt.getTime()) ? null : dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const isExpired = (d) => {
  if (!d) return false
  const dt = new Date(d)
  return !Number.isNaN(dt.getTime()) && dt.getTime() < Date.now()
}

export default function Documents() {
  const { t } = useTranslation()
  const [docs, setDocs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [activeTab, setActiveTab] = useState('locker') // 'locker' | 'add'

  const [docType, setDocType] = useState('AADHAAR')
  const [filename, setFilename] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [authority, setAuthority] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  const load = () => {
    setLoading(true)
    api.documents
      .list()
      .then((d) => setDocs(d ?? []))
      .catch((err) => setError(err?.message || t('documents.loadError')))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const register = async (event) => {
    event.preventDefault()
    setError(null)
    setUploading(true)
    try {
      const file = fileRef.current?.files?.[0]
      if (file) {
        const fd = new FormData()
        fd.append('documentType', docType)
        fd.append('file', file)
        fd.append('filename', filename.trim() || file.name)
        if (issueDate) fd.append('issueDate', issueDate)
        if (expiryDate) fd.append('expiryDate', expiryDate)
        if (authority.trim()) fd.append('issuingAuthority', authority.trim())
        await api.documents.upload(fd)
      } else {
        await api.documents.register({
          documentType: docType,
          filename: filename.trim(),
          issueDate: issueDate || null,
          expiryDate: expiryDate || null,
          issuingAuthority: authority.trim() || null,
        })
      }
      playClick()
      setFilename('')
      setIssueDate('')
      setExpiryDate('')
      setAuthority('')
      if (fileRef.current) fileRef.current.value = ''
      load()
      setActiveTab('locker')
    } catch (err) {
      setError(err?.message || t('documents.saveError'))
    } finally {
      setUploading(false)
    }
  }

  const remove = async (id) => {
    playClick()
    setError(null)
    setBusyId(id)
    try {
      await api.documents.delete(id)
      load()
    } catch (err) {
      setError(err?.message || t('documents.deleteError'))
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-neutral-500 dark:text-neutral-400">
        <Spinner />
      </div>
    )
  }

  const docCount = docs?.length ?? 0

  return (
    <div className="w-full max-w-full overflow-hidden">
      <PageHeader
        title={t('documents.title')}
        desc={t('documents.desc')}
        actions={
          <div className="p-1 rounded-full neo-glass-card inline-flex items-center">
            <div className="relative grid grid-cols-2 gap-1 min-w-[240px] sm:min-w-[280px]">
              <span
                aria-hidden="true"
                className={cx(
                  'absolute inset-y-0 left-0 w-[calc(50%-2px)] rounded-full bg-neutral-950 dark:bg-white transition-transform duration-[340ms] ease-[cubic-bezier(0.32,0.72,0,1)]',
                  activeTab === 'add' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'
                )}
              />
              <button
                type="button"
                onClick={() => { playClick(); setActiveTab('locker'); }}
                aria-pressed={activeTab === 'locker'}
                className={cx(
                  'relative z-10 inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold transition-colors cursor-pointer',
                  activeTab === 'locker'
                    ? 'text-white dark:text-neutral-950'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                )}
              >
                <FileStack size={13} className="stroke-[2] flex-shrink-0" aria-hidden="true" />
                <span>{t('documents.tabLockerCount', { n: docCount }) || `My Locker (${docCount})`}</span>
              </button>
              <button
                type="button"
                onClick={() => { playClick(); setActiveTab('add'); }}
                aria-pressed={activeTab === 'add'}
                className={cx(
                  'relative z-10 inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold transition-colors cursor-pointer',
                  activeTab === 'add'
                    ? 'text-white dark:text-neutral-950'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                )}
              >
                <Plus size={13} className="stroke-[2.5] flex-shrink-0" aria-hidden="true" />
                <span>{t('documents.tabAdd') || 'Add Document'}</span>
              </button>
            </div>
          </div>
        }
      />

      {error ? (
        <div className="mb-6">
          <Banner tone="error" title={t('common.loadingError')}>{error}</Banner>
        </div>
      ) : null}

      {/* View 1: My Locker Tab */}
      {activeTab === 'locker' && (
        <div className="w-full min-w-0">
          {docCount === 0 ? (
            <EmptyState
              icon={FileStack}
              title={t('documents.emptyTitle')}
              body={t('documents.emptyBody')}
              action={
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => { playClick(); setActiveTab('add'); }}
                >
                  <Plus size={14} className="stroke-[2.5]" />
                  <span>{t('documents.tabAdd') || 'Add Document'}</span>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {docs.map((d) => {
                const expired = isExpired(d.expiryDate)
                const style = STATUS_STYLES[d.status] ?? STATUS_STYLES.ACTIVE
                return (
                  <Card key={d.id} className="p-4 flex flex-col min-w-0 overflow-hidden">
                    <div className="flex items-start justify-between gap-3 min-w-0">
                      <div className="min-w-0 flex-1">
                        <span className={cx('mono-badge inline-block rounded px-2 py-1 border', style)}>
                          {t(`status.${d.status ?? 'ACTIVE'}`)}
                        </span>
                        <p className="mt-2 text-sm font-semibold tracking-tight text-balance truncate">
                          {d.documentTypeName ?? d.documentType}
                        </p>
                        {d.filename ? (
                          <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400 truncate">{d.filename}</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(d.id)}
                        disabled={busyId === d.id}
                        aria-label={`${t('common.remove')}: ${d.documentTypeName ?? d.documentType}`}
                        className="shrink-0 h-8 w-8 flex items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/10 hover:text-amber-700 dark:hover:text-amber-400 transition-colors cursor-pointer disabled:opacity-40"
                      >
                        {busyId === d.id ? <Spinner className="h-3.5 w-3.5" /> : <Trash2 size={14} />}
                      </button>
                    </div>

                    <dl className="mt-3 pt-3 border-t border-neutral-200 dark:border-white/10 grid grid-cols-2 gap-y-1.5 text-[11px]">
                      {d.issueDate ? (
                        <div className="min-w-0">
                          <dt className="text-neutral-500 dark:text-neutral-400 truncate">{t('documents.issued')}</dt>
                          <dd className="font-semibold truncate">{fmtDate(d.issueDate)}</dd>
                        </div>
                      ) : null}
                      {d.expiryDate ? (
                        <div className="min-w-0">
                          <dt className="text-neutral-500 dark:text-neutral-400 truncate">{expired ? t('documents.expired') : t('documents.expires')}</dt>
                          <dd className={cx('font-semibold truncate', expired && 'text-amber-700 dark:text-amber-400')}>
                            {fmtDate(d.expiryDate)}
                          </dd>
                        </div>
                      ) : null}
                      {d.issuingAuthority ? (
                        <div className="col-span-2 min-w-0">
                          <dt className="text-neutral-500 dark:text-neutral-400 truncate">{t('documents.issuedBy')}</dt>
                          <dd className="font-semibold truncate">{d.issuingAuthority}</dd>
                        </div>
                      ) : null}
                    </dl>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* View 2: Add Document Tab */}
      {activeTab === 'add' && (
        <Card className="p-5 sm:p-6 w-full max-w-full overflow-hidden">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div>
              <h2 className="text-sm font-bold tracking-tight">{t('documents.addTitle')}</h2>
              <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
                {t('documents.addIntro')}
              </p>
            </div>
            {docCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { playClick(); setActiveTab('locker'); }}
              >
                Back to Locker
              </Button>
            )}
          </div>

          <form onSubmit={register} className="mt-5 grid gap-4 sm:grid-cols-2 min-w-0">
            <Field label={t('documents.type')} htmlFor="docType" required>
              <Select id="docType" value={docType} onChange={(e) => setDocType(e.target.value)}>
                {DOC_TYPES.map((v) => <option key={v} value={v}>{t(`documents.types.${v}`)}</option>)}
              </Select>
            </Field>
            <Field label={t('documents.file')} htmlFor="docFile" hint={t('documents.fileHint')}>
              <input
                id="docFile"
                ref={fileRef}
                type="file"
                accept="application/pdf,image/*"
                className="w-full text-xs text-neutral-600 dark:text-neutral-300 file:mr-3 file:rounded-full file:border-0 file:bg-neutral-100 dark:file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-neutral-800 dark:file:text-neutral-100 cursor-pointer"
              />
            </Field>
            <Field label={t('documents.displayName')} htmlFor="filename" hint={t('common.optional')}>
              <Input id="filename" value={filename} onChange={(e) => setFilename(e.target.value)} placeholder={t('documents.types.AADHAAR')} />
            </Field>
            <Field label={t('documents.authority')} htmlFor="authority" hint={t('common.optional')}>
              <Input id="authority" value={authority} onChange={(e) => setAuthority(e.target.value)} placeholder="UIDAI" />
            </Field>
            <Field label={t('documents.issueDate')} htmlFor="issueDate">
              <Input id="issueDate" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </Field>
            <Field label={t('documents.expiryDate')} htmlFor="expiryDate" hint={t('documents.expiryHint')}>
              <Input id="expiryDate" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </Field>
            <div className="sm:col-span-2 flex items-center gap-3 pt-2">
              <Button type="submit" variant="accent" loading={uploading}>
                <Upload size={15} />
                {t('documents.save')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => { playClick(); setActiveTab('locker'); }}
              >
                {t('common.cancel') || 'Cancel'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  )
}
