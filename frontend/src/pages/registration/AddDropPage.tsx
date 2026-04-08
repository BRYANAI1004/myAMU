import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccount } from '../../context/AccountContext'
import {
  fetchAcademicTerms,
  fetchCourses,
  fetchCurrentAcademicTerm,
  fetchStudentEnrolledSections,
  postStudentWithdraw,
  type AcademicTerm,
  type AdminCourseSection,
  type CourseCatalogItem,
} from '../../lib/api'
import { getPreferredCourseTitle } from '../../lib/courseDisplayName'
import { formatTimeRangeHmsForDisplay } from '../../lib/formatScheduleTime'
import { formatWeekdaysShortFromStored } from '../../lib/weekdaySchedule'
import { useRegistrationTermSearchParam } from './registrationTermSearch'

function localTodayYyyyMmDd(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Date-only comparison in local time. Deadline day is inclusive: allowed when today <= deadline.
 */
function withdrawDeadlineEligibility(deadlineYmd: string | null): {
  withdrawAllowed: boolean
  reasonWhenDisabled: string | null
} {
  if (deadlineYmd == null || deadlineYmd.trim() === '') {
    return {
      withdrawAllowed: false,
      reasonWhenDisabled: 'Withdraw deadline is not configured for this term.',
    }
  }
  const deadline = deadlineYmd.slice(0, 10)
  const today = localTodayYyyyMmDd()
  if (today > deadline) {
    return {
      withdrawAllowed: false,
      reasonWhenDisabled: 'Withdraw deadline has passed.',
    }
  }
  return { withdrawAllowed: true, reasonWhenDisabled: null }
}

function resolveTermForSelectedId(
  selectedId: string,
  current: AcademicTerm | null,
  allTerms: AcademicTerm[],
): AcademicTerm | null {
  const id = selectedId.trim()
  if (id === '') return null
  if (current != null && current.id === id) return current
  return allTerms.find((t) => t.id === id) ?? null
}

export function AddDropPage() {
  const registrationTermId = useRegistrationTermSearchParam()
  const { currentStudentId, isAuthenticated } = useAccount()

  const [sections, setSections] = useState<AdminCourseSection[]>([])
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedTerm, setSelectedTerm] = useState<AcademicTerm | null>(null)
  const [coursesCatalog, setCoursesCatalog] = useState<CourseCatalogItem[] | null>(null)
  const [withdrawingCode, setWithdrawingCode] = useState<string | null>(null)
  const [rowErrorByCode, setRowErrorByCode] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const termKey = registrationTermId?.trim() ?? ''
  const studentKey = currentStudentId?.trim() ?? ''
  const termMissing = registrationTermId == null || registrationTermId.trim() === ''

  const catalogByCode = useMemo(() => {
    const m = new Map<string, CourseCatalogItem>()
    if (coursesCatalog == null) return m
    for (const c of coursesCatalog) {
      m.set(c.code.trim().toUpperCase(), c)
    }
    return m
  }, [coursesCatalog])

  const withdrawEligibility = useMemo(
    () => withdrawDeadlineEligibility(selectedTerm?.withdraw_deadline ?? null),
    [selectedTerm?.withdraw_deadline],
  )

  const loadWorkspace = useCallback(async () => {
    if (termKey === '' || studentKey === '' || !isAuthenticated) {
      setSections([])
      setSelectedTerm(null)
      setCoursesCatalog(null)
      setLoadState('idle')
      setLoadError(null)
      return
    }
    const ac = new AbortController()
    setLoadState('loading')
    setLoadError(null)
    try {
      const [current, allTerms, enrolled, catalog] = await Promise.all([
        fetchCurrentAcademicTerm({ signal: ac.signal }),
        fetchAcademicTerms({ signal: ac.signal }),
        fetchStudentEnrolledSections(studentKey, termKey, { signal: ac.signal }),
        fetchCourses({ signal: ac.signal }),
      ])
      if (ac.signal.aborted) return
      const term = resolveTermForSelectedId(termKey, current, allTerms)
      setSelectedTerm(term)
      setSections(enrolled)
      setCoursesCatalog(catalog)
      setLoadState('idle')
    } catch (e) {
      if (ac.signal.aborted) return
      setSections([])
      setSelectedTerm(null)
      setCoursesCatalog(null)
      setLoadState('error')
      setLoadError(e instanceof Error ? e.message : 'Could not load Add/Drop data.')
    }
  }, [termKey, studentKey, isAuthenticated])

  const refetchEnrolledSectionsOnly = useCallback(async () => {
    if (termKey === '' || studentKey === '' || !isAuthenticated) return
    try {
      const enrolled = await fetchStudentEnrolledSections(studentKey, termKey)
      setSections(enrolled)
    } catch {
      /* keep existing table; user can Retry for full reload */
    }
  }, [termKey, studentKey, isAuthenticated])

  useEffect(() => {
    void loadWorkspace()
  }, [loadWorkspace])

  const handleWithdraw = async (row: AdminCourseSection) => {
    const code = row.course_code.trim()
    if (code === '' || termKey === '' || studentKey === '') return
    if (!withdrawEligibility.withdrawAllowed) return

    const ok = window.confirm(
      `Withdraw ${code}? This course will appear as W on your academic record.`,
    )
    if (!ok) return

    setRowErrorByCode((prev) => {
      const next = { ...prev }
      delete next[code]
      return next
    })
    setWithdrawingCode(code)
    try {
      const res = await postStudentWithdraw({
        studentId: studentKey,
        academic_term_id: termKey,
        course_code: code,
      })
      if (!res.success || res.removedCount < 1) {
        setRowErrorByCode((prev) => ({
          ...prev,
          [code]: 'No active enrollment was withdrawn. Refresh and try again if this persists.',
        }))
        return
      }
      setSuccessMessage('Course withdrawn.')
      window.setTimeout(() => setSuccessMessage(null), 4000)
      await refetchEnrolledSectionsOnly()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Withdrawal failed.'
      setRowErrorByCode((prev) => ({ ...prev, [code]: msg }))
    } finally {
      setWithdrawingCode(null)
    }
  }

  return (
    <main
      className="portal-page portal-add-drop-page"
      data-registration-term={registrationTermId ?? undefined}
    >
      <p className="portal-page-lede">
        Add or drop courses according to your program rules and the academic calendar. Changes may
        require advisor approval depending on your status and the dates in effect.
      </p>

      {!isAuthenticated && (
        <section className="portal-card portal-stack" aria-labelledby="add-drop-auth-heading">
          <h2 id="add-drop-auth-heading" className="portal-section-heading">
            Sign in required
          </h2>
          <p className="portal-text-muted" role="status">
            Sign in to view your registered courses and use withdraw for this term.
          </p>
        </section>
      )}

      {isAuthenticated && termMissing && (
        <section className="portal-card portal-stack" aria-labelledby="add-drop-term-heading">
          <h2 id="add-drop-term-heading" className="portal-section-heading">
            Select a term
          </h2>
          <p className="portal-text-muted" role="status">
            Select an academic term above to view your registered courses. Withdraw is only available
            when a term is selected.
          </p>
        </section>
      )}

      {isAuthenticated && !termMissing && loadState === 'loading' && (
        <section className="portal-card portal-stack" aria-labelledby="add-drop-loading-heading">
          <h2 id="add-drop-loading-heading" className="portal-section-heading">
            Loading
          </h2>
          <p className="portal-text-muted" role="status">
            Loading your courses for this term…
          </p>
        </section>
      )}

      {isAuthenticated && !termMissing && loadState === 'error' && (
        <section className="portal-card portal-stack" aria-labelledby="add-drop-error-heading">
          <h2 id="add-drop-error-heading" className="portal-section-heading">
            Could not load courses
          </h2>
          <p className="portal-text-muted" role="status">
            {loadError ?? 'Something went wrong.'}
          </p>
          <button
            type="button"
            className="portal-btn portal-btn--primary portal-btn--compact"
            onClick={() => void loadWorkspace()}
          >
            Retry
          </button>
        </section>
      )}

      {isAuthenticated && !termMissing && loadState === 'idle' && (
        <section className="portal-card portal-stack" aria-labelledby="add-drop-workspace-heading">
          <h2 id="add-drop-workspace-heading" className="portal-section-heading">
            Your courses
          </h2>

          {!withdrawEligibility.withdrawAllowed && (
            <p className="portal-inline-note portal-inline-note--flush" role="status">
              {withdrawEligibility.reasonWhenDisabled}
            </p>
          )}

          {successMessage != null && (
            <p className="portal-inline-note portal-inline-note--flush" role="status">
              {successMessage}
            </p>
          )}

          {sections.length === 0 ? (
            <p className="portal-text-muted" role="status">
              No registered courses for this term.
            </p>
          ) : (
            <div className="portal-course-search-sections-table-wrap portal-course-search-sections-table-wrap--schedule">
              <div className="portal-course-search-sections-table-scroll">
                <table className="portal-table portal-table--course-sections portal-table--course-section-schedule">
                  <caption className="visually-hidden">
                    Your registered course sections for the selected term
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Course</th>
                      <th scope="col">Section</th>
                      <th scope="col">Days</th>
                      <th scope="col">Time</th>
                      <th scope="col">Instructor</th>
                      <th scope="col">Location</th>
                      <th scope="col">Status</th>
                      <th scope="col" className="portal-course-section-schedule-col-action">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.map((row) => {
                      const code = row.course_code.trim()
                      const cat = catalogByCode.get(code.toUpperCase())
                      const title = getPreferredCourseTitle(
                        {
                          code: row.course_code,
                          eng_name: cat?.eng_name ?? row.course_code,
                          chi_name: cat?.chi_name ?? null,
                        },
                        row.schedule_track,
                      )
                      const daysRaw = formatWeekdaysShortFromStored(row.weekday)
                      const timeRaw = formatTimeRangeHmsForDisplay(row.start_time, row.end_time)
                      const days = daysRaw === '—' ? 'TBA' : daysRaw
                      const time = timeRaw === '—' ? 'TBA' : timeRaw
                      const inst =
                        row.instructor?.trim() && row.instructor.trim() !== ''
                          ? row.instructor.trim()
                          : 'TBA'
                      const loc =
                        row.room?.trim() && row.room.trim() !== '' ? row.room.trim() : 'TBA'
                      const rowErr = rowErrorByCode[code]
                      const submitting = withdrawingCode === code
                      return (
                        <tr key={row.id}>
                          <td>
                            <div className="portal-course-bin-course-cell">
                              <span className="portal-course-bin-course-code">
                                {code || '—'}
                              </span>
                              <span className="portal-course-bin-course-title">{title}</span>
                            </div>
                          </td>
                          <td>{row.section_code.trim() || '—'}</td>
                          <td>{days}</td>
                          <td>{time}</td>
                          <td>{inst}</td>
                          <td>{loc}</td>
                          <td>Active</td>
                          <td className="portal-course-section-schedule-col-action">
                            <div className="portal-stack" style={{ gap: '0.35rem' }}>
                              <button
                                type="button"
                                className="portal-btn portal-btn--course-search-bin"
                                disabled={
                                  !withdrawEligibility.withdrawAllowed || submitting || code === ''
                                }
                                onClick={() => void handleWithdraw(row)}
                              >
                                {submitting ? 'Withdrawing…' : 'Withdraw'}
                              </button>
                              {rowErr != null && rowErr !== '' ? (
                                <span className="portal-text-muted" style={{ fontSize: '0.85rem' }}>
                                  {rowErr}
                                </span>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  )
}
