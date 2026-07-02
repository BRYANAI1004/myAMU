import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAdminPortalTerm } from '../../context/AdminPortalTermContext'
import { AdminCourseFeedbackModal } from '../../components/admin/AdminCourseFeedbackModal'
import {
  downloadAdminFeedbackCsv,
  fetchAdminCourseSectionEnrollments,
  fetchAdminCourseSections,
  type AdminCourseSection,
  type AdminCourseSectionEnrollmentRow,
} from '../../lib/api'
import { getPreferredCourseTitle } from '../../lib/courseDisplayName'
import { scheduleTrackTableLabel } from '../../lib/scheduleTrack'

const SEARCH_DEBOUNCE_MS = 250

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

function academicStatusLabel(status: string): string {
  const s = status.trim().toLowerCase()
  if (s === 'completed') return 'Completed'
  if (s === 'active') return 'Active'
  if (s === 'withdrawn') return 'Withdrawn'
  if (s === 'dropped') return 'Dropped'
  if (s === 'unknown' || s === '') return '—'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function dedupeRosterRows(
  rows: AdminCourseSectionEnrollmentRow[],
): AdminCourseSectionEnrollmentRow[] {
  const statusRank: Record<string, number> = {
    completed: 0,
    active: 1,
    dropped: 2,
    withdrawn: 3,
    unknown: 4,
  }
  const byId = new Map<string, AdminCourseSectionEnrollmentRow>()
  for (const row of rows) {
    const existing = byId.get(row.studentId)
    if (!existing) {
      byId.set(row.studentId, row)
      continue
    }
    if (row.feedbackSubmitted && !existing.feedbackSubmitted) {
      byId.set(row.studentId, row)
      continue
    }
    if (!row.feedbackSubmitted && existing.feedbackSubmitted) continue
    const rankA = statusRank[existing.status.trim().toLowerCase()] ?? 99
    const rankB = statusRank[row.status.trim().toLowerCase()] ?? 99
    if (rankB < rankA) byId.set(row.studentId, row)
  }
  return Array.from(byId.values())
}

function sectionSearchHaystack(row: AdminCourseSection): string {
  const title = getPreferredCourseTitle(
    { code: row.course_code, eng_name: row.course_title, chi_name: null },
    row.schedule_track,
  )
  return [
    row.course_code,
    row.section_code,
    title,
    row.instructor ?? '',
    scheduleTrackTableLabel(row.schedule_track),
  ]
    .join(' ')
    .toLowerCase()
}

export function AdminFeedbackPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    terms,
    activeTermId,
    setActiveTermId,
    loading: portalTermLoading,
  } = useAdminPortalTerm()
  const termId = activeTermId
  const sectionIdParam = searchParams.get('section')?.trim() ?? ''
  const [sectionQuery, setSectionQuery] = useState('')
  const debouncedSectionQuery = useDebouncedValue(
    sectionQuery,
    SEARCH_DEBOUNCE_MS,
  )

  const [sections, setSections] = useState<AdminCourseSection[] | null>(null)
  const [sectionsLoading, setSectionsLoading] = useState(false)
  const [sectionsError, setSectionsError] = useState<string | null>(null)

  const [students, setStudents] = useState<AdminCourseSectionEnrollmentRow[]>(
    [],
  )
  const [rosterLoading, setRosterLoading] = useState(false)
  const [rosterError, setRosterError] = useState<string | null>(null)

  const [feedbackStudentId, setFeedbackStudentId] = useState<string | null>(
    null,
  )
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const selectedSectionId = useMemo(() => {
    if (sectionIdParam === '') return null
    const n = Number(sectionIdParam)
    return Number.isInteger(n) && n > 0 ? n : null
  }, [sectionIdParam])

  const selectedSection = useMemo(
    () => sections?.find((s) => s.id === selectedSectionId) ?? null,
    [sections, selectedSectionId],
  )

  const selectedTerm = useMemo(
    () => terms.find((t) => t.id === termId) ?? null,
    [terms, termId],
  )

  const rosterTermName = selectedTerm?.term_name ?? null
  const rosterTermYear = selectedTerm?.year ?? null
  const inDetailView = selectedSectionId != null

  useEffect(() => {
    if (portalTermLoading || termId === '') return
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('term', termId)
        return next
      },
      { replace: true },
    )
  }, [termId, portalTermLoading, setSearchParams])

  useEffect(() => {
    if (termId === '') {
      setSections(null)
      setSectionsError(null)
      return
    }
    const ac = new AbortController()
    setSectionsLoading(true)
    setSectionsError(null)
    ;(async () => {
      try {
        const rows = await fetchAdminCourseSections({
          academicTermId: termId,
          signal: ac.signal,
        })
        if (ac.signal.aborted) return
        setSections(rows)
      } catch (e) {
        if (ac.signal.aborted) return
        setSections([])
        setSectionsError(
          e instanceof Error ? e.message : 'Could not load course sections.',
        )
      } finally {
        if (!ac.signal.aborted) setSectionsLoading(false)
      }
    })()
    return () => ac.abort()
  }, [termId])

  useEffect(() => {
    if (
      selectedSectionId == null ||
      termId === '' ||
      selectedSection == null
    ) {
      setStudents([])
      setRosterError(null)
      return
    }
    const ac = new AbortController()
    setRosterLoading(true)
    setRosterError(null)
    ;(async () => {
      try {
        const rows = await fetchAdminCourseSectionEnrollments({
          academicTermId: termId,
          courseCode: selectedSection.course_code,
          courseSectionId: selectedSectionId,
          signal: ac.signal,
        })
        if (ac.signal.aborted) return
        setStudents(dedupeRosterRows(rows))
      } catch (e) {
        if (ac.signal.aborted) return
        setStudents([])
        setRosterError(
          e instanceof Error ? e.message : 'Could not load student roster.',
        )
      } finally {
        if (!ac.signal.aborted) setRosterLoading(false)
      }
    })()
    return () => ac.abort()
  }, [selectedSectionId, termId, selectedSection])

  const setTerm = useCallback(
    (nextTermId: string) => {
      setSectionQuery('')
      setActiveTermId(nextTermId)
      setSearchParams(nextTermId ? { term: nextTermId } : {})
    },
    [setActiveTermId, setSearchParams],
  )

  const openSection = useCallback(
    (sectionId: number) => {
      setSearchParams({ term: termId, section: String(sectionId) })
    },
    [setSearchParams, termId],
  )

  const backToSections = useCallback(() => {
    setSearchParams(termId ? { term: termId } : {})
  }, [setSearchParams, termId])

  const filteredSections = useMemo(() => {
    const list = sections ?? []
    const needle = debouncedSectionQuery.trim().toLowerCase()
    if (needle === '') return list
    return list.filter((row) => sectionSearchHaystack(row).includes(needle))
  }, [sections, debouncedSectionQuery])

  const submittedCount = useMemo(
    () => students.filter((s) => s.feedbackSubmitted === true).length,
    [students],
  )

  const onExportCsv = useCallback(async () => {
    if (selectedSectionId == null) return
    setExportError(null)
    setExporting(true)
    try {
      await downloadAdminFeedbackCsv(selectedSectionId)
    } catch (e) {
      setExportError(
        e instanceof Error ? e.message : 'CSV export failed.',
      )
    } finally {
      setExporting(false)
    }
  }, [selectedSectionId])

  const sectionTitle = selectedSection
    ? getPreferredCourseTitle(
        {
          code: selectedSection.course_code,
          eng_name: selectedSection.course_title,
          chi_name: null,
        },
        selectedSection.schedule_track,
      )
    : null

  return (
    <main className="admin-page admin-feedback-page">
      <header className="admin-feedback-page__header">
        <h1 className="admin-page__title">Feedback</h1>
        <p className="admin-page__lede">
          Browse course sections, review student evaluations, and export anonymous
          CSV reports.
        </p>
      </header>

      <div className="admin-feedback-page__toolbar">
        <label className="admin-feedback-page__term">
          <span className="visually-hidden">Term</span>
          <select
            className="admin-input"
            value={termId}
            onChange={(e) => setTerm(e.target.value)}
            disabled={portalTermLoading}
          >
            <option value="">Select term…</option>
            {(terms ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.term_label}
              </option>
            ))}
          </select>
        </label>

        {!inDetailView ? (
          <label className="admin-feedback-page__search">
            <span className="visually-hidden">Filter sections</span>
            <input
              type="search"
              className="admin-input admin-input--search"
              placeholder="Filter by course, section, or instructor…"
              value={sectionQuery}
              disabled={termId === ''}
              onChange={(e) => setSectionQuery(e.target.value)}
            />
          </label>
        ) : null}
      </div>

      {sectionsError != null && (
        <p className="admin-form-message" role="alert">
          {sectionsError}
        </p>
      )}

      {termId === '' ? (
        <p className="portal-text-muted admin-feedback-page__placeholder">
          Select a term to get started.
        </p>
      ) : !inDetailView ? (
        <section className="admin-feedback-page__panel" aria-label="Course sections">
          {sectionsLoading ? (
            <p className="portal-text-muted admin-feedback-page__placeholder">
              Loading sections…
            </p>
          ) : filteredSections.length === 0 ? (
            <p className="portal-text-muted admin-feedback-page__placeholder">
              {debouncedSectionQuery.trim() !== ''
                ? 'No sections match your filter.'
                : 'No sections found for this term.'}
            </p>
          ) : (
            <div className="portal-table-wrap">
              <table className="portal-table admin-feedback-page__table">
                <thead>
                  <tr>
                    <th scope="col">Course</th>
                    <th scope="col">Section</th>
                    <th scope="col">Track</th>
                    <th scope="col">Instructor</th>
                    <th scope="col">Enrolled</th>
                    <th scope="col">
                      <span className="visually-hidden">Open</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSections.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <span className="admin-feedback-page__course-code">
                          {row.course_code}
                        </span>
                        {row.course_title?.trim() ? (
                          <span className="admin-feedback-page__course-title">
                            {getPreferredCourseTitle(
                              {
                                code: row.course_code,
                                eng_name: row.course_title,
                                chi_name: null,
                              },
                              row.schedule_track,
                            )}
                          </span>
                        ) : null}
                      </td>
                      <td>{row.section_code}</td>
                      <td>{scheduleTrackTableLabel(row.schedule_track)}</td>
                      <td>{row.instructor?.trim() || '—'}</td>
                      <td>{row.enrolled_count}</td>
                      <td className="admin-feedback-page__actions-col">
                        <button
                          type="button"
                          className="portal-btn portal-btn--secondary portal-btn--compact"
                          onClick={() => openSection(row.id)}
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : selectedSection == null ? (
        <p className="portal-text-muted admin-feedback-page__placeholder">
          Section not found.{' '}
          <button
            type="button"
            className="admin-feedback-page__text-btn"
            onClick={backToSections}
          >
            Back to sections
          </button>
        </p>
      ) : (
        <section className="admin-feedback-page__panel" aria-label="Section evaluations">
          <div className="admin-feedback-page__detail-bar">
            <button
              type="button"
              className="admin-feedback-page__back"
              onClick={backToSections}
            >
              ← Sections
            </button>
            <div className="admin-feedback-page__detail-main">
              <h2 className="admin-feedback-page__detail-title">
                {selectedSection.course_code} · {selectedSection.section_code}
              </h2>
              <p className="admin-feedback-page__detail-sub">
                {sectionTitle}
                {' · '}
                {selectedTerm?.term_label ?? termId}
                {' · '}
                {scheduleTrackTableLabel(selectedSection.schedule_track)}
              </p>
            </div>
            <div className="admin-feedback-page__detail-side">
              <p className="admin-feedback-page__detail-stats">
                {rosterLoading
                  ? 'Loading…'
                  : `${submittedCount} submitted · ${students.length} enrolled`}
              </p>
              <button
                type="button"
                className="portal-btn portal-btn--secondary portal-btn--compact"
                disabled={exporting}
                onClick={() => void onExportCsv()}
              >
                {exporting ? 'Exporting…' : 'Export CSV'}
              </button>
            </div>
          </div>

          {exportError != null && (
            <p className="admin-form-message" role="alert">
              {exportError}
            </p>
          )}
          {rosterError != null && (
            <p className="admin-form-message" role="alert">
              {rosterError}
            </p>
          )}

          {rosterLoading ? (
            <p className="portal-text-muted admin-feedback-page__placeholder">
              Loading students…
            </p>
          ) : students.length === 0 ? (
            <p className="portal-text-muted admin-feedback-page__placeholder">
              No students enrolled in this section.
            </p>
          ) : (
            <div className="portal-table-wrap">
              <table className="portal-table admin-feedback-page__table">
                <thead>
                  <tr>
                    <th scope="col">Student</th>
                    <th scope="col">Status</th>
                    <th scope="col">Evaluation</th>
                    <th scope="col">
                      <span className="visually-hidden">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => {
                    const submitted = s.feedbackSubmitted === true
                    const completed =
                      s.status.trim().toLowerCase() === 'completed'
                    return (
                      <tr key={s.studentId}>
                        <td>
                          <span className="admin-feedback-page__student-name">
                            {s.name?.trim() || '—'}
                          </span>
                          <span className="admin-feedback-page__student-id">
                            {s.studentId}
                          </span>
                        </td>
                        <td>{academicStatusLabel(s.status)}</td>
                        <td>
                          <span
                            className={
                              submitted
                                ? 'admin-feedback-page__badge admin-feedback-page__badge--submitted'
                                : completed
                                  ? 'admin-feedback-page__badge admin-feedback-page__badge--pending'
                                  : 'admin-feedback-page__badge admin-feedback-page__badge--na'
                            }
                          >
                            {submitted
                              ? 'Submitted'
                              : completed
                                ? 'Pending'
                                : 'Not eligible'}
                          </span>
                        </td>
                        <td className="admin-feedback-page__actions-col">
                          <button
                            type="button"
                            className="portal-btn portal-btn--secondary portal-btn--compact"
                            disabled={
                              !submitted ||
                              rosterTermName == null ||
                              rosterTermYear == null
                            }
                            onClick={() => setFeedbackStudentId(s.studentId)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {feedbackStudentId != null &&
        selectedSection != null &&
        rosterTermName != null &&
        rosterTermYear != null && (
          <AdminCourseFeedbackModal
            studentId={feedbackStudentId}
            courseCode={selectedSection.course_code}
            term={rosterTermName}
            year={rosterTermYear}
            onClose={() => setFeedbackStudentId(null)}
          />
        )}
    </main>
  )
}
