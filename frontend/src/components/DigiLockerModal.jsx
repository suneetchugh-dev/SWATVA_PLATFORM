import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  FileText,
  Info,
  Lock,
  RefreshCw,
  Shield,
  ShieldCheck,
  X,
} from 'lucide-react'
import { Badge, Button, Card, Spinner, cx } from './ui'
import { playClick } from '../utils/soundFx'
import { api } from '../api/client'

/**
 * Standard simulated UIDAI & state issuer credential templates for the DigiLocker sandbox.
 */
const SANDBOX_CREDENTIALS = [
  {
    id: 'aadhaar',
    documentType: 'AADHAAR',
    title: 'Aadhaar Card (e-Aadhaar)',
    issuer: 'Unique Identification Authority of India (UIDAI)',
    docNumber: 'XXXX-XXXX-4819',
    issueDate: '2018-06-15',
    expiryDate: null,
    metadata: {
      fullName: 'Suneet Chugh',
      dob: '2002-04-12',
      gender: 'MALE',
      address: 'House No. 42, Sector 14, Ranchi, Jharkhand - 834001',
      issuingAuthority: 'UIDAI / DigiLocker Certified',
      verificationStatus: 'VERIFIED',
    },
  },
  {
    id: 'income',
    documentType: 'INCOME_CERTIFICATE',
    title: 'Annual Income Certificate',
    issuer: 'Department of Revenue, Govt. of Jharkhand',
    docNumber: 'JH/INC/2026/094812',
    issueDate: '2026-04-10',
    expiryDate: '2027-03-31',
    metadata: {
      annualIncome: 180000,
      financialYear: '2025-2026',
      issuingAuthority: 'Sub-Divisional Magistrate (SDM), Ranchi',
      verificationStatus: 'VERIFIED',
    },
  },
  {
    id: 'caste',
    documentType: 'CASTE_CERTIFICATE',
    title: 'OBC Social Category Certificate',
    issuer: 'Department of Social Welfare, Govt. of Jharkhand',
    docNumber: 'JH/OBC/2023/582910',
    issueDate: '2023-08-20',
    expiryDate: null,
    metadata: {
      category: 'OBC',
      casteName: 'Kudmi',
      issuingAuthority: 'District Magistrate, Ranchi',
      verificationStatus: 'VERIFIED',
    },
  },
  {
    id: 'education',
    documentType: 'EDUCATION_CERTIFICATE',
    title: 'Secondary School Certificate (Class X)',
    issuer: 'Jharkhand Academic Council (JAC)',
    docNumber: 'JAC/10TH/2018/748192',
    issueDate: '2018-05-28',
    expiryDate: null,
    metadata: {
      passingYear: '2018',
      percentage: '84.6%',
      issuingAuthority: 'Secretary, Jharkhand Academic Council',
      verificationStatus: 'VERIFIED',
    },
  },
]

