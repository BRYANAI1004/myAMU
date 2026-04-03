import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { fetchStudentAccount } from '../lib/api'
import { mahmAccountMock } from '../mock/mahmAccountMock'
import type {
  MahmAccountMock,
  MahmCurrentTerm,
  MahmRegistration,
} from '../mock/mahmAccountMock'
import type { BillingCategory, ScheduleRow } from '../types/billing'

const PORTAL_STUDENT_ID_KEY = 'portal_student_id'

/** Unauthenticated preview routes (e.g. `/plan`) still use the static demo catalog. */
const UNAUTHENTICATED_FALLBACK = mahmAccountMock

function readStoredStudentId(): string | null {
  try {
    const raw = localStorage.getItem(PORTAL_STUDENT_ID_KEY)
    const trimmed = raw?.trim() ?? ''
    return trimmed.length > 0 ? trimmed : null
  } catch {
    return null
  }
}

function asBillingCategory(raw: unknown): BillingCategory {
  const s = String(raw ?? '')
  if (s === 'tuition' || s === 'clinical' || s === 'fees' || s === 'other') {
    return s
  }
  return 'other'
}

function titleCaseTerm(term: string): string {
  const t = term.trim()
  if (!t) return ''
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
}

function quarterOrderFromTerm(term: string): number | undefined {
  switch (term.trim().toUpperCase()) {
    case 'WINTER':
      return 1
    case 'SPRING':
      return 2
    case 'SUMMER':
      return 3
    case 'FALL':
      return 4
    default:
      return undefined
  }
}

function defaultCurrentTermFromStudent(student: MahmAccountMock['student']): MahmCurrentTerm {
  const term = String(student.term ?? '').trim()
  const year = Number(student.year) || 0
  const cap = titleCaseTerm(term)
  const q = quarterOrderFromTerm(term)
  return {
    term,
    year,
    label: cap && year ? `${cap} ${year}` : cap || (year ? String(year) : ''),
    ...(q != null ? { quarterOrder: q } : {}),
  }
}

function fallbackRegistrationFromSchedule(
  scheduleRows: ScheduleRow[],
  termLabel: string,
): MahmRegistration {
  if (scheduleRows.length > 0) {
    let sum = 0
    let anyUnits = false
    for (const r of scheduleRows) {
      if (r.units != null && Number.isFinite(r.units)) {
        sum += r.units
        anyUnits = true
      }
    }
    return {
      status: 'registered',
      hasActiveCourses: true,
      courseCount: scheduleRows.length,
      totalUnits: anyUnits ? Math.round(sum * 100) / 100 : null,
    }
  }
  return {
    status: 'unknown',
    hasActiveCourses: false,
    courseCount: 0,
    totalUnits: null,
    emptyReason: termLabel
      ? `No courses registered for ${termLabel}.`
      : 'No courses registered for the current term.',
  }
}

function parseRegistrationStatus(raw: unknown): MahmRegistration['status'] | null {
  const s = String(raw ?? '').trim()
  if (
    s === 'registered' ||
    s === 'not_registered' ||
    s === 'in_progress' ||
    s === 'unknown'
  ) {
    return s
  }
  return null
}

function parseCurrentTermFromApi(
  raw: unknown,
  student: MahmAccountMock['student'],
): MahmCurrentTerm {
  if (raw === null) {
    return {
      term: '',
      year: 0,
      label: 'No active enrollment',
    }
  }
  if (typeof raw === 'object' && raw !== null) {
    const t = raw as Record<string, unknown>
    const term = String(t.term ?? student.term ?? '').trim()
    const year = Number(t.year ?? student.year) || 0
    const labelRaw = String(t.label ?? '').trim()
    const cap = titleCaseTerm(term)
    const label =
      labelRaw || (cap && year ? `${cap} ${year}` : cap || (year ? String(year) : ''))
    const qo = t.quarterOrder
    return {
      term,
      year,
      label,
      ...(typeof qo === 'number' && Number.isFinite(qo) ? { quarterOrder: qo } : {}),
    }
  }
  return defaultCurrentTermFromStudent(student)
}

