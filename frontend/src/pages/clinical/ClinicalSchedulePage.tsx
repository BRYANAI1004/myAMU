import { useEffect, useMemo, useState } from 'react'
import { useAccount } from '../../context/AccountContext'
import {
  fetchAdminClinicalTimetable,
  fetchStudentClinicalRequests,
  fetchStudentClinicalSchedule,
  postStudentClinicalRequest,
  type AdminClinicalTimetableSlot,
  type ClinicalScheduleSession,
  type StudentClinicalRequestItem,
} from '../../lib/api'

function formatScheduleDate(isoYmd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoYmd.trim())
  if (!m) return isoYmd
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const dt = new Date(y, mo - 1, d)
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo - 1 ||
    dt.getDate() !== d
  ) {
    return isoYmd
  }
  return dt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function dashText(value: string | null | undefined): string {
  if (value == null) return '—'
  const t = String(value).trim()
  return t === '' ? '—' : t
}

type TableRow = {
  key: string
  date: string
  session: string
  site: string
  faculty: string
  status: string
}

function mapSessionToRow(s: ClinicalScheduleSession): TableRow {
  return {
    key: String(s.id),
    date: formatScheduleDate(s.sessionDate),
    session: dashText(s.sessionName),
    site: dashText(s.site),
    faculty: dashText(s.faculty),
    status: s.status.trim() || 'Scheduled',
  }
}

function isTimetableSlotInSchedule(
  slot: AdminClinicalTimetableSlot,
  sessions: ClinicalScheduleSession[],
): boolean {
  const label = slot.slotLabel.trim()
  return sessions.some(
    (s) =>
      s.courseCode.trim().toUpperCase() === 'CLINIC' &&
      (s.sessionName?.trim() ?? '') === label,
  )
}

function pendingRequestForTimetable(
  timetableId: number,
  requests: StudentClinicalRequestItem[],
): StudentClinicalRequestItem | undefined {
  return requests.find(
    (r) => r.timetableId === timetableId && r.status.toLowerCase() === 'pending',
  )
}

const ACADEMIC_TERM_ORDER = ['Winter', 'Spring', 'Summer', 'Fall'] as const

function compareTermsAcademic(a: string, b: string): number {
  const at = a.trim()
  const bt = b.trim()
  const ai = ACADEMIC_TERM_ORDER.findIndex(
    (t) => t.toLowerCase() === at.toLowerCase(),
  )
  const bi = ACADEMIC_TERM_ORDER.findIndex(
    (t) => t.toLowerCase() === bt.toLowerCase(),
  )
  const aKnown = ai >= 0
  const bKnown = bi >= 0
  if (aKnown && bKnown) return ai - bi
  if (aKnown && !bKnown) return -1
  if (!aKnown && bKnown) return 1
  return at.localeCompare(bt, undefined, { sensitivity: 'base' })
}

