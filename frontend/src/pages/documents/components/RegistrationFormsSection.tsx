import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStudentPortalT } from '@/LanguageContext'
import { useStudentPortalTerm } from '@/context/StudentPortalTermContext'
import { useAccount } from '../../../context/AccountContext'
import {
  buildRegistrationTermOptions,
  defaultQuarterFromDate,
  ensureRegistrationTermOption,
  normalizeQuarterLabel,
  parseRegistrationTermKey,
  registrationTermKey,
} from '../../../data/registrationFormTerms'
import {
  buildTranscriptTermOptions,
  defaultTermKeyFromPreview,
} from '../../../lib/academicsTranscriptDisplay'
import {
  fetchStudentAcademics,
  fetchStudentProfile,
  fetchStudentTranscriptPreview,
  fetchStudentAccount,
  type StudentAcademicsResponse,
  type StudentProfileResponse,
  type StudentTranscriptPreviewResponse,
} from '../../../lib/api'
import {
  buildRegistrationFormViewModel,
  type RegistrationFormViewModel,
} from '../../../lib/registrationFormAdapter'
import { RegistrationFormFilters } from './RegistrationFormFilters'
import { RegistrationFormPreview } from './RegistrationFormPreview'

export function RegistrationFormsSection() {
  const t = useStudentPortalT()
  const { portalDefaultTerm, loading: portalTermLoading } = useStudentPortalTerm()
  const { currentStudentId, account } = useAccount()
  const id = currentStudentId?.trim() ?? ''

  const [preview, setPreview] = useState<StudentTranscriptPreviewResponse | null>(null)
  const [academics, setAcademics] = useState<StudentAcademicsResponse | null>(null)
  const [profile, setProfile] = useState<StudentProfileResponse | null>(null)
  const [loadNote, setLoadNote] = useState<string | null>(null)
  const [coreReady, setCoreReady] = useState(false)

  const [termKey, setTermKey] = useState(() =>
    registrationTermKey(defaultQuarterFromDate(), new Date().getFullYear()),
  )

  const termOptions = useMemo(() => {
    const ys = (preview?.transcript ?? []).map((r) => r.year).filter((y) => Number.isFinite(y))
    const options = buildRegistrationTermOptions(ys)
    const selected = parseRegistrationTermKey(termKey)
    if (selected) {
      return ensureRegistrationTermOption(options, selected.quarter, selected.year)
    }
    return options
  }, [preview, termKey])

  const selectedTerm = parseRegistrationTermKey(termKey)
  const year = selectedTerm?.year ?? new Date().getFullYear()
  const quarter = selectedTerm?.quarter ?? defaultQuarterFromDate()

  const [model, setModel] = useState<RegistrationFormViewModel | null>(null)
  const [generating, setGenerating] = useState(false)

  const defaultsAppliedRef = useRef(false)
  const autoGenRef = useRef(false)

  useEffect(() => {
    if (!id) {
      setPreview(null)
      setAcademics(null)
      setProfile(null)
      setLoadNote(null)
      setCoreReady(false)
      defaultsAppliedRef.current = false
      autoGenRef.current = false
      return
    }

    autoGenRef.current = false
    defaultsAppliedRef.current = false
    setCoreReady(false)
    setLoadNote(null)

    const ac = new AbortController()

    ;(async () => {
      const errors: string[] = []

      const p = await fetchStudentTranscriptPreview(id, { signal: ac.signal }).catch((e) => {
        errors.push(
          e instanceof Error ? e.message : t('documentsTranscriptPreviewLoadFailed'),
        )
        return null
      })
      if (ac.signal.aborted) return

      const a = await fetchStudentAcademics(id, { signal: ac.signal }).catch((e) => {
        errors.push(
          e instanceof Error ? e.message : t('documentsAcademicsScheduleLoadFailed'),
        )
        return null
      })
      if (ac.signal.aborted) return

      const prof = await fetchStudentProfile(id, { signal: ac.signal }).catch((e) => {
        errors.push(
          e instanceof Error ? e.message : t('documentsProfileLoadFailed'),
        )
        return null
      })
      if (ac.signal.aborted) return

      setPreview(p)
      setAcademics(a)
      setProfile(prof)
      if (errors.length > 0) {
        setLoadNote(errors.join(' '))
      } else {
        setLoadNote(null)
      }
      setCoreReady(true)
    })()

    return () => ac.abort()
  }, [id, t])

  useEffect(() => {
    if (defaultsAppliedRef.current || portalTermLoading) return

    if (portalDefaultTerm) {
      const q = normalizeQuarterLabel(portalDefaultTerm.term_name)
      if (q && Number.isFinite(portalDefaultTerm.year)) {
        setTermKey(registrationTermKey(q, Math.trunc(portalDefaultTerm.year)))
        defaultsAppliedRef.current = true
        return
      }
    }

    if (!preview) return
    const opts = buildTranscriptTermOptions(preview.transcript)
    const key = defaultTermKeyFromPreview(opts)
    if (key) {
      const parts = key.split('\t')
      const term = parts[0] ?? ''
      const y = Number(parts[1])
      const q = normalizeQuarterLabel(term)
      if (Number.isFinite(y) && q) {
        setTermKey(registrationTermKey(q, Math.trunc(y)))
        defaultsAppliedRef.current = true
        return
      }
    }
    const st = account.student
    if (st?.year && Number.isFinite(st.year)) {
      const q = normalizeQuarterLabel(st.term)
      if (q) {
        setTermKey(registrationTermKey(q, Math.trunc(st.year)))
        defaultsAppliedRef.current = true
      }
    }
  }, [portalDefaultTerm, portalTermLoading, preview, account.student])

  const runGenerate = useCallback(async () => {
    if (!id) return
    setGenerating(true)
    try {
      const transcript = preview?.transcript ?? []
      const schedule = academics?.currentSchedule ?? null
      let feePayload: unknown = null
      try {
        feePayload = await fetchStudentAccount(id, { term: quarter, year })
      } catch {
        feePayload = null
      }
      const vm = buildRegistrationFormViewModel({
        year,
        quarter,
        transcript,
        schedule,
        profile,
        accountName: account.student.name,
        accountStudentId: account.student.studentId || id,
        feePayload,
      })
      setModel(vm)
    } finally {
      setGenerating(false)
    }
  }, [
    id,
    preview,
    academics,
    profile,
    account.student.name,
    account.student.studentId,
    year,
    quarter,
  ])

  useEffect(() => {
    if (!id || !coreReady || portalTermLoading || !defaultsAppliedRef.current) return
    if (autoGenRef.current) return
    autoGenRef.current = true
    void runGenerate()
  }, [id, coreReady, portalTermLoading, runGenerate])

  if (!id) {
    return (
      <p className="portal-registration-form-hint">{t('documentsRegFormSignInToGenerate')}</p>
    )
  }

  return (
    <div className="portal-registration-forms">
      {loadNote ? (
        <p
          className="portal-registration-form-hint portal-registration-form-hint--warn portal-academics-print-hide"
          role="status"
        >
          {loadNote} {t('documentsRegFormLoadNoteSuffix')}
        </p>
      ) : null}
      <RegistrationFormFilters
        terms={termOptions}
        termKey={termKey}
        onTermChange={setTermKey}
        onGenerate={() => {
          void runGenerate()
        }}
        busy={generating}
      />
      {model ? <RegistrationFormPreview model={model} /> : null}
    </div>
  )
}
