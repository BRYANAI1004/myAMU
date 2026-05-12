import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  deleteSelectedAdminStudents,
  downloadAdminStudentsCsv,
  fetchAdminStudents,
  type AdminStudentEnrollmentFilterOptions,
  type AdminStudentListItem,
  type AdminStudentsLoaFilter,
  type AdminStudentsListView,
  type AdminStudentsProgramFilter,
  type AdminStudentsTrackFilter,
} from '../../lib/api'
import { BulkEmailComposeModal } from '../../components/admin/BulkEmailComposeModal'

const PAGE_SIZE = 25
const SEARCH_DEBOUNCE_MS = 300

/* AMU/personal email selection happens inside `BulkEmailComposeModal` (it owns the choice
 * UI) — this page just builds the candidate list with both potential addresses. */

const EMPTY_ENROLLMENT_FILTER_OPTIONS: AdminStudentEnrollmentFilterOptions = {
  years: [],
  intakes: [],
  loaTerms: [],
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

function displayCell(value: string | null): string {
  if (value == null || value.trim() === '') return '—'
  return value
}

/** Display ISO `YYYY-MM-DD` as MM/DD/YYYY for table cells. */
function formatTableDate(iso: string | null): string {
  if (iso == null || iso.trim() === '') return '—'
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim())
  if (m) {
    const [, y, mo, d] = m
    return `${mo}/${d}/${y}`
  }
  return displayCell(iso)
}

const SHARED_STUDENT_TABLE_HEADERS = [
  'Student ID',
  'Name',
  'Division',
  'Email',
  'Program',
  'Signed Date',
  'Latest Registration Term',
] as const

function renderSharedStudentTableCells(row: AdminStudentListItem) {
  return (
    <>
      <td>{row.studentId}</td>
      <td>
        <Link
          to={`/admin/students/${encodeURIComponent(row.studentId)}`}
          className="admin-student-name-link"
        >
          {row.name}
        </Link>
      </td>
      <td>{row.division}</td>
      <td>{displayCell(row.email)}</td>
      <td>{row.program}</td>
      <td>{formatTableDate(row.signedDate)}</td>
      <td>{displayCell(row.latestRegistrationTerm)}</td>
    </>
  )
}