function parseRegistrationFromApi(
  raw: unknown,
  scheduleRows: ScheduleRow[],
  termLabel: string,
): MahmRegistration {
  if (raw != null && typeof raw === 'object') {
    const r = raw as Record<string, unknown>
    const status = parseRegistrationStatus(r.status) ?? 'unknown'
    const totalUnitsRaw =
      r.totalUnits == null || r.totalUnits === '' ? null : Number(r.totalUnits)
    return {
      status,
      hasActiveCourses: Boolean(r.hasActiveCourses),
      courseCount: Number(r.courseCount ?? 0) || 0,
      totalUnits:
        totalUnitsRaw != null && Number.isFinite(totalUnitsRaw) ? totalUnitsRaw : null,
      emptyReason:
        r.emptyReason != null && String(r.emptyReason).trim() !== ''
          ? String(r.emptyReason).trim()
          : undefined,
    }
  }
  return fallbackRegistrationFromSchedule(scheduleRows, termLabel)
}

function ensureAccountDashboardFields(account: MahmAccountMock): MahmAccountMock {
  const currentTerm = account.currentTerm?.label?.trim()
    ? account.currentTerm
    : defaultCurrentTermFromStudent(account.student)
  const termLabel =
    currentTerm.label?.trim() ||
    defaultCurrentTermFromStudent(account.student).label
  const registration =
    account.registration != null &&
    parseRegistrationStatus(account.registration.status) != null
      ? account.registration
      : fallbackRegistrationFromSchedule(account.scheduleRows, termLabel)
  return { ...account, currentTerm, registration }
}

/**
 * Maps GET /api/students/:id/account JSON (portal-assembled or legacy minimal) into the
 * `MahmAccountMock`-shaped view model finance widgets expect — without showing static Bingchen
 * data for signed-in students when the API returns a sparse legacy payload.
 */
