import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, FileStack, Info, Plus, Trash2, Upload } from 'lucide-react'
import { api } from '../api/client'
import DocumentReviewModal from '../components/DocumentReviewModal'
import ClearDocumentsModal from '../components/ClearDocumentsModal'
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

/**
 * Single-instance document types: Only one active document of these types
 * is maintained per citizen. Uploading a new one replaces the existing record.
 * Multi-instance types (e.g. Education Certificates, Electricity Bills, Income/Caste renewals)
 * allow multiple active entries.
 */
const SINGLE_INSTANCE_DOC_TYPES = new Set([
  'AADHAAR',
  'RATION_CARD',
  'BANK_ACCOUNT',
  'RESIDENCE_PROOF',
])

/**
 * Per-document-type field visibility rules.
 * showIssue  — whether to show the "Issue date" field
 * showExpiry — whether to show the "Expiry date" field
 * showAuthority — whether to show "Issuing authority"
 *
 * Aadhaar never expires under UIDAI rules (as of 2023); Ration Cards and Bank
 * passbooks do not have a formal expiry; Electricity bills are point-in-time.
 */
const DOC_FIELD_CONFIG = {
  AADHAAR:               { showIssue: true,  showExpiry: false, showAuthority: true  },
  INCOME_CERTIFICATE:    { showIssue: true,  showExpiry: true,  showAuthority: true  },
  CASTE_CERTIFICATE:     { showIssue: true,  showExpiry: true,  showAuthority: true  },
  RATION_CARD:           { showIssue: true,  showExpiry: false, showAuthority: true  },
  RESIDENCE_PROOF:       { showIssue: true,  showExpiry: true,  showAuthority: true  },
  BANK_ACCOUNT:          { showIssue: false, showExpiry: false, showAuthority: true  },
  ELECTRICITY_CONNECTION:{ showIssue: true,  showExpiry: false, showAuthority: true  },
  EDUCATION_CERTIFICATE: { showIssue: true,  showExpiry: false, showAuthority: true  },
  OFFICIAL_ID:           { showIssue: true,  showExpiry: true,  showAuthority: true  },
  OTHER:                 { showIssue: true,  showExpiry: true,  showAuthority: true  },
}

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
])

const ALLOWED_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png', 'webp'])

function isValidDocumentFile(file) {
  if (!file) return false
  if (file.type && ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
    return true
  }
  const ext = file.name?.split('.').pop()?.toLowerCase()
  if (ext && ALLOWED_EXTENSIONS.has(ext)) {
    return true
  }
  return false
}

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

/** Convert a date string like "DD/MM/YYYY" or ISO to YYYY-MM-DD for input[type=date]. */
function toInputDate(raw) {
  if (!raw) return ''
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  // DD/MM/YYYY
  const m = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return ''
}

