import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, Camera, Check, ChevronLeft, ChevronRight, Pencil, Trash2, UserRound, Wand2, X } from 'lucide-react'
import { api, getStoredUser, setStoredUser } from '../api/client'
import { playClick } from '../utils/soundFx'
import { getLocalizedUserName } from '../utils/userDisplay'

import { INDIAN_STATES } from '../lib/india'
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
import { PageTourButton } from '../components/GuidedTour'

/**
 * Progressive intake. Broken into steps so a citizen on a phone can stop after
 * the first question and come back. Everything except age and state is
 * optional, and the backend treats a missing field as missing-information
 * rather than as a rejection — so an incomplete profile is a valid state, not
 * an error.
 */

const STEPS = [
  { id: 'basics', titleKey: 'basicsTitle', hintKey: 'basicsHint' },
  { id: 'income', titleKey: 'incomeTitle', hintKey: 'incomeHint' },
  { id: 'household', titleKey: 'householdTitle', hintKey: 'householdHint' },
  { id: 'family', titleKey: 'familyTitle', hintKey: 'familyHint' },
]

// Enum values below are copied from the backend. Jackson rejects unknown enum
// constants with a 400, so do not add a label here without adding the constant:
//   SocialCategory     src/main/java/in/sahayak/user/model/enums/SocialCategory.java
//   Gender             .../Gender.java
//   DisabilityStatus   .../DisabilityStatus.java
//   FamilyRelationship .../FamilyRelationship.java
// Only `value` is sent to the backend and it must stay verbatim — Jackson
// rejects an unknown enum constant. Labels are free to be translated.
const CATEGORY_VALUES = ['', 'GENERAL', 'OBC', 'SC', 'ST', 'EWS', 'OTHER']
const GENDER_VALUES = ['', 'FEMALE', 'MALE', 'OTHER', 'PREFER_NOT_TO_SAY']
const DISABILITY_VALUES = ['', 'NONE', 'PERSON_WITH_DISABILITY', 'NOT_DISCLOSED']
const RELATIONSHIP_VALUES = ['SPOUSE', 'CHILD', 'PARENT', 'GRANDPARENT', 'SIBLING', 'OTHER']

// Human labels for the social categories, which the backend does not name.
const CATEGORY_LABELS = {
  GENERAL: 'options.general',
  OBC: 'options.obc',
  SC: 'options.sc',
  ST: 'options.st',
  EWS: 'options.ews',
  OTHER: 'options.other',
}

const GENDER_LABELS = {
  FEMALE: 'options.female',
  MALE: 'options.male',
  OTHER: 'options.other',
  PREFER_NOT_TO_SAY: 'options.preferNotToSay',
}
const DISABILITY_LABELS = { NONE: 'options.noDisability', PERSON_WITH_DISABILITY: 'options.personWithDisability', NOT_DISCLOSED: 'options.preferNotToSay' }
const RELATIONSHIP_LABELS = {
  SPOUSE: 'options.spouse', CHILD: 'options.child', PARENT: 'options.parent',
  GRANDPARENT: 'options.grandparent', SIBLING: 'options.sibling', OTHER: 'options.other',
}

const toNum = (v) => (v === '' || v == null ? null : Number(v))

/**
 * Resolve an option label. A label is an i18n key or literal string.
 */
function useOptionLabels() {
  const { t } = useTranslation()
  return (value, table) => {
    if (value === '') return t('profile.options.notSpecified')
    const keyOrLabel = table[value]
    if (!keyOrLabel) return value
    if (keyOrLabel.startsWith('options.')) {
      return t(`profile.${keyOrLabel}`, { defaultValue: value })
    }
    return t(`profile.${keyOrLabel}`, { defaultValue: keyOrLabel })
  }
}