export function AdminStudentsPage() {
  const [view, setView] = useState<AdminStudentsListView>('roster')
  const [q, setQ] = useState('')
  const [program, setProgram] = useState<AdminStudentsProgramFilter>('all')
  const [loa, setLoa] = useState<AdminStudentsLoaFilter>('all')
  const [loaQuarter, setLoaQuarter] = useState('')
  const [loaYear, setLoaYear] = useState('')
  const [track, setTrack] = useState<AdminStudentsTrackFilter>('all')
  const [entryYear, setEntryYear] = useState('')
  const [intakeCode, setIntakeCode] = useState('')
  const debouncedSearch = useDebouncedValue(q.trim(), SEARCH_DEBOUNCE_MS)
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<AdminStudentListItem[] | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [deleteSummary, setDeleteSummary] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [bulkEmailSummary, setBulkEmailSummary] = useState<string | null>(null)
  const [emailModal, setEmailModal] = useState<{
    candidates: Array<{
      studentId: string
      name: string
      amuEmail: string | null
      personalEmail: string | null
    }>
  } | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [enrollmentFilterOptions, setEnrollmentFilterOptions] =
    useState<AdminStudentEnrollmentFilterOptions>(
      EMPTY_ENROLLMENT_FILTER_OPTIONS,
    )

  const isEnrollmentView = view === 'new-enrollment'
  const activeTrack = isEnrollmentView ? track : 'all'
  const activeEntryYear = isEnrollmentView ? entryYear : ''
  const activeIntakeCode = isEnrollmentView ? intakeCode : ''
  const activeLoa = isEnrollmentView ? 'all' : loa
  const activeLoaQuarter = isEnrollmentView ? '' : loaQuarter
  const activeLoaYear = isEnrollmentView ? '' : loaYear
  const selectedLoaTermValue =
    loaQuarter !== '' && loaYear !== '' ? `${loaQuarter}|${loaYear}` : ''

  const debouncedSearchPrev = useRef<string | null>(null)
  useEffect(() => {
    if (debouncedSearchPrev.current === null) {
      debouncedSearchPrev.current = debouncedSearch
      return
    }
    if (debouncedSearchPrev.current !== debouncedSearch) {
      debouncedSearchPrev.current = debouncedSearch
      setPage(1)
    }
  }, [debouncedSearch])

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        // Roster only: do not pass `clinicalSummary` (no per-page clinical batch on GET /api/admin/students).
        const res = await fetchAdminStudents({
          signal: ac.signal,
          page,
          pageSize: PAGE_SIZE,
          search: debouncedSearch,
          program,
          track: activeTrack,
          entryYear: activeEntryYear,
          intakeCode: activeIntakeCode,
          loa: activeLoa,
          loaQuarter: activeLoaQuarter,
          loaYear: activeLoaYear,
        })
        if (ac.signal.aborted) return
        setRows(res.items)
        setTotal(res.total)
        setEnrollmentFilterOptions(res.enrollmentFilterOptions)
        setError(null)
      } catch (e) {
        if (ac.signal.aborted) return
        setRows(null)
        setTotal(0)
        setEnrollmentFilterOptions(EMPTY_ENROLLMENT_FILTER_OPTIONS)
        setError(e instanceof Error ? e.message : 'Could not load students.')
      } finally {
        if (!ac.signal.aborted) {
          setLoading(false)
        }
      }
    })()
    return () => ac.abort()
  }, [
    page,
    debouncedSearch,
    program,
    activeTrack,
    activeEntryYear,
    activeIntakeCode,
    activeLoa,
    activeLoaQuarter,
    activeLoaYear,
    reloadKey,
  ])

  const items = rows ?? []

  const visibleIdSet = useMemo(
    () => new Set(items.map((r) => r.studentId)),
    [items],
  )

  useEffect(() => {
    setSelectedIds((prev) => {
      let changed = false
      const next = new Set<string>()
      for (const id of prev) {
        if (visibleIdSet.has(id)) next.add(id)
        else changed = true
      }
      if (!changed && next.size === prev.size) return prev
      return next
    })
  }, [visibleIdSet])

  const selectedInViewCount = useMemo(() => {
    let n = 0
    for (const id of selectedIds) {
      if (visibleIdSet.has(id)) n += 1
    }
    return n
  }, [selectedIds, visibleIdSet])

  const allVisibleSelected =
    !isEnrollmentView && items.length > 0 && selectedInViewCount === items.length

  const sectionLoading = loading && rows === null && error === null

  const canGoPrev = page > 1 && !sectionLoading && !error
  const canGoNext = !sectionLoading && !error && page * PAGE_SIZE < total

  const hasEnrollmentFilters =
    debouncedSearch !== '' ||
    program !== 'all' ||
    track !== 'all' ||
    entryYear !== '' ||
    intakeCode !== ''

  const hasRosterFilters =
    debouncedSearch !== '' ||
    program !== 'all' ||
    loa !== 'all' ||
    loaQuarter !== '' ||
    loaYear !== ''

  function toggleRow(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function toggleSelectAllVisible(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        for (const r of items) {
          next.add(r.studentId)
        }
      } else {
        for (const r of items) {
          next.delete(r.studentId)
        }
      }
      return next
    })
  }

  function resetEnrollmentFilters() {
    setQ('')
    setProgram('all')
    setTrack('all')
    setEntryYear('')
    setIntakeCode('')
    setPage(1)
  }

  function resetRosterFilters() {
    setQ('')
    setProgram('all')
    setLoa('all')
    setLoaQuarter('')
    setLoaYear('')
    setPage(1)
  }

  function changeView(nextView: AdminStudentsListView) {
    if (nextView === view) return
    setView(nextView)
    setPage(1)
    setSelectedIds(new Set())
    setDeleteSummary(null)
    setBulkEmailSummary(null)
    setEmailModal(null)
    setExportError(null)
  }

  function onBulkEmail() {
    setBulkEmailSummary(null)
    const candidates = items
      .filter((row) => selectedIds.has(row.studentId))
      .map((row) => ({
        studentId: row.studentId,
        name: row.name,
        amuEmail: row.amuEmail,
        personalEmail: row.email,
      }))
    if (candidates.length === 0) {
      setBulkEmailSummary('Select at least one student to email.')
      return
    }
    const hasAnyEmail = candidates.some(
      (c) =>
        (c.amuEmail != null && c.amuEmail.trim() !== '') ||
        (c.personalEmail != null && c.personalEmail.trim() !== ''),
    )
    if (!hasAnyEmail) {
      setBulkEmailSummary(
        `None of the ${candidates.length} selected student${
          candidates.length === 1 ? '' : 's'
        } have an email address on file.`,
      )
      return
    }
    setEmailModal({ candidates })
  }

  async function onDeleteSelected() {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    const ok = window.confirm(
      `Delete ${ids.length} selected student${ids.length === 1 ? '' : 's'}? This cannot be undone.`,
    )
    if (!ok) return
    setDeleting(true)
    setDeleteSummary(null)
    try {
      const res = await deleteSelectedAdminStudents(ids)
      const parts: string[] = []
      if (res.deletedStudentIds.length > 0) {
        parts.push(`Deleted: ${res.deletedStudentIds.join(', ')}`)
      }
      if (res.blocked.length > 0) {
        const lines = res.blocked.map((b) => `${b.studentId} — ${b.reason}`)
        parts.push(`Not deleted:\n${lines.join('\n')}`)
      }
      if (parts.length === 0) {
        parts.push('No changes were made.')
      }
      setDeleteSummary(parts.join('\n\n'))
      setSelectedIds(new Set())
      setReloadKey((k) => k + 1)
    } catch (e) {
      setDeleteSummary(
        e instanceof Error ? e.message : 'Delete request failed.',
      )
    } finally {
      setDeleting(false)
    }
  }

  async function onExportCsv() {
    setExporting(true)
    setExportError(null)
    try {
      if (isEnrollmentView) {
        await downloadAdminStudentsCsv({
          search: debouncedSearch,
          program,
          track,
          entryYear,
          intakeCode,
          view: 'new-enrollment',
        })
      } else {
        const ids = Array.from(selectedIds)
        if (ids.length > 0) {
          await downloadAdminStudentsCsv({
            studentIds: ids,
            view: 'roster',
          })
        } else {
          await downloadAdminStudentsCsv({
            search: debouncedSearch,
            program,
            loa,
            loaQuarter,
            loaYear,
            view: 'roster',
          })
        }
      }
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'CSV export failed.')
    } finally {
      setExporting(false)
    }
  }

  function onPrint() {
    window.print()
  }

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(page * PAGE_SIZE, total)
  const noActiveFilters = isEnrollmentView ? !hasEnrollmentFilters : !hasRosterFilters
  const emptyMessage =
    total === 0 && noActiveFilters
      ? 'No students on file.'
      : 'No students match your filters.'

  const printFilterSummary = [
    entryYear !== '' ? `Year: ${entryYear}` : null,
    intakeCode !== ''
      ? `Intake: ${
          enrollmentFilterOptions.intakes.find((option) => option.code === intakeCode)
            ?.label ?? intakeCode
        }`
      : null,
    program !== 'all' ? `Program: ${program.toUpperCase()}` : null,
    track === 'C' ? 'Track: Chinese' : track === 'E' ? 'Track: English' : null,
    debouncedSearch !== '' ? `Search: ${debouncedSearch}` : null,
  ]
    .filter((value): value is string => value != null)
    .join(' | ')

  return (
    <main
      className={`admin-page admin-students-page${
        isEnrollmentView ? ' admin-students-page--enrollment' : ''
      }`}
    >
      <div className="admin-page__toolbar admin-students-page__toolbar">
        <div className="admin-students-page__heading">
          <h1 className="admin-page__title admin-page__title--inline">Students</h1>
          <div
            className="admin-students-page__tabs portal-academics-print-hide"
            role="tablist"
            aria-label="Student list views"
          >
            <button
              type="button"
              className={`admin-students-page__tab${
                !isEnrollmentView ? ' admin-students-page__tab--active' : ''
              }`}
              role="tab"
              aria-selected={!isEnrollmentView}
              onClick={() => changeView('roster')}
            >
              All Students
            </button>
            <button
              type="button"
              className={`admin-students-page__tab${
                isEnrollmentView ? ' admin-students-page__tab--active' : ''
              }`}
              role="tab"
              aria-selected={isEnrollmentView}
              onClick={() => changeView('new-enrollment')}
            >
              New Enrollment List
            </button>
          </div>
        </div>

        {!isEnrollmentView ? (
          <div className="admin-students-page__primary-cta portal-academics-print-hide">
            <Link
              to="/admin/students/new"
              className="portal-btn portal-btn--primary"
            >
              Add Student
            </Link>
          </div>
        ) : null}

        {isEnrollmentView ? (
          <div className="admin-page__toolbar-actions admin-page__toolbar-actions--wrap portal-academics-print-hide">
            <select
              className="admin-input"
              value={entryYear}
              onChange={(e) => {
                setEntryYear(e.target.value)
                setPage(1)
              }}
              aria-label="Filter new enrollments by year"
              disabled={sectionLoading || Boolean(error)}
            >
              <option value="">All Years</option>
              {enrollmentFilterOptions.years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <select
              className="admin-input"
              value={intakeCode}
              onChange={(e) => {
                setIntakeCode(e.target.value)
                setPage(1)
              }}
              aria-label="Filter new enrollments by intake"
              disabled={sectionLoading || Boolean(error)}
            >
              <option value="">All Intakes</option>
              {enrollmentFilterOptions.intakes.map((intake) => (
                <option key={intake.code} value={intake.code}>
                  {intake.label}
                </option>
              ))}
            </select>
            <select
              className="admin-input"
              value={program}
              onChange={(e) => {
                setProgram(e.target.value as AdminStudentsProgramFilter)
                setPage(1)
              }}
              aria-label="Filter new enrollments by program"
              disabled={sectionLoading || Boolean(error)}
            >
              <option value="all">All Programs</option>
              <option value="dahm">DAHM</option>
              <option value="mahm">MAHM</option>
            </select>
            <select
              className="admin-input"
              value={track}
              onChange={(e) => {
                setTrack(e.target.value as AdminStudentsTrackFilter)
                setPage(1)
              }}
              aria-label="Filter new enrollments by track"
              disabled={sectionLoading || Boolean(error)}
            >
              <option value="all">All Tracks</option>
              <option value="C">Chinese</option>
              <option value="E">English</option>
            </select>
            <input
              type="search"
              className="admin-input admin-input--search"
              placeholder="Search by student ID, name, email, or program"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search new enrollments"
              disabled={sectionLoading || Boolean(error)}
            />
            <button
              type="button"
              className="portal-btn portal-btn--secondary"
              disabled={!hasEnrollmentFilters || loading}
              onClick={resetEnrollmentFilters}
            >
              Reset Filters
            </button>
            <button
              type="button"
              className="portal-btn portal-btn--secondary"
              disabled={loading || Boolean(error) || exporting}
              onClick={() => void onExportCsv()}
            >
              {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
            <button
              type="button"
              className="portal-btn portal-btn--secondary"
              disabled={sectionLoading || Boolean(error) || items.length === 0}
              onClick={onPrint}
            >
              Print
            </button>
          </div>
        ) : (
          <div className="admin-page__toolbar-actions admin-page__toolbar-actions--wrap portal-academics-print-hide">
            <input
              type="search"
              className="admin-input admin-input--search"
              placeholder="Search by student ID, name, email, or program"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search students"
              disabled={sectionLoading || Boolean(error)}
            />
            <select
              className="admin-input"
              value={program}
              onChange={(e) => {
                setProgram(e.target.value as AdminStudentsProgramFilter)
                setPage(1)
              }}
              aria-label="Filter students by program"
              disabled={sectionLoading || Boolean(error)}
            >
              <option value="all">All</option>
              <option value="dahm">DAHM</option>
              <option value="mahm">MAHM</option>
            </select>
            <select
              className="admin-input"
              value={loa}
              onChange={(e) => {
                const nextLoa = e.target.value as AdminStudentsLoaFilter
                setLoa(nextLoa)
                if (nextLoa === 'no') {
                  setLoaQuarter('')
                  setLoaYear('')
                }
                setPage(1)
              }}
              aria-label="Filter students by leave of absence history"
              disabled={sectionLoading || Boolean(error)}
            >
              <option value="all">LOA: All</option>
              <option value="yes">LOA: Yes</option>
              <option value="no">LOA: No</option>
            </select>
            <select
              className="admin-input"
              value={selectedLoaTermValue}
              onChange={(e) => {
                const value = e.target.value
                if (value === '') {
                  setLoaQuarter('')
                  setLoaYear('')
                } else {
                  const [quarter, year] = value.split('|')
                  setLoaQuarter(quarter ?? '')
                  setLoaYear(year ?? '')
                }
                setPage(1)
              }}
              aria-label="Filter students by LOA term"
              disabled={sectionLoading || Boolean(error) || loa === 'no'}
            >
              <option value="">All Terms</option>
              {enrollmentFilterOptions.loaTerms.map((loaTerm) => (
                <option
                  key={`${loaTerm.quarter}|${loaTerm.year}`}
                  value={`${loaTerm.quarter}|${loaTerm.year}`}
                >
                  {loaTerm.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="portal-btn portal-btn--secondary"
              disabled={!hasRosterFilters || loading}
              onClick={resetRosterFilters}
            >
              Reset Filters
            </button>
            <button
              type="button"
              className="portal-btn portal-btn--secondary"
              disabled={loading || Boolean(error) || exporting}
              onClick={() => void onExportCsv()}
            >
              {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
            <button
              type="button"
              className="portal-btn portal-btn--secondary"
              disabled={
                sectionLoading ||
                Boolean(error) ||
                selectedIds.size === 0 ||
                deleting
              }
              onClick={onBulkEmail}
              title="Open a new email in your default mail app with the selected students' emails in the BCC field"
            >
              Email Selected
            </button>
            <button
              type="button"
              className="portal-btn portal-btn--secondary"
              disabled={
                sectionLoading ||
                Boolean(error) ||
                selectedIds.size === 0 ||
                deleting
              }
              onClick={() => void onDeleteSelected()}
            >
              {deleting ? 'Deleting…' : 'Delete Selected'}
            </button>
          </div>
        )}
      </div>

      {isEnrollmentView ? (
        <section className="admin-students-page__print-header" aria-hidden="true">
          <h2 className="admin-students-page__print-title">New Enrollment List</h2>
          <p className="admin-students-page__print-meta">
            {printFilterSummary === '' ? 'All current new enrollment rows' : printFilterSummary}
          </p>
        </section>
      ) : null}

      {deleteSummary && !sectionLoading ? (
        <section
          className="portal-card portal-profile-state portal-academics-print-hide"
          role="status"
          aria-live="polite"
          style={{ marginBottom: '1rem' }}
        >
          <p className="portal-profile-state__title" style={{ marginTop: 0 }}>
            Delete result
          </p>
          <pre
            className="portal-profile-state__detail"
            style={{
              margin: 0,
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
              fontSize: '0.875rem',
            }}
          >
            {deleteSummary}
          </pre>
        </section>
      ) : null}

      {bulkEmailSummary && !sectionLoading ? (
        <section
          className="portal-card portal-profile-state portal-academics-print-hide"
          role="status"
          aria-live="polite"
          style={{ marginBottom: '1rem' }}
        >
          <p className="portal-profile-state__title" style={{ marginTop: 0 }}>
            Bulk email
          </p>
          <p
            className="portal-profile-state__detail"
            style={{ marginBottom: 0 }}
          >
            {bulkEmailSummary}
          </p>
          <div className="portal-actions portal-profile-state__actions">
            <button
              type="button"
              className="portal-btn portal-btn--secondary"
              onClick={() => setBulkEmailSummary(null)}
            >
              Dismiss
            </button>
          </div>
        </section>
      ) : null}

      {exportError && !sectionLoading ? (
        <section
          className="portal-card portal-profile-state portal-profile-state--error portal-academics-print-hide"
          role="alert"
          aria-live="assertive"
          style={{ marginBottom: '1rem' }}
        >
          <p className="portal-profile-state__title" style={{ marginTop: 0 }}>
            CSV export failed
          </p>
          <p className="portal-profile-state__detail" style={{ marginBottom: 0 }}>
            {exportError}
          </p>
        </section>
      ) : null}

      {sectionLoading ? (
        <section
          className="portal-card portal-profile-state portal-academics-print-hide"
          aria-busy="true"
          aria-live="polite"
        >
          <p className="portal-profile-state__title">Loading students</p>
          <p className="portal-profile-state__detail">
            Please wait while we load the student roster from the school database.
          </p>
        </section>
      ) : null}

      {!sectionLoading && error ? (
        <section
          className="portal-card portal-profile-state portal-profile-state--error portal-academics-print-hide"
          role="alert"
          aria-live="assertive"
        >
          <p className="portal-profile-state__title">We could not load students</p>
          <p className="portal-profile-state__detail">{error}</p>
          <div className="portal-actions portal-profile-state__actions">
            <button
              type="button"
              className="portal-btn portal-btn--secondary"
              onClick={() => setReloadKey((k) => k + 1)}
            >
              Try again
            </button>
          </div>
        </section>
      ) : null}

      {!sectionLoading && !error && rows != null ? (
        <>
          <div className="portal-table-wrap admin-table-wrap">
            <table className="portal-table portal-data-table admin-students-table--center">
              <thead>
                <tr>
                  {!isEnrollmentView ? (
                    <th scope="col" className="admin-students-table__select portal-academics-print-hide">
                      <input
                        type="checkbox"
                        aria-label="Select all visible students"
                        checked={allVisibleSelected}
                        onChange={(e) => toggleSelectAllVisible(e.target.checked)}
                        disabled={items.length === 0 || deleting}
                      />
                    </th>
                  ) : null}
                  {SHARED_STUDENT_TABLE_HEADERS.map((label) => (
                    <th key={label} scope="col">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={
                        SHARED_STUDENT_TABLE_HEADERS.length +
                        (!isEnrollmentView ? 1 : 0)
                      }
                      className="portal-card-note"
                    >
                      {emptyMessage}
                    </td>
                  </tr>
                ) : (
                  items.map((r) => (
                    <tr key={r.studentId}>
                      {!isEnrollmentView ? (
                        <td className="admin-students-table__select portal-academics-print-hide">
                          <input
                            type="checkbox"
                            aria-label={`Select ${r.studentId}`}
                            checked={selectedIds.has(r.studentId)}
                            onChange={(e) =>
                              toggleRow(r.studentId, e.target.checked)
                            }
                            disabled={deleting}
                          />
                        </td>
                      ) : null}
                      {renderSharedStudentTableCells(r)}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div
            className="portal-actions portal-academics-print-hide"
            style={{
              marginTop: '1rem',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '0.75rem 1rem',
            }}
          >
            <span className="portal-card-note" style={{ marginRight: 'auto' }}>
              {total === 0
                ? '0 results'
                : `Showing ${rangeStart}–${rangeEnd} of ${total}`}
            </span>
            <button
              type="button"
              className="portal-btn portal-btn--secondary"
              disabled={!canGoPrev || deleting}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span className="portal-card-note" aria-current="page">
              Page {page}
            </span>
            <button
              type="button"
              className="portal-btn portal-btn--secondary"
              disabled={!canGoNext || deleting}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      ) : null}

      {emailModal ? (
        <BulkEmailComposeModal
          candidates={emailModal.candidates}
          onClose={() => setEmailModal(null)}
          onSent={(response) => {
            setBulkEmailSummary(
              response.delivered
                ? `Email sent to ${response.recipientCount} recipient${
                    response.recipientCount === 1 ? '' : 's'
                  }${response.profileId ? ` (sender: ${response.profileId})` : ''}.`
                : (response.note ??
                    'Server received the message but did not deliver it.'),
            )
          }}
        />
      ) : null}
    </main>
  )
}