function normalizeApiStudentAccount(raw: unknown): MahmAccountMock {
  if (raw == null || typeof raw !== 'object') {
    throw new Error('Invalid account response')
  }
  const o = raw as Record<string, unknown>

  if (
    'installmentPlan' in o &&
    o.installmentPlan != null &&
    typeof o.installmentPlan === 'object'
  ) {
    return ensureAccountDashboardFields(o as MahmAccountMock)
  }

  const studentRaw = o.student
  if (studentRaw == null || typeof studentRaw !== 'object') {
    throw new Error('Account response missing student')
  }
  const st = studentRaw as Record<string, unknown>
  const studentIdRoot =
    typeof o.studentId === 'string' && o.studentId.trim() !== ''
      ? o.studentId.trim()
      : String(st.studentId ?? '').trim()

  const student = {
    name: String(st.name ?? '').trim() || studentIdRoot || 'Student',
    studentId: String(st.studentId ?? studentIdRoot).trim() || studentIdRoot,
    term: String(st.term ?? '').trim(),
    year: Number(st.year),
  }

  const summaryRaw = o.summary
  const summaryObj =
    summaryRaw != null && typeof summaryRaw === 'object'
      ? (summaryRaw as Record<string, unknown>)
      : {}
  const summary = {
    tuitionTotal: Number(summaryObj.tuitionTotal ?? 0) || 0,
    clinicalTotal: Number(summaryObj.clinicalTotal ?? 0) || 0,
    feesTotal: Number(summaryObj.feesTotal ?? 0) || 0,
    otherTotal: Number(summaryObj.otherTotal ?? 0) || 0,
    totalCharges: Number(summaryObj.totalCharges ?? 0) || 0,
    payments: Number(summaryObj.payments ?? 0) || 0,
    outstandingBalance: Number(summaryObj.outstandingBalance ?? 0) || 0,
  }

  const lineItemsRaw = Array.isArray(o.lineItems) ? o.lineItems : []
  const lineItems = lineItemsRaw.map((row) => {
    const r = row as Record<string, unknown>
    return {
      description: String(r.description ?? ''),
      amount: Number(r.amount ?? 0) || 0,
      category: asBillingCategory(r.category),
    }
  })

  const scheduleRowsRaw = Array.isArray(o.scheduleRows) ? o.scheduleRows : []
  const scheduleRows = scheduleRowsRaw.map((row) => {
    const r = row as Record<string, unknown>
    const instructorRaw = r.instructor
    return {
      courseCode: String(r.courseCode ?? ''),
      title: String(r.title ?? ''),
      type: String(r.type ?? ''),
      units: r.units == null ? null : Number(r.units),
      hours: r.hours == null ? null : Number(r.hours),
      charge: Number(r.charge ?? 0) || 0,
      schedule:
        r.schedule == null || String(r.schedule).trim() === ''
          ? null
          : String(r.schedule),
      location:
        r.location == null || String(r.location).trim() === ''
          ? null
          : String(r.location),
      instructor:
        instructorRaw == null || String(instructorRaw).trim() === ''
          ? null
          : String(instructorRaw),
    }
  })

  const paymentsRaw = Array.isArray(o.payments) ? o.payments : []
  const recentActivity = paymentsRaw.map((p) => {
    const r = p as Record<string, unknown>
    return {
      date: String(r.paidAt ?? ''),
      description: String(r.description ?? 'Payment'),
      amount: -Math.abs(Number(r.amount ?? 0) || 0),
    }
  })

  const instRaw = Array.isArray(o.installmentSchedule) ? o.installmentSchedule : []
  const preferenceRaw = o.preference
  const preference =
    preferenceRaw != null && typeof preferenceRaw === 'object'
      ? (preferenceRaw as Record<string, unknown>)
      : null
  const usePlan = Boolean(preference?.useInstallmentPlan)
  const installmentSchedule = instRaw.map((row) => {
    const r = row as Record<string, unknown>
    return {
      dueDate: String(r.dueDate ?? ''),
      amount: Number(r.amount ?? 0) || 0,
      status: 'Scheduled',
    }
  })
  const installmentCountPref =
    preference != null && typeof preference.installmentCount === 'number'
      ? preference.installmentCount
      : 3

  const installmentPlan = {
    enabled: usePlan && installmentSchedule.length > 0,
    installmentCount: usePlan ? installmentCountPref : 0,
    installmentAmount: installmentSchedule[0]?.amount ?? 0,
    schedule: installmentSchedule,
  }

  const installmentPolicyRaw = Array.isArray(o.installmentPolicy)
    ? o.installmentPolicy
    : []
  const installmentPolicy = installmentPolicyRaw.map((x) => String(x))

  const program = o.program != null && String(o.program).trim() !== '' ? String(o.program).trim() : ''
  const billingStatus =
    o.billingStatus != null && String(o.billingStatus).trim() !== ''
      ? String(o.billingStatus).trim()
      : ''
  const termChargeEffectiveDate =
    o.termChargeEffectiveDate != null && String(o.termChargeEffectiveDate).trim() !== ''
      ? String(o.termChargeEffectiveDate).trim()
      : ''

  const currentTerm = parseCurrentTermFromApi(o.currentTerm, student)
  const registration = parseRegistrationFromApi(
    o.registration,
    scheduleRows,
    currentTerm.label,
  )

  return ensureAccountDashboardFields({
    program,
    student,
    summary,
    lineItems,
    installmentPlan,
    installmentPolicy,
    billingStatus,
    termChargeEffectiveDate,
    scheduleRows,
    currentTerm,
    registration,
    recentActivity,
    statements: [],
  })
}

/** Placeholder while signed in but account JSON has not arrived yet — avoids showing demo names/amounts. */
function authenticatedPlaceholderAccount(studentId: string): MahmAccountMock {
  const student = {
    name: '',
    studentId: studentId.trim(),
    term: '',
    year: 0,
  }
  return ensureAccountDashboardFields({
    program: '',
    student,
    summary: {
      tuitionTotal: 0,
      clinicalTotal: 0,
      feesTotal: 0,
      otherTotal: 0,
      totalCharges: 0,
      payments: 0,
      outstandingBalance: 0,
    },
    lineItems: [],
    installmentPlan: {
      enabled: false,
      installmentCount: 0,
      installmentAmount: 0,
      schedule: [],
    },
    installmentPolicy: [],
    billingStatus: '',
    termChargeEffectiveDate: '',
    scheduleRows: [],
    currentTerm: defaultCurrentTermFromStudent(student),
    registration: {
      status: 'unknown',
      hasActiveCourses: false,
      courseCount: 0,
      totalUnits: null,
    },
    recentActivity: [],
    statements: [],
  })
}