function ProfileHealthGauge({ percentage = 0, isHindi = false }) {
  const radius = 20
  const stroke = 3.5
  const normalizedRadius = radius - stroke / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  const statusLabel =
    percentage === 100
      ? (isHindi ? 'पूर्ण प्रोफ़ाइल' : 'Complete')
      : percentage >= 60
      ? (isHindi ? 'मजबूत' : 'Strong')
      : percentage > 0
      ? (isHindi ? 'प्रगति पर' : 'In Progress')
      : (isHindi ? 'शुरू नहीं' : 'Not Started')

  return (
    <div className="flex items-center gap-3 select-none">
      <div className="text-right hidden sm:block">
        <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400 dark:text-neutral-500 block leading-tight">
          {isHindi ? 'प्रोफ़ाइल स्वास्थ्य' : 'Profile Health'}
        </span>
        <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          {statusLabel}
        </span>
      </div>

      <div className="relative inline-flex items-center justify-center shrink-0">
        <svg height={radius * 2 + stroke} width={radius * 2 + stroke} className="rotate-[-90deg]">
          {/* Background Track */}
          <circle
            stroke="currentColor"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius + stroke / 2}
            cy={radius + stroke / 2}
            className="text-neutral-200 dark:text-white/10"
          />
          {/* Progress Indicator */}
          <circle
            stroke="currentColor"
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius + stroke / 2}
            cy={radius + stroke / 2}
            className={
              percentage === 100
                ? 'text-emerald-500'
                : percentage >= 60
                ? 'text-amber-500'
                : 'text-amber-600'
            }
          />
        </svg>
        <span className="absolute font-mono text-[10px] font-bold text-neutral-900 dark:text-white tracking-tight">
          {percentage}%
        </span>
      </div>
    </div>
  )
}

