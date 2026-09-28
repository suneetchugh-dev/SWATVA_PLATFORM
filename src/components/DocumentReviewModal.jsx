import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  FileText,
  HelpCircle,
  Lightbulb,
  ShieldAlert,
  UploadCloud,
  X,
} from 'lucide-react'
import { playClick } from '../utils/soundFx'
import { Button, Card, cx } from './ui'

export default function DocumentReviewModal({ doc, isOpen, onClose, onReupload }) {
  const { t } = useTranslation()

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.documentElement.classList.add('lightbox-active')
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.documentElement.classList.remove('lightbox-active')
    }
  }, [isOpen, onClose])

  if (!isOpen || !doc) return null

  const metadata = doc.extractedMetadata || {}
  const validityCheck = metadata.validityCheck || {}
  const additionalFields = metadata.additionalFields || {}

  // Determine specific issue reason
  const rawError = additionalFields.error || validityCheck.message
  const matchedRule = validityCheck.matchedRule && validityCheck.matchedRule !== 'N/A' ? validityCheck.matchedRule : null
  const confidence = typeof metadata.overallConfidence === 'number'
    ? Math.round(metadata.overallConfidence * 100)
    : null

  const issueText = rawError
    || (matchedRule ? `Rule check: ${matchedRule}` : null)
    || t('documents.reviewDefaultIssue')

  // Check extracted field statuses
  const fields = [
    {
      label: t('documents.authority'),
      val: doc.issuingAuthority || metadata.issuingAuthority?.value,
      missing: !(doc.issuingAuthority || metadata.issuingAuthority?.value),
    },
    {
      label: t('documents.issueDate'),
      val: doc.issueDate || metadata.issueDate?.value,
      missing: !(doc.issueDate || metadata.issueDate?.value),
    },
    {
      label: t('documents.expiryDate'),
      val: doc.expiryDate || metadata.expiryDate?.value,
      missing: false,
    },
  ]

  const content = (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
    >
      <div className="relative w-full max-w-lg max-h-[92dvh] overflow-y-auto custom-scrollbar bg-white/95 dark:bg-[#0c0c0e] border border-neutral-200/90 dark:border-white/15 rounded-2xl sm:rounded-3xl shadow-[0_24px_64px_rgba(0,0,0,0.6)] backdrop-blur-2xl animate-in zoom-in-95 duration-250 p-5 sm:p-7 font-sans">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            playClick()
            onClose()
          }}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 dark:hover:bg-white/20 transition cursor-pointer"
          aria-label={t('common.close') || 'Close'}
        >
          <X size={15} />
        </button>

        {/* Header */}
        <div className="border-b border-neutral-200/80 dark:border-white/10 pb-4 mb-5 pr-8">
          <div className="flex items-center space-x-2.5 mb-1.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0 shadow-xs">
              <ShieldAlert size={18} className="text-amber-600 dark:text-amber-400 stroke-[2.2]" />
            </div>
            <div>
              <h2
                id="review-modal-title"
                className="text-base sm:text-lg font-bold tracking-tight text-neutral-950 dark:text-white"
              >
                {t('documents.reviewModalTitle')}
              </h2>
              <span className="text-[11px] font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold">
                {t('status.NEEDS_REVIEW')}
              </span>
            </div>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {t('documents.reviewModalSubtitle')}
          </p>
        </div>

        {/* Document Info Pill */}
        <div className="mb-4 rounded-xl p-3 bg-neutral-100/70 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={16} className="text-neutral-500 dark:text-neutral-400 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-neutral-900 dark:text-white truncate">
                {doc.documentTypeName ?? doc.documentType}
              </p>
              {doc.filename ? (
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                  {doc.filename}
                </p>
              ) : null}
            </div>
          </div>
          {confidence !== null && (
            <div className="shrink-0 text-right">
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block">{t('documents.reviewConfidence')}</span>
              <span className={cx('font-mono font-semibold', confidence > 60 ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-600 dark:text-neutral-300')}>
                {confidence}%
              </span>
            </div>
          )}
        </div>

        {/* Primary Issue Alert Card */}
        <div className="mb-5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-300">
                {t('documents.reviewDetectedIssue')}
              </p>
              <p className="mt-1 text-neutral-700 dark:text-neutral-200 leading-relaxed">
                {issueText}
              </p>
            </div>
          </div>
        </div>

        {/* Field Status Checklist */}
        <div className="mb-5">
          <h3 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
            {t('documents.reviewFieldsStatus')}
          </h3>
          <div className="grid gap-2">
            {fields.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-200/80 dark:border-white/10 bg-white/50 dark:bg-white/[0.02] text-xs"
              >
                <span className="text-neutral-600 dark:text-neutral-400">{f.label}</span>
                <span
                  className={cx(
                    'font-medium',
                    f.missing
                      ? 'text-amber-600 dark:text-amber-400 flex items-center gap-1'
                      : 'text-neutral-900 dark:text-white'
                  )}
                >
                  {f.missing ? (
                    <>
                      <HelpCircle size={12} />
                      {t('common.notDetected') || 'Not detected'}
                    </>
                  ) : (
                    f.val
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* How to Resolve Tips */}
        <div className="mb-6 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.02] p-3.5 text-xs">
          <div className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-white mb-2">
            <Lightbulb size={14} className="text-amber-500" />
            <span>{t('documents.reviewHowToFix')}</span>
          </div>
          <ul className="space-y-1.5 text-neutral-600 dark:text-neutral-300 pl-4 list-disc marker:text-amber-500">
            <li>{t('documents.reviewFixTip1')}</li>
            <li>{t('documents.reviewFixTip2')}</li>
            <li>{t('documents.reviewFixTip3')}</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-neutral-200/80 dark:border-white/10">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              playClick()
              onClose()
            }}
            className="w-full sm:w-auto"
          >
            {t('common.close') || 'Close'}
          </Button>
          {onReupload && (
            <Button
              type="button"
              variant="accent"
              size="sm"
              onClick={() => {
                playClick()
                onReupload(doc)
              }}
              className="w-full sm:w-auto"
            >
              <UploadCloud size={14} />
              {t('documents.reviewReupload')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
