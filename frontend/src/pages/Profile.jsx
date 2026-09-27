import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronLeft, ChevronRight, Sparkles, UserRound } from 'lucide-react'
import { api } from '../api/client'
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
  GENERAL: 'General',
  OBC: 'Other Backward Class (OBC)',
  SC: 'Scheduled Caste (SC)',
  ST: 'Scheduled Tribe (ST)',
  EWS: 'Economically Weaker Section (EWS)',
  OTHER: 'options.other',
}

const GENDER_LABELS = { FEMALE: 'Female', MALE: 'Male', OTHER: 'options.other', PREFER_NOT_TO_SAY: 'options.preferNotToSay' }
const DISABILITY_LABELS = { NONE: 'options.noDisability', PERSON_WITH_DISABILITY: 'options.personWithDisability', NOT_DISCLOSED: 'options.preferNotToSay' }
const RELATIONSHIP_LABELS = {
  SPOUSE: 'options.spouse', CHILD: 'options.child', PARENT: 'options.parent',
  GRANDPARENT: 'options.grandparent', SIBLING: 'options.sibling', OTHER: 'options.other',
}


const toNum = (v) => (v === '' || v == null ? null : Number(v))

/**
 * Resolve an option label. A label is either an i18n key (translated) or a
 * literal proper noun such as "Scheduled Caste (SC)" that is correct as-is in
 * both languages.
 */
function useOptionLabels() {
  const { t } = useTranslation()
  return (value, table) => {
    if (value === '') return t('profile.options.notSpecified')
    const label = table[value]
    if (!label) return value
    return t(`profile.${label}`)
  }
}

export default function Profile() {
  const { t } = useTranslation()
  const label = useOptionLabels()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    age: '', income: '', state: '', district: '', occupation: '', education: '',
    category: '', gender: '', disabilityStatus: '',
  })
  const [family, setFamily] = useState([])

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
    setError(null)
    setSaving(true)
    try {
      await api.user.updateProfile(payload)
      setSaved(true)
    } catch (err) {
      setError(err?.message || t('profile.loadError'))
    } finally {
      setSaving(false)
    }
  }

  const [filling, setFilling] = useState(false)
  const [fillResult, setFillResult] = useState(null) // 'ok' | 'none' | 'error'

  /** Auto-fill profile fields from uploaded documents (Aadhaar preferred) */
  const fillFromDocuments = async () => {
    setFilling(true)
    setFillResult(null)
    try {
      const docs = await api.documents.list()
      if (!docs?.length) { setFillResult('none'); return }

      // Prefer Aadhaar; fall back to first available doc
      const aadhaar = docs.find((d) => d.documentType === 'AADHAAR') ?? docs[0]
      const extracted = await api.documents.extract(aadhaar.id)
      if (!extracted) { setFillResult('none'); return }

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
      setFillResult(changed ? 'ok' : 'none')
    } catch {
      setFillResult('error')
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

  return (
    <div>
      <PageHeader
        title={t('profile.title')}
        desc={t('profile.desc')}
        actions={
          <Button onClick={save} variant="accent" loading={saving}>
            {saved ? t('common.saved') : t('profile.save')}
          </Button>
        }
      />

      {error ? (
        <div className="mb-6">
          <Banner tone="error" title={t('profile.errorTitle')}>
            {error}
          </Banner>
        </div>
      ) : null}
      {saved ? (
        <div className="mb-6">
          <Banner tone="info" title={t('profile.savedTitle')}>
            {t('profile.savedBody')}
          </Banner>
        </div>
      ) : null}

      {/* Auto-fill from documents — only show when profile is sparse */}
      {complete < 60 && (
        <div className="mb-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-50 dark:bg-amber-500/[0.08] px-4 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              {t('profile.autoFillTitle')}
            </p>
            <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
              {fillResult === 'ok'
                ? t('profile.autoFillOk')
                : fillResult === 'none'
                ? t('profile.autoFillNone')
                : fillResult === 'error'
                ? t('profile.autoFillError')
                : t('profile.autoFillHint')}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            loading={filling}
            onClick={fillFromDocuments}
            className="shrink-0 text-amber-700 dark:text-amber-300 border border-amber-400/40 hover:bg-amber-100 dark:hover:bg-amber-500/10"
          >
            <Sparkles size={13} />
            {t('profile.autoFillBtn')}
          </Button>
        </div>
      )}

      {/* Step rail */}
      <ol className="flex items-center gap-1.5 mb-6" aria-label="Profile steps">
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

        <div className="mt-8 flex items-center justify-between gap-3">
          <Button
            variant="secondary"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ChevronLeft size={15} />
            {t('common.back')}
          </Button>
          <Button
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            disabled={step === STEPS.length - 1}
          >
            {t('common.next')}
            <ChevronRight size={15} />
          </Button>
        </div>
      </Card>

      <Card accent className="mt-4 p-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-semibold tracking-tight">{t('profile.completeness')}</p>
          <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-0.5">
            {t('profile.completenessHint', { count: complete, n: complete })}
          </p>
        </div>
        <span className="mono-badge text-amber-700 dark:text-amber-400">{complete}%</span>
      </Card>
    </div>
  )
}
