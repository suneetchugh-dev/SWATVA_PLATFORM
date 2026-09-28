import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Trash2, X } from 'lucide-react'
import { playClick } from '../utils/soundFx'
import { Button, Spinner } from './ui'

export default function ClearDocumentsModal({ isOpen, count, onClose, onConfirm, loading }) {
  const { t } = useTranslation()

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.documentElement.classList.add('lightbox-active')
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.documentElement.classList.remove('lightbox-active')
    }
  }, [isOpen, onClose, loading])

  if (!isOpen) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="clear-docs-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          playClick()
          onClose()
        }
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#121216] border border-neutral-200 dark:border-white/10 shadow-2xl p-5 sm:p-6 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Subtle danger background aura */}
        <div
          aria-hidden="true"
          className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-red-500/10 blur-2xl pointer-events-none"
        />

        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            playClick()
            onClose()
          }}
          disabled={loading}
          aria-label={t('common.close') || 'Close'}
          className="absolute top-4 right-4 p-1.5 rounded-full text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-40"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <Trash2 size={20} className="stroke-[2.2]" />
          </div>

          <div className="flex-1 min-w-0 pr-4">
            <h3 id="clear-docs-title" className="text-sm sm:text-base font-bold text-neutral-950 dark:text-white">
              {t('documents.removeAllTitle') || 'Remove all uploaded documents?'}
            </h3>
            <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              {t('documents.removeAllDesc', { count }) ||
                `This will permanently delete all ${count} documents from your Document Locker. This action cannot be undone.`}
            </p>
          </div>
        </div>

        {/* Warning callout */}
        <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
          <AlertTriangle size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="text-[11px] leading-tight">
            {t('documents.removeAllWarning') ||
              'Any scheme eligibility calculations relying on these documents may require re-verification.'}
          </span>
        </div>

        {/* Modal Actions */}
        <div className="mt-6 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              playClick()
              onClose()
            }}
            disabled={loading}
          >
            {t('documents.removeAllCancel') || t('common.cancel') || 'Cancel'}
          </Button>

          <button
            type="button"
            onClick={() => {
              playClick()
              onConfirm()
            }}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Spinner className="h-3.5 w-3.5 text-white" />
                <span>{t('documents.removingAll') || 'Removing...'}</span>
              </>
            ) : (
              <>
                <Trash2 size={13} className="stroke-[2.2]" />
                <span>{t('documents.removeAllConfirm') || 'Yes, remove all'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