export default function Profile() {
  const { t, i18n } = useTranslation()
  const isHindi = i18n.language === 'hi'
  const label = useOptionLabels()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [toast, setToast] = useState({
    open: false,
    visible: false,
    title: '',
    body: '',
    tone: 'success', // 'success' | 'info' | 'warn' | 'error'
  })
  const toastTimerRef = useRef(null)
  const toastDismissTimerRef = useRef(null)

  const showToast = (title, body = '', tone = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    if (toastDismissTimerRef.current) clearTimeout(toastDismissTimerRef.current)

    setToast({ open: true, visible: false, title, body, tone })

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setToast((prev) => ({ ...prev, visible: true }))
      })
    })

    toastTimerRef.current = setTimeout(() => {
      dismissToast()
    }, 3800)
  }

  const dismissToast = () => {
    setToast((prev) => ({ ...prev, visible: false }))
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastDismissTimerRef.current = setTimeout(() => {
      setToast((prev) => (prev.visible ? prev : { ...prev, open: false }))
    }, 320)
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      if (toastDismissTimerRef.current) clearTimeout(toastDismissTimerRef.current)
    }
  }, [])

  const [form, setForm] = useState({
    age: '', income: '', state: '', district: '', occupation: '', education: '',
    category: '', gender: '', disabilityStatus: '',
  })
  const [family, setFamily] = useState([])
  const [currentUser, setCurrentUser] = useState(() => getStoredUser())
  const avatarInputRef = useRef(null)

  useEffect(() => {
    const handleProfileUpdate = () => {
      setCurrentUser(getStoredUser())
    }
    window.addEventListener('swatva-profile-updated', handleProfileUpdate)
    return () => window.removeEventListener('swatva-profile-updated', handleProfileUpdate)
  }, [])

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError(isHindi ? 'कृपया एक मान्य छवि फ़ाइल (PNG, JPG, WebP) चुनें।' : 'Please select a valid image file (PNG, JPG, WebP).')
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      setError(isHindi ? 'छवि का आकार 3MB से कम होना चाहिए।' : 'Image size must be less than 3MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      setStoredUser({ photoURL: dataUrl })
      setCurrentUser(getStoredUser())
      window.dispatchEvent(new Event('swatva-profile-updated'))
      playClick()
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveAvatar = (e) => {
    e.stopPropagation()
    setStoredUser({ photoURL: null })
    setCurrentUser(getStoredUser())
    window.dispatchEvent(new Event('swatva-profile-updated'))
    playClick()
  }

  useEffect(() => {
    let cancelled = false
    api.user
      .getMe()
      .then((data) => {
        if (cancelled) return
        const p = data?.profile
        if (p) {
          setForm({
            age: p.age ?? '', income: p.income ?? '', state: p.state ?? '',
            district: p.district ?? '', occupation: p.occupation ?? '',
            education: p.education ?? '', category: p.category ?? '',
            gender: p.gender ?? '', disabilityStatus: p.disabilityStatus ?? '',
          })
          setFamily(
            (p.familyMembers ?? []).map((m) => ({
              fullName: m.fullName ?? '', relationship: m.relationship ?? 'OTHER',
              age: m.age ?? '', gender: m.gender ?? '', annualIncome: m.annualIncome ?? '',
              occupation: m.occupation ?? '',
            })),
          )
        }
      })
      .catch((err) => !cancelled && setError(err?.message || t('profile.loadError')))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [])

  // Keyboard navigation for step wizard (ArrowLeft and ArrowRight)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept arrow keys if user is typing in an input, textarea, or select
      const tag = document.activeElement?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return

      if (e.key === 'ArrowLeft') {
        setStep((s) => {
          if (s > 0) {
            playClick()
            return s - 1
          }
          return s
        })
      } else if (e.key === 'ArrowRight') {
        setStep((s) => {
          if (s < STEPS.length - 1) {
            playClick()
            return s + 1
          }
          return s
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const set = (key) => (event) => {
    setSaved(false)
    setForm((f) => ({ ...f, [key]: event.target.value }))
  }

  const setMember = (i, key) => (event) => {
    setSaved(false)
    setFamily((list) => list.map((m, idx) => (idx === i ? { ...m, [key]: event.target.value } : m)))
  }

  const addMember = () => {
    setSaved(false)
    setFamily((list) => [...list, { fullName: '', relationship: 'SPOUSE', age: '', gender: '', annualIncome: '', occupation: '' }])
  }

  const removeMember = (i) => {
    setSaved(false)
    setFamily((list) => list.filter((_, idx) => idx !== i))
  }

  const payload = useMemo(
    () => ({
      age: toNum(form.age),
      income: toNum(form.income),
      state: form.state || null,
      district: form.district || null,
      occupation: form.occupation || null,
      education: form.education || null,
      category: form.category || null,
      gender: form.gender || null,
      disabilityStatus: form.disabilityStatus || null,
      familyMembers: family.map((m) => ({
        fullName: m.fullName.trim(),
        relationship: m.relationship,
        age: toNum(m.age),
        gender: m.gender || null,
        annualIncome: toNum(m.annualIncome),
        occupation: m.occupation || null,
      })),
    }),
    [form, family],
  )

  const save = async () => {
    if (saving) return
    playClick()
    setError(null)
    setSaving(true)
    try {
      await api.user.updateProfile(payload)
      setSaved(true)
      showToast(t('profile.savedTitle'), t('profile.savedBody'), 'success')
    } catch (err) {
      const msg = err?.message || t('profile.loadError')
      setError(msg)
      showToast(t('profile.errorTitle'), msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const [filling, setFilling] = useState(false)

  /** Auto-fill profile fields from uploaded documents (Aadhaar preferred) */
  const fillFromDocuments = async () => {
    if (filling) return
    setFilling(true)
    try {
      const docs = await api.documents.list()
      if (!docs?.length) {
        showToast(
          t('profile.autoFillNone'),
          isHindi ? 'लॉकर में कोई दस्तावेज़ नहीं मिले। कृपया पहले दस्तावेज़ अपलोड करें।' : 'No uploaded documents found in your locker.',
          'warn'
        )
        return
      }

      // Prefer Aadhaar; fall back to first available doc
      const aadhaar = docs.find((d) => d.documentType === 'AADHAAR') ?? docs[0]
      const extracted = await api.documents.extract(aadhaar.id)
      if (!extracted) {
        showToast(
          t('profile.autoFillNone'),
          isHindi ? 'दस्तावेज़ से कोई जानकारी नहीं मिली।' : 'No readable profile fields extracted from document.',
          'warn'
        )
        return
      }

      let changed = false
      setForm((f) => {
        const next = { ...f }

        // Age from dateOfBirth (YYYY-MM-DD or DD/MM/YYYY)
        if (extracted.dateOfBirth && !f.age) {
          try {
            const raw = extracted.dateOfBirth
            let year
            if (raw.includes('/')) {
              year = parseInt(raw.split('/')[2], 10)
            } else {
              year = parseInt(raw.split('-')[0], 10)
            }
            const age = new Date().getFullYear() - year
            if (age > 0 && age < 120) { next.age = String(age); changed = true }
          } catch { /* skip */ }
        }

        // Gender
        if (extracted.gender && !f.gender) {
          const g = extracted.gender.toUpperCase()
          if (['MALE', 'FEMALE', 'OTHER'].includes(g)) { next.gender = g; changed = true }
        }

        // State from address
        if (extracted.state && !f.state) {
          // Try to match against INDIAN_STATES list
          const match = INDIAN_STATES.find(
            (s) => s.toLowerCase() === extracted.state.toLowerCase()
          )
          if (match) { next.state = match; changed = true }
        }

        // District
        if (extracted.district && !f.district) {
          next.district = extracted.district; changed = true
        }

        return next
      })

      setSaved(false)
      if (changed) {
        showToast(
          t('profile.autoFillOk'),
          isHindi ? 'दस्तावेज़ से विवरण सफलतापूर्वक भरे गए।' : 'Profile details extracted and populated from your document.',
          'info'
        )
      } else {
        showToast(
          t('profile.autoFillNone'),
          isHindi ? 'सभी उपलब्ध विवरण पहले से भरे हुए हैं।' : 'All matching fields are already filled.',
          'info'
        )
      }
    } catch {
      showToast(
        t('profile.autoFillError'),
        isHindi ? 'दस्तावेज़ पढ़ने में समस्या आई।' : 'Could not extract fields from document.',
        'error'
      )
    } finally {
      setFilling(false)
    }
  }

  // Completeness is a hint, not a gate — the backend decides eligibility.
  const filled = [
    form.age, form.income, form.state, form.category, form.gender, form.occupation, form.education,
  ].filter((v) => v !== '' && v != null).length
  const complete = Math.round((filled / 7) * 100)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-neutral-500 dark:text-neutral-400">
        <Spinner />
      </div>
    )
  }

  const current = STEPS[step]
  const user = getStoredUser()
  const displayName = getLocalizedUserName(user, isHindi)
  const initial = (displayName[0] || (isHindi ? 'न' : 'S')).toUpperCase()
  const isEmailUser = currentUser?.provider !== 'firebase-google'

  return (
    <div>
      <PageHeader
        title={t('profile.title')}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={filling}
              onClick={() => {
                playClick()
                fillFromDocuments()
              }}
              title={t('profile.autoFillHint') || 'Auto-fill profile details from your uploaded documents'}
              aria-label={t('profile.autoFillBtn') || 'Auto-fill'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 text-amber-800 dark:text-amber-300 transition-all duration-200 cursor-pointer shadow-xs select-none disabled:opacity-60 min-w-[86px] justify-center"
            >
              <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                {filling ? (
                  <span className="w-3.5 h-3.5 rounded-full border-[1.5px] border-amber-500/30 border-t-amber-600 dark:border-t-amber-400 animate-spin" />
                ) : (
                  <Wand2 size={13} className="text-amber-600 dark:text-amber-400 stroke-[2.2]" />
                )}
              </div>
              <span>{filling ? (t('common.loading') || 'Extracting...') : (t('profile.autoFillBtn') || 'Auto-fill')}</span>
            </button>
            <PageTourButton pageKey="profile" />
          </div>
        }
      />

      {/* Citizen Identity Profile Banner */}
      <div data-tour="profile-avatar" className="mb-6 p-4 rounded-2xl neo-glass-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Interactive Avatar with Refined Round Ring & Inner Pencil Edit Badge */}
          <div
            className={cx(
              'relative group/avatar shrink-0 select-none',
              isEmailUser ? 'cursor-pointer' : 'cursor-default'
            )}
            onClick={() => {
              if (isEmailUser) {
                avatarInputRef.current?.click()
              }
            }}
            title={
              isEmailUser
                ? (isHindi ? 'अपनी पसंद की प्रोफ़ाइल फ़ोटो चुनें' : 'Choose custom profile picture')
                : (isHindi ? 'Google प्रोफ़ाइल फ़ोटो से सिंक किया गया' : 'Synced with Google Account')
            }
          >
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-neutral-100 dark:bg-white/10 border border-neutral-200/80 dark:border-white/20 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#121216] ring-amber-400/90 shadow-[0_0_12px_rgba(245,158,11,0.35)] flex items-center justify-center font-bold text-base uppercase text-neutral-800 dark:text-neutral-200 relative transition-transform duration-300 ease-out group-hover/avatar:scale-[1.02]">
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                initial
              )}

              {/* Bottom inner shade with small pencil icon inside the pic - only for email users */}
              {isEmailUser && (
                <div className="absolute inset-x-0 bottom-0 py-0.5 bg-black/50 backdrop-blur-[1.5px] flex items-center justify-center transition-colors duration-200 group-hover/avatar:bg-black/70">
                  <Pencil size={9} className="text-white drop-shadow-sm stroke-[2.2]" />
                </div>
              )}
            </div>

            {isEmailUser && (
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                {displayName}
              </h2>
              {currentUser?.photoURL && isEmailUser && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  title={isHindi ? 'फ़ोटो हटाएं' : 'Remove photo'}
                  className="text-[10px] text-neutral-400 hover:text-red-500 transition-colors flex items-center gap-0.5 cursor-pointer"
                >
                  <Trash2 size={10} />
                  <span>{isHindi ? 'हटाएं' : 'Remove'}</span>
                </button>
              )}
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
              {currentUser?.email || 'citizen@swatva.in'}
            </p>
          </div>
        </div>

        <ProfileHealthGauge percentage={complete} isHindi={isHindi} />
      </div>

      {error ? (
        <div className="mb-6">
          <Banner tone="error" title={t('profile.errorTitle')}>
            {error}
          </Banner>
        </div>
      ) : null}

      {/* Step rail */}
      <ol data-tour="profile-stepper" className="flex items-center gap-1.5 mb-6" aria-label="Profile steps">
        {STEPS.map((s, i) => {
          const isCurrent = i === step
          const isDone = i < step
          return (
            <li key={s.id} className="flex-1 min-w-0">
              <button
                type="button"
                onClick={() => setStep(i)}
                aria-current={isCurrent ? 'step' : undefined}
                className="w-full text-left cursor-pointer group"
              >
                <span
                  className={cx(
                    'block h-1 rounded-full transition-colors',
                    isDone || isCurrent ? 'bg-amber-500' : 'bg-neutral-200 dark:bg-white/12',
                  )}
                />
                <span className="mt-2 flex items-center gap-1.5 min-w-0">
                  {isDone ? (
                    <Check size={12} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  ) : (
                    <span
                      className={cx(
                        'mono-badge flex-shrink-0',
                        isCurrent ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-400',
                      )}
                    >
                      {i + 1}
                    </span>
                  )}
                  <span
                    className={cx(
                      'text-[11px] font-semibold truncate',
                      isCurrent ? 'text-neutral-950 dark:text-white' : 'text-neutral-500 dark:text-neutral-400',
                    )}
                  >
                    {t(`profile.steps.${s.titleKey}`)}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      <Card className="p-6 sm:p-8">
        <Badge>{t('common.stepOf', { current: step + 1, total: STEPS.length })}</Badge>
        <h2 className="mt-3 text-lg font-bold tracking-tight">{t(`profile.steps.${current.titleKey}`)}</h2>
        <p className="mt-1.5 text-sm text-neutral-600 dark:text-neutral-300">{t(`profile.steps.${current.hintKey}`)}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {step === 0 ? (
            <>
              <Field label={t('profile.fields.age')} htmlFor="age" hint={t('profile.fields.ageHint')}>
                <Input id="age" type="number" min={0} max={130} inputMode="numeric" value={form.age} onChange={set('age')} placeholder="34" />
              </Field>
              <Field label={t('profile.fields.state')} htmlFor="state" hint={t('profile.fields.stateHint')}>
                <Select id="state" value={form.state} onChange={set('state')}>
                  <option value="">{t('profile.fields.statePlaceholder')}</option>
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              </Field>
              <Field label={t('profile.fields.district')} htmlFor="district" hint={t('profile.fields.districtHint')}>
                <Input id="district" value={form.district} onChange={set('district')} placeholder="Lucknow" />
              </Field>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <Field
                label={t('profile.fields.income')}
                htmlFor="income"
                hint={t('profile.fields.incomeHint')}
              >
                <Input id="income" type="number" min={0} step={1000} inputMode="numeric" value={form.income} onChange={set('income')} placeholder="180000" />
              </Field>
              <div className="hidden sm:block" />
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Field label={t('profile.fields.category')} htmlFor="category">
                <Select id="category" value={form.category} onChange={set('category')}>
                  {CATEGORY_VALUES.map((v) => <option key={v} value={v}>{label(v, CATEGORY_LABELS)}</option>)}
                </Select>
              </Field>
              <Field label={t('profile.fields.gender')} htmlFor="gender">
                <Select id="gender" value={form.gender} onChange={set('gender')}>
                  {GENDER_VALUES.map((v) => <option key={v} value={v}>{label(v, GENDER_LABELS)}</option>)}
                </Select>
              </Field>
              <Field label={t('profile.fields.occupation')} htmlFor="occupation" hint={t('profile.fields.occupationHint')}>
                <Input id="occupation" value={form.occupation} onChange={set('occupation')} placeholder="Farmer" />
              </Field>
              <Field label={t('profile.fields.education')} htmlFor="education" hint={t('profile.fields.educationHint')}>
                <Input id="education" value={form.education} onChange={set('education')} placeholder="Graduate" />
              </Field>
              <Field label={t('profile.fields.disability')} htmlFor="disabilityStatus">
                <Select id="disabilityStatus" value={form.disabilityStatus} onChange={set('disabilityStatus')}>
                  {DISABILITY_VALUES.map((v) => <option key={v} value={v}>{label(v, DISABILITY_LABELS)}</option>)}
                </Select>
              </Field>
            </>
          ) : null}

          {step === 3 ? (
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between gap-3 mb-4">
                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                  {t('profile.family.intro')}
                </p>
                <Button size="sm" variant="secondary" onClick={addMember}>{t('profile.family.add')}</Button>
              </div>

              {family.length === 0 ? (
                <EmptyState
                  icon={UserRound}
                  title={t('profile.family.emptyTitle')}
                  body={t('profile.family.emptyBody')}
                />
              ) : (
                <div className="flex flex-col gap-4">
                  {family.map((m, i) => (
                    <div key={i} className="rounded-xl border border-neutral-200 dark:border-white/10 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="mono-badge text-neutral-500 dark:text-neutral-400">{t('common.person', { n: i + 1 })}</span>
                        <button
                          type="button"
                          onClick={() => removeMember(i)}
                          className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                        >
                          {t('common.remove')}
                        </button>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={t('profile.fields.fullName')} htmlFor={`fn-${i}`}>
                          <Input id={`fn-${i}`} value={m.fullName} onChange={setMember(i, 'fullName')} placeholder="Ramesh" />
                        </Field>
                        <Field label={t('profile.fields.relationship')} htmlFor={`rel-${i}`}>
                          <Select id={`rel-${i}`} value={m.relationship} onChange={setMember(i, 'relationship')}>
                            {RELATIONSHIP_VALUES.map((v) => <option key={v} value={v}>{label(v, RELATIONSHIP_LABELS)}</option>)}
                          </Select>
                        </Field>
                        <Field label={t('profile.fields.age')} htmlFor={`age-${i}`}>
                          <Input id={`age-${i}`} type="number" min={0} max={130} inputMode="numeric" value={m.age} onChange={setMember(i, 'age')} placeholder="31" />
                        </Field>
                        <Field label={t('profile.fields.gender')} htmlFor={`fg-${i}`}>
                          <Select id={`fg-${i}`} value={m.gender} onChange={setMember(i, 'gender')}>
                            {GENDER_VALUES.map((v) => <option key={v} value={v}>{label(v, GENDER_LABELS)}</option>)}
                          </Select>
                        </Field>
                        <Field label={t('profile.fields.annualIncome')} htmlFor={`inc-${i}`} hint={t('profile.fields.annualIncomeHint')}>
                          <Input id={`inc-${i}`} type="number" min={0} step={1000} inputMode="numeric" value={m.annualIncome} onChange={setMember(i, 'annualIncome')} placeholder="60000" />
                        </Field>
                        <Field label={t('profile.fields.occupation')} htmlFor={`fo-${i}`} hint={t('profile.fields.annualIncomeHint')}>
                          <Input id={`fo-${i}`} value={m.occupation} onChange={setMember(i, 'occupation')} placeholder="Tailor" />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div data-tour="profile-actions" className="mt-8 pt-4 border-t border-neutral-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
          {/* Left Button Group: Back & Next together */}
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                playClick()
                setStep((s) => Math.max(0, s - 1))
              }}
              disabled={step === 0}
              title={isHindi ? 'पिछला चरण (बायाँ तीर कुंजी)' : 'Previous step (Left Arrow key)'}
            >
              <ChevronLeft size={15} />
              <span>{t('common.back')}</span>
            </Button>

            {step < STEPS.length - 1 && (
              <Button
                variant="secondary"
                onClick={() => {
                  playClick()
                  setStep((s) => Math.min(STEPS.length - 1, s + 1))
                }}
                title={isHindi ? 'अगला चरण (दायाँ तीर कुंजी)' : 'Next step (Right Arrow key)'}
                className="group"
              >
                <span>{t('common.next')}</span>
                <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </Button>
            )}
          </div>

          {/* Right Button: Save Profile */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className={cx(
                'inline-flex items-center justify-center gap-2 h-10 px-5 min-w-[105px] rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer select-none active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm',
                saved
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 border border-emerald-500/50 ring-2 ring-emerald-500/30'
                  : 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-100 border border-neutral-800/80 dark:border-white/20 ring-1 ring-amber-400/50 hover:ring-amber-400/90 shadow-amber-500/10'
              )}
            >
              <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                {saving ? (
                  <span className="w-3.5 h-3.5 rounded-full border-[1.5px] border-current/30 border-t-current animate-spin" />
                ) : (
                  <Check size={14} className={cx('stroke-[2.5]', saved ? 'text-emerald-400 dark:text-emerald-600' : 'text-amber-400 dark:text-amber-600')} />
                )}
              </div>
              <span>{saved ? t('common.saved') : t('profile.save')}</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Smooth Disappearing Floating Toast */}
      {toast.open && (
        <div
          role="status"
          aria-live="polite"
          className={cx(
            'fixed bottom-6 right-6 z-[100] max-w-sm sm:max-w-md w-[calc(100vw-3rem)]',
            'bg-white/95 dark:bg-[#151619]/95 text-neutral-900 dark:text-white',
            'p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.22),0_0_20px_rgba(0,0,0,0.08)]',
            'border border-neutral-200/90 dark:border-white/15',
            'flex items-start gap-3.5 backdrop-blur-xl',
            'transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
            toast.visible
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
          )}
        >
          <div
            className={cx(
              'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 border',
              toast.tone === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20'
                : toast.tone === 'info'
                ? 'bg-amber-500/15 border-amber-500/35 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/20'
                : toast.tone === 'warn'
                ? 'bg-amber-500/15 border-amber-500/35 text-amber-600 dark:text-amber-400'
                : 'bg-rose-500/15 border-rose-500/35 text-rose-600 dark:text-rose-400 ring-2 ring-rose-500/20'
            )}
          >
            {toast.tone === 'success' ? (
              <Check size={16} className="stroke-[2.5]" />
            ) : toast.tone === 'info' ? (
              <Wand2 size={15} className="stroke-[2.2]" />
            ) : (
              <AlertCircle size={15} className="stroke-[2.2]" />
            )}
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <h4 className="text-xs font-bold text-neutral-950 dark:text-white tracking-tight">
              {toast.title}
            </h4>
            {toast.body ? (
              <p className="mt-0.5 text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-300">
                {toast.body}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => {
              playClick()
              dismissToast()
            }}
            title={t('common.close') || 'Close'}
            className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