export default function DigiLockerModal({ isOpen, onClose, onDocumentImported }) {
  const { t, i18n } = useTranslation()
  const isHindi = i18n.language === 'hi'

  const [step, setStep] = useState('select') // 'select' | 'authorizing' | 'success'
  const [selectedCreds, setSelectedCreds] = useState(new Set(['aadhaar']))
  const [importing, setImporting] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const [errorMsg, setErrorMsg] = useState(null)

  if (!isOpen) return null

  const toggleCredential = (id) => {
    playClick()
    setSelectedCreds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        if (next.size > 1) next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleStartAuthorization = () => {
    playClick()
    setErrorMsg(null)
    setStep('authorizing')

    // Simulate authentic OAuth token exchange & cryptographic signature verification
    setTimeout(async () => {
      try {
        setImporting(true)
        const credsToImport = SANDBOX_CREDENTIALS.filter((c) => selectedCreds.has(c.id))
        let count = 0

        for (const cred of credsToImport) {
          const payload = {
            documentType: cred.documentType,
            filename: `${cred.title}.json`,
            issuingAuthority: cred.issuer,
            issueDate: cred.issueDate,
            expiryDate: cred.expiryDate,
            storageKey: `digilocker-sandbox/${cred.id}-${Date.now()}`,
          }

          try {
            await api.documents.register(payload)
            count++
          } catch (e) {
            console.warn('Failed to register DigiLocker doc:', e)
          }
        }

        setImportedCount(count)
        setStep('success')
        if (onDocumentImported) {
          onDocumentImported()
        }
      } catch (err) {
        setErrorMsg(isHindi ? 'दस्तावेज़ आयात करने में समस्या आई।' : 'Failed to import documents from DigiLocker sandbox.')
        setStep('select')
      } finally {
        setImporting(false)
      }
    }, 1500)
  }

  const handleResetAndClose = () => {
    playClick()
    setStep('select')
    setErrorMsg(null)
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="digilocker-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-neutral-950/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900 shadow-2xl">
        {/* Header with DigiLocker Theme */}
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-white/10 bg-neutral-50/80 dark:bg-white/[0.03] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="digilocker-title" className="text-sm font-bold text-neutral-900 dark:text-white">
                  {isHindi ? 'डिजीलॉकर सत्यापन' : 'DigiLocker Verification'}
                </h2>
                <Badge tone="neutral" className="text-[10px] font-semibold tracking-wide">
                  {isHindi ? 'सैंडबॉक्स डेमो' : 'Sandbox Demo'}
                </Badge>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {isHindi ? 'राष्ट्रीय डिजिटल लॉकर प्रणाली (आईटी अधिनियम धारा 9A)' : 'National Digital Locker System (IT Act Sec 9A)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Disclaimer Note */}
        <div className="flex items-start gap-2.5 border-b border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20 px-5 py-3 text-xs text-blue-800 dark:text-blue-300">
          <Info size={15} className="shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            {isHindi
              ? 'प्रोटोटाइप सैंडबॉक्स मोड: यह सिमुलेशन वास्तविक सरकारी गेटवे क्रेडेंशियल्स के बिना यूआईडीएआई-हस्ताक्षरित डिजिटल क्रेडेंशियल आयात का प्रदर्शन करता है।'
              : 'Prototype Sandbox Mode: This sandbox environment demonstrates instant UIDAI-signed digital credential exchange without requiring live government gateway credentials.'}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 max-h-[65vh] overflow-y-auto">
          {errorMsg && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-400">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 'select' && (
            <div>
              <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-3">
                {isHindi ? 'आयात करने के लिए जारी किए गए प्रमाणपत्र चुनें:' : 'Select issued credentials to fetch into your locker:'}
              </p>

              <div className="space-y-2.5">
                {SANDBOX_CREDENTIALS.map((cred) => {
                  const isChecked = selectedCreds.has(cred.id)
                  return (
                    <div
                      key={cred.id}
                      onClick={() => toggleCredential(cred.id)}
                      className={cx(
                        'flex items-start gap-3 rounded-xl p-3.5 border transition-all cursor-pointer select-none',
                        isChecked
                          ? 'border-blue-500 bg-blue-50/40 dark:border-blue-500/50 dark:bg-blue-950/20'
                          : 'border-neutral-200 dark:border-white/10 hover:border-neutral-300 dark:hover:border-white/20 bg-white dark:bg-neutral-900'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                            {cred.title}
                          </p>
                          <Badge tone="emerald" className="text-[10px] shrink-0 font-medium">
                            {isHindi ? 'यूआईडीएआई सत्यापित' : 'Verified'}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                          {cred.issuer}
                        </p>
                        <p className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 mt-1">
                          Doc: {cred.docNumber}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-5 flex items-center justify-between gap-3 pt-3 border-t border-neutral-200 dark:border-white/10">
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  {selectedCreds.size}{' '}
                  {isHindi ? 'दस्तावेज़ चुने गए' : 'document(s) selected'}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={handleResetAndClose}>
                    {isHindi ? 'रद्द करें' : 'Cancel'}
                  </Button>
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={handleStartAuthorization}
                    disabled={selectedCreds.size === 0}
                  >
                    <ShieldCheck size={14} />
                    {isHindi ? 'सत्यापित करें और आयात करें' : 'Authorize & Fetch'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 'authorizing' && (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                <Spinner size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-neutral-900 dark:text-white">
                  {isHindi ? 'डिजीलॉकर से सुरक्षित रूप से कनेक्ट हो रहा है...' : 'Exchanging secure token with DigiLocker...'}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm">
                  {isHindi
                    ? 'यूआईडीएआई और राज्य बोर्डों से जारी किए गए प्रमाणपत्रों के डिजिटल हस्ताक्षर सत्यापित किए जा रहे हैं।'
                    : 'Validating cryptographic digital certificates issued by UIDAI and state departments.'}
                </p>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <p className="text-sm font-bold text-neutral-900 dark:text-white">
                  {isHindi ? 'दस्तावेज़ सफलतापूर्वक लॉकर में जोड़े गए' : 'Credentials Successfully Imported'}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm">
                  {isHindi
                    ? `${importedCount} सत्यापित डिजिटल प्रमाणपत्र आपके सुरक्षित लॉकर में पंजीकृत किए गए हैं।`
                    : `${importedCount} verified credentials have been registered in your private Document Locker with zero OCR errors.`}
                </p>
              </div>
              <Button variant="accent" size="sm" onClick={handleResetAndClose} className="mt-2">
                <CheckCircle2 size={14} />
                {isHindi ? 'मेरे लॉकर में देखें' : 'View in My Locker'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