type AccountContextValue = {
  /** Last successful API payload for the current student; null after logout or a failed fetch. */
  fetchedAccount: MahmAccountMock | null
  /**
   * View model for billing widgets. When authenticated, comes from the API (normalized) or a neutral
   * placeholder while loading — never the static demo catalog, so real students do not see Bingchen Li.
   */
  account: MahmAccountMock
  loading: boolean
  error: string | null
  reload: () => void
  currentStudentId: string | null
  /** Call only after the backend login endpoint succeeds; does not validate credentials. */
  login: (studentId: string) => void
  logout: () => void
  isAuthenticated: boolean
}

const AccountContext = createContext<AccountContextValue | null>(null)

export function AccountProvider({ children }: { children: ReactNode }) {
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(() =>
    readStoredStudentId(),
  )
  const [fetchedAccount, setFetchedAccount] = useState<MahmAccountMock | null>(null)
  const [loading, setLoading] = useState(
    () => Boolean(readStoredStudentId()?.trim()),
  )
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const login = useCallback((studentId: string) => {
    const trimmed = studentId.trim()
    setCurrentStudentId(trimmed)
    try {
      localStorage.setItem(PORTAL_STUDENT_ID_KEY, trimmed)
    } catch {
      /* ignore quota / private mode */
    }
  }, [])

  const logout = useCallback(() => {
    setCurrentStudentId(null)
    try {
      localStorage.removeItem(PORTAL_STUDENT_ID_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const reload = useCallback(() => {
    setReloadKey((k) => k + 1)
  }, [])

  useEffect(() => {
    if (!currentStudentId?.trim()) {
      setFetchedAccount(null)
      setLoading(false)
      setError(null)
      return
    }

    const id = currentStudentId.trim()
    const ac = new AbortController()

    setFetchedAccount(null)
    setLoading(true)
    setError(null)

    ;(async () => {
      try {
        const raw = await fetchStudentAccount(id, { signal: ac.signal })
        if (ac.signal.aborted) return
        setFetchedAccount(normalizeApiStudentAccount(raw))
        setError(null)
      } catch (e) {
        if (ac.signal.aborted) return
        setFetchedAccount(null)
        setError(
          e instanceof Error ? e.message : 'Something went wrong loading your account.',
        )
      } finally {
        if (!ac.signal.aborted) {
          setLoading(false)
        }
      }
    })()

    return () => ac.abort()
  }, [currentStudentId, reloadKey])

  const isAuthenticated =
    currentStudentId !== null && currentStudentId.trim().length > 0

  const account = useMemo(() => {
    if (!isAuthenticated) {
      return UNAUTHENTICATED_FALLBACK
    }
    if (fetchedAccount) {
      return fetchedAccount
    }
    if (loading && currentStudentId) {
      return authenticatedPlaceholderAccount(currentStudentId)
    }
    if (error && currentStudentId) {
      return authenticatedPlaceholderAccount(currentStudentId)
    }
    return authenticatedPlaceholderAccount(currentStudentId ?? '')
  }, [currentStudentId, error, fetchedAccount, isAuthenticated, loading])

  const value = useMemo<AccountContextValue>(
    () => ({
      fetchedAccount,
      account,
      loading,
      error,
      reload,
      currentStudentId,
      login,
      logout,
      isAuthenticated,
    }),
    [
      account,
      currentStudentId,
      error,
      fetchedAccount,
      loading,
      login,
      logout,
      reload,
    ],
  )

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount() {
  const ctx = useContext(AccountContext)
  if (!ctx) {
    throw new Error('useAccount must be used within AccountProvider')
  }
  return ctx
}