export default function Documents() {
  const { t } = useTranslation()
  const [docs, setDocs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [activeTab, setActiveTab] = useState('locker') // 'locker' | 'add'
  const [selectedReviewDoc, setSelectedReviewDoc] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [isClearModalOpen, setIsClearModalOpen] = useState(false)
  const [clearingAll, setClearingAll] = useState(false)

  const [docType, setDocType] = useState('AADHAAR')
  const [filename, setFilename] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [authority, setAuthority] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  // When doc type changes, clear dates/authority that don't apply
  const handleDocTypeChange = (newType) => {
    setDocType(newType)
    const cfg = DOC_FIELD_CONFIG[newType] ?? DOC_FIELD_CONFIG.OTHER
    if (!cfg.showIssue) setIssueDate('')
    if (!cfg.showExpiry) setExpiryDate('')
  }

  const fieldCfg = DOC_FIELD_CONFIG[docType] ?? DOC_FIELD_CONFIG.OTHER
  const isSingleInstance = SINGLE_INSTANCE_DOC_TYPES.has(docType)
  const existingSingleDoc = isSingleInstance
    ? docs?.find((d) => d.documentType === docType)
    : null

  const load = () => {
    setLoading(true)
    api.documents
      .list()
      .then((d) => setDocs(d ?? []))
      .catch((err) => setError(err?.message || t('documents.loadError')))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  /** When a file is chosen, infer the doc type from the filename and pre-fill the display name.
   *  Actual upload happens only when the user clicks "Save document" so they can review first. */
  const handleFileChange = () => {
    setError(null)
    const file = fileRef.current?.files?.[0]
    if (!file) {
      setSelectedFile(null)
      return
    }

    // MIME type & format validation guard
    if (!isValidDocumentFile(file)) {
      setError(t('documents.invalidFileType') || 'Invalid file format. Only PDF and image files (JPG, PNG, WebP) are supported.')
      if (fileRef.current) fileRef.current.value = ''
      setSelectedFile(null)
      return
    }

    // Size limit guard: 10MB
    if (file.size > 10 * 1024 * 1024) {
      setError(t('documents.fileTooLarge') || 'File size exceeds the 10MB limit.')
      if (fileRef.current) fileRef.current.value = ''
      setSelectedFile(null)
      return
    }

    setSelectedFile(file)

    // Auto-fill display name from filename (strip extension)
    if (!filename) {
      setFilename(file.name.replace(/\.[^.]+$/, ''))
    }

    // Infer document type from filename keywords
    const lc = file.name.toLowerCase()
    if (lc.includes('aadhaar') || lc.includes('aadhar')) handleDocTypeChange('AADHAAR')
    else if (lc.includes('income')) handleDocTypeChange('INCOME_CERTIFICATE')
    else if (lc.includes('caste')) handleDocTypeChange('CASTE_CERTIFICATE')
    else if (lc.includes('ration')) handleDocTypeChange('RATION_CARD')
    else if (lc.includes('bank') || lc.includes('passbook')) handleDocTypeChange('BANK_ACCOUNT')
    else if (lc.includes('electric')) handleDocTypeChange('ELECTRICITY_CONNECTION')
    else if (lc.includes('edu') || lc.includes('marksheet') || lc.includes('degree')) handleDocTypeChange('EDUCATION_CERTIFICATE')
  }

  const register = async (event) => {
    event.preventDefault()
    setError(null)
    const file = fileRef.current?.files?.[0] || selectedFile
    if (!file) {
      setError(t('documents.fileRequired') || 'A document file is required. Please choose a PDF or image file before saving.')
      return
    }

    if (!isValidDocumentFile(file)) {
      setError(t('documents.invalidFileType') || 'Invalid file format. Only PDF and image files (JPG, PNG, WebP) are supported.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError(t('documents.fileTooLarge') || 'File size exceeds the 10MB limit.')
      return
    }

    const isSingleInstance = SINGLE_INSTANCE_DOC_TYPES.has(docType)
    const existingSingleDoc = isSingleInstance
      ? docs?.find((d) => d.documentType === docType)
      : null

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('documentType', docType)
      fd.append('file', file)
      fd.append('filename', filename.trim() || file.name)
      if (issueDate) fd.append('issueDate', issueDate)
      if (expiryDate) fd.append('expiryDate', expiryDate)
      if (authority.trim()) fd.append('issuingAuthority', authority.trim())
      await api.documents.upload(fd)

      // If replacing an existing single-instance document, clean up the superseded document
      if (existingSingleDoc) {
        try {
          await api.documents.delete(existingSingleDoc.id)
        } catch (cleanupErr) {
          console.warn('Failed to prune superseded document:', cleanupErr)
        }
      }

      playClick()
      setFilename('')
      setIssueDate('')
      setExpiryDate('')
      setAuthority('')
      setSelectedFile(null)
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

  const handleRemoveAll = async () => {
    if (!docs || docs.length === 0) return
    setError(null)
    setClearingAll(true)
    try {
      await Promise.all(docs.map((d) => api.documents.delete(d.id)))
      setIsClearModalOpen(false)
      load()
    } catch (err) {
      setError(err?.message || t('documents.deleteError'))
    } finally {
      setClearingAll(false)
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
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 px-1">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  {t('documents.uploadedCount', { count: docCount })}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    playClick()
                    setIsClearModalOpen(true)
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors cursor-pointer"
                >
                  <Trash2 size={13} className="stroke-[2.2]" />
                  <span>{t('documents.removeAll') || 'Remove all documents'}</span>
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
              {docs.map((d) => {
                const expired = isExpired(d.expiryDate)
                const style = STATUS_STYLES[d.status] ?? STATUS_STYLES.ACTIVE
                return (
                  <Card key={d.id} className="p-4 flex flex-col min-w-0 overflow-hidden">
                    <div className="flex items-start justify-between gap-3 min-w-0">
                      <div className="min-w-0 flex-1">
                        {d.status === 'NEEDS_REVIEW' ? (
                          <button
                            type="button"
                            onClick={() => {
                              playClick()
                              setSelectedReviewDoc(d)
                            }}
                            className="mono-badge inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 border border-dashed border-amber-500/70 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 hover:border-amber-500 transition-all cursor-pointer group text-left"
                            title={t('documents.clickToReview')}
                            aria-label={`${t('status.NEEDS_REVIEW')} - ${t('documents.clickToReview')}`}
                          >
                            <AlertTriangle size={11} className="shrink-0 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
                            <span className="font-semibold underline decoration-dotted decoration-amber-500/60 underline-offset-2">
                              {t(`status.${d.status}`)}
                            </span>
                            <span className="text-[10px] opacity-80 font-normal">
                              • {t('documents.clickToReview')}
                            </span>
                          </button>
                        ) : (
                          <span className={cx('mono-badge inline-block rounded px-2 py-1 border', style)}>
                            {t(`status.${d.status ?? 'ACTIVE'}`)}
                          </span>
                        )}
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
            {/* Single-instance replacement notice */}
            {existingSingleDoc && (
              <div className="sm:col-span-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 text-xs flex items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                  <Info size={16} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5 sm:mt-0" />
                  <div className="min-w-0">
                    <p className="font-semibold leading-tight">
                      {t('documents.replaceNotice', {
                        type: t(`documents.types.${docType}`),
                        existing: existingSingleDoc.filename || t(`documents.types.${docType}`),
                      })}
                    </p>
                    <p className="mt-0.5 text-[11px] text-amber-700/90 dark:text-amber-300/80 leading-normal">
                      {t('documents.singleInstanceHint')}
                    </p>
                  </div>
                </div>
                <Badge tone="amber" className="shrink-0 text-[10px] uppercase font-bold tracking-wide">
                  {t('documents.willReplace')}
                </Badge>
              </div>
            )}

            {/* Document type — changing this updates placeholder + visible fields */}
            <Field label={t('documents.type')} htmlFor="docType" required>
              <Select id="docType" value={docType} onChange={(e) => handleDocTypeChange(e.target.value)}>
                {DOC_TYPES.map((v) => {
                  const isSingle = SINGLE_INSTANCE_DOC_TYPES.has(v)
                  const hasExisting = isSingle && docs?.some((d) => d.documentType === v)
                  return (
                    <option key={v} value={v}>
                      {t(`documents.types.${v}`)}
                      {hasExisting ? ` — (${t('documents.willReplace') || 'Replaces existing'})` : ''}
                    </option>
                  )
                })}
              </Select>
            </Field>

            {/* File — infers type+name from filename on selection */}
            <Field label={t('documents.file')} htmlFor="docFile" hint={t('documents.fileHint')} required>
              <input
                id="docFile"
                ref={fileRef}
                type="file"
                required
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="w-full text-xs text-neutral-600 dark:text-neutral-300 file:mr-3 file:rounded-full file:border-0 file:bg-neutral-100 dark:file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-neutral-800 dark:file:text-neutral-100 cursor-pointer"
              />
            </Field>

            {/* Display name — placeholder reflects the selected document type */}
            <Field label={t('documents.displayName')} htmlFor="filename" hint={t('common.optional')}>
              <Input
                id="filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder={t(`documents.types.${docType}`)}
              />
            </Field>

            {/* Issuing authority */}
            {fieldCfg.showAuthority && (
              <Field label={t('documents.authority')} htmlFor="authority" hint={t('common.optional')}>
                <Input
                  id="authority"
                  value={authority}
                  onChange={(e) => setAuthority(e.target.value)}
                  placeholder={
                    docType === 'AADHAAR' ? 'UIDAI'
                    : docType === 'INCOME_CERTIFICATE' || docType === 'CASTE_CERTIFICATE' ? 'District Magistrate'
                    : docType === 'EDUCATION_CERTIFICATE' ? 'Board / University'
                    : 'Issuing authority'
                  }
                />
              </Field>
            )}

            {/* Issue date — hidden for Bank Account (no formal issue date) */}
            {fieldCfg.showIssue && (
              <Field label={t('documents.issueDate')} htmlFor="issueDate" hint={t('common.optional')}>
                <Input id="issueDate" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              </Field>
            )}

            {/* Expiry date — hidden for Aadhaar, Ration Card, Bank Account, Electricity, Education */}
            {fieldCfg.showExpiry && (
              <Field label={t('documents.expiryDate')} htmlFor="expiryDate" hint={t('documents.expiryHint')}>
                <Input id="expiryDate" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
              </Field>
            )}

            <div className="sm:col-span-2 flex items-center gap-3 pt-2">
              <Button type="submit" variant="accent" loading={uploading} disabled={uploading || !selectedFile}>
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

      {/* Verification Review Modal */}
      <DocumentReviewModal
        doc={selectedReviewDoc}
        isOpen={Boolean(selectedReviewDoc)}
        onClose={() => setSelectedReviewDoc(null)}
        onReupload={(doc) => {
          setSelectedReviewDoc(null)
          if (doc.documentType) {
            handleDocTypeChange(doc.documentType)
          }
          setActiveTab('add')
        }}
      />

      {/* Clear All Documents Modal */}
      <ClearDocumentsModal
        isOpen={isClearModalOpen}
        count={docCount}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleRemoveAll}
        loading={clearingAll}
      />
    </div>
  )
}