export function ClinicalSchedulePage() {
  const { currentStudentId } = useAccount()
  const [rows, setRows] = useState<TableRow[]>([])
  const [sessions, setSessions] = useState<ClinicalScheduleSession[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [timetableSlots, setTimetableSlots] = useState<AdminClinicalTimetableSlot[]>(
    [],
  )
  const [timetableLoading, setTimetableLoading] = useState(false)
  const [timetableError, setTimetableError] = useState<string | null>(null)
  const [filterYear, setFilterYear] = useState('')
  const [filterTerm, setFilterTerm] = useState('')
  const [selectedSlotId, setSelectedSlotId] = useState('')
  const [requests, setRequests] = useState<StudentClinicalRequestItem[]>([])
  const [requestSubmitting, setRequestSubmitting] = useState(false)
  const [requestMessage, setRequestMessage] = useState<string | null>(null)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [dataReloadKey, setDataReloadKey] = useState(0)

  useEffect(() => {
    const ac = new AbortController()
    setTimetableLoading(true)
    setTimetableError(null)
    ;(async () => {
      try {
        const slots = await fetchAdminClinicalTimetable({ signal: ac.signal })
        if (ac.signal.aborted) return
        setTimetableSlots(slots)
      } catch (e) {
        if (ac.signal.aborted) return
        setTimetableSlots([])
        setTimetableError(
          e instanceof Error
            ? e.message
            : 'Could not load clinic timetable slots.',
        )
      } finally {
        if (!ac.signal.aborted) {
          setTimetableLoading(false)
        }
      }
    })()
    return () => ac.abort()
  }, [])

  useEffect(() => {
    const id = currentStudentId?.trim()
    if (!id) {
      setRows([])
      setSessions([])
      setRequests([])
      setLoading(false)
      setError(null)
      return
    }

    const ac = new AbortController()
    setRows([])
    setSessions([])
    setLoading(true)
    setError(null)

    ;(async () => {
      try {
        const [sess, reqList] = await Promise.all([
          fetchStudentClinicalSchedule(id, { signal: ac.signal }),
          fetchStudentClinicalRequests(id, { signal: ac.signal }),
        ])
        if (ac.signal.aborted) return
        setSessions(sess)
        setRows(sess.map(mapSessionToRow))
        setRequests(reqList)
        setError(null)
      } catch (e) {
        if (ac.signal.aborted) return
        setRows([])
        setSessions([])
        setRequests([])
        setError(
          e instanceof Error ? e.message : 'Could not load clinic schedule.',
        )
      } finally {
        if (!ac.signal.aborted) {
          setLoading(false)
        }
      }
    })()

    return () => ac.abort()
  }, [currentStudentId, dataReloadKey])

  const availableTerms = useMemo(() => {
    const seen = new Set<string>()
    for (const s of timetableSlots) {
      const t = s.term.trim()
      if (t !== '') seen.add(t)
    }
    return [...seen].sort(compareTermsAcademic)
  }, [timetableSlots])

  const availableYears = useMemo(() => {
    const seen = new Set<number>()
    for (const s of timetableSlots) {
      if (Number.isFinite(s.year)) seen.add(s.year)
    }
    return [...seen].sort((a, b) => b - a)
  }, [timetableSlots])

  const filteredTimetableSlots = useMemo(() => {
    return timetableSlots.filter((s) => {
      if (filterYear.trim() !== '' && String(s.year) !== filterYear.trim()) {
        return false
      }
      if (filterTerm.trim() !== '' && s.term !== filterTerm.trim()) {
        return false
      }
      return true
    })
  }, [timetableSlots, filterYear, filterTerm])

  const selectedSlot = useMemo(() => {
    const raw = selectedSlotId.trim()
    if (raw === '') return undefined
    const n = Number(raw)
    if (!Number.isFinite(n)) return undefined
    return filteredTimetableSlots.find((s) => s.id === n)
  }, [filteredTimetableSlots, selectedSlotId])

  const selectedPending = selectedSlot
    ? pendingRequestForTimetable(selectedSlot.id, requests)
    : undefined
  const selectedInSchedule =
    selectedSlot != null && isTimetableSlotInSchedule(selectedSlot, sessions)

  async function handleRequestSlot() {
    const id = currentStudentId?.trim()
    if (!id || !selectedSlot) return
    setRequestSubmitting(true)
    setRequestError(null)
    setRequestMessage(null)
    try {
      await postStudentClinicalRequest(id, { timetableId: selectedSlot.id })
      setRequestMessage('Request submitted. You will see it here as pending until staff approves.')
      setDataReloadKey((k) => k + 1)
    } catch (e) {
      setRequestError(
        e instanceof Error ? e.message : 'Could not submit clinical request.',
      )
    } finally {
      setRequestSubmitting(false)
    }
  }

  const id = currentStudentId?.trim()
  const showEmptyAccount = !id
  const sectionLoading = loading && rows.length === 0 && error === null

  return (
    <main className="portal-page">
      <h2 className="portal-section-heading">Clinic schedule</h2>
      <p className="portal-page-lede">
        Your published clinic and rotation assignments appear below. Supervisors and sites may update as
        the term approaches—check back for the official schedule released by the clinical affairs office.
      </p>
      {showEmptyAccount ? (
        <p className="portal-page-lede" role="status">
          Sign in to view your clinic schedule.
        </p>
      ) : null}
      {error ? (
        <p className="portal-page-lede" role="alert">
          {error}
        </p>
      ) : null}
      {sectionLoading ? (
        <p className="portal-page-lede" aria-live="polite">
          Loading schedule…
        </p>
      ) : null}

      {!showEmptyAccount ? (
        <section
          className="portal-module-panel"
          aria-labelledby="clinical-request-heading"
          style={{ marginBottom: '1.5rem' }}
        >
          <h3
            id="clinical-request-heading"
            className="portal-module-panel-heading"
          >
            Request clinical session
          </h3>
          <p className="portal-card-note" style={{ marginBottom: '1rem' }}>
            Choose an open timetable slot and submit a request. Staff will review pending requests and
            approved slots appear in your assignments below.
          </p>
          {timetableLoading ? (
            <p className="portal-page-lede" aria-live="polite">
              Loading timetable…
            </p>
          ) : null}
          {timetableError ? (
            <p className="portal-page-lede" role="alert">
              {timetableError}
            </p>
          ) : null}
          {!timetableLoading && !timetableError ? (
            <div
              className="portal-actions"
              style={{
                flexWrap: 'wrap',
                alignItems: 'flex-end',
                gap: '0.75rem 1rem',
                marginBottom: '1rem',
              }}
            >
              <label className="portal-card-note" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span>Term</span>
                <select
                  className="portal-account-ledger__select"
                  value={filterTerm}
                  onChange={(e) => setFilterTerm(e.target.value)}
                  aria-label="Filter timetable by term"
                >
                  <option value="">All terms</option>
                  {availableTerms.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="portal-card-note" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span>Year</span>
                <select
                  className="portal-account-ledger__select"
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  aria-label="Filter timetable by year"
                >
                  <option value="">All years</option>
                  {availableYears.map((y) => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
              <label
                className="portal-card-note"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  minWidth: 'min(100%, 22rem)',
                  flex: '1 1 14rem',
                }}
              >
                <span>Weekly slot</span>
                <select
                  className="portal-account-ledger__select"
                  value={selectedSlotId}
                  onChange={(e) => setSelectedSlotId(e.target.value)}
                  aria-label="Select clinic timetable slot"
                >
                  <option value="">Select a slot…</option>
                  {filteredTimetableSlots.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.slotLabel} ({s.term} {s.year})
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="portal-btn portal-btn--primary"
                disabled={
                  requestSubmitting ||
                  !selectedSlot ||
                  Boolean(selectedPending) ||
                  selectedInSchedule
                }
                onClick={() => void handleRequestSlot()}
              >
                {requestSubmitting ? 'Submitting…' : 'Request slot'}
              </button>
            </div>
          ) : null}
          {selectedSlot && selectedPending ? (
            <p className="portal-page-lede" role="status">
              <span className="portal-status portal-status--pending">Pending</span>
              {' '}
              Your request for this slot is awaiting approval.
            </p>
          ) : null}
          {selectedSlot && selectedInSchedule && !selectedPending ? (
            <p className="portal-page-lede" role="status">
              <span className="portal-status portal-status--paid">Approved</span>
              {' '}
              This slot is already on your schedule below.
            </p>
          ) : null}
          {requestError ? (
            <p className="portal-page-lede" role="alert">
              {requestError}
            </p>
          ) : null}
          {requestMessage ? (
            <p className="portal-page-lede" role="status">
              {requestMessage}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="portal-module-panel" aria-labelledby="clinic-schedule-table-heading">
        <h3 id="clinic-schedule-table-heading" className="portal-module-panel-heading">
          Upcoming assignments
        </h3>
        <div className="portal-table-wrap">
          <table className="portal-table portal-table--clinical-schedule">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Session</th>
                <th scope="col">Clinic / site</th>
                <th scope="col">Supervising faculty</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <td>{row.date}</td>
                  <td>{row.session}</td>
                  <td>{row.site}</td>
                  <td>{row.faculty}</td>
                  <td>
                    <span
                      className={
                        row.status === 'Confirmed'
                          ? 'portal-status portal-status--paid'
                          : row.status === 'Tentative'
                            ? 'portal-status portal-status--upcoming'
                            : 'portal-status portal-status--pending'
                      }
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
