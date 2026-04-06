import { Link } from 'react-router-dom'
import type { AcademicTerm, OpenRegistrationCourseRow } from '../../../lib/api'
import { adminSchedulingQueryString } from '../../../lib/adminSchedulingSearchParams'

type OpenRegistrationCoursesTableProps = {
  terms: AcademicTerm[] | null
  termId: string
  onTermIdChange: (id: string) => void
  termsLoading: boolean
  termsError: string | null
  search: string
  onSearchChange: (q: string) => void
  rows: OpenRegistrationCourseRow[]
  /** Row count before client search filter (for empty-state copy). */
  unfilteredCount: number
  loading: boolean
  error: string | null
}

export function OpenRegistrationCoursesTable({
  terms,
  termId,
  onTermIdChange,
  termsLoading,
  termsError,
  search,
  onSearchChange,
  rows,
  unfilteredCount,
  loading,
  error,
}: OpenRegistrationCoursesTableProps) {
  if (termsError) {
    return (
      <p className="admin-courses-feedback admin-courses-feedback--error" role="alert">
        {termsError}
      </p>
    )
  }

  if (!termsLoading && terms && terms.length === 0) {
    return (
      <p className="portal-text-muted admin-courses-feedback" aria-live="polite">
        No academic terms are available. Add terms before using this view.
      </p>
    )
  }

  return (
    <>
      <div className="admin-page__toolbar admin-page__toolbar--courses-open">
        <input
          type="search"
          className="admin-input admin-input--search"
          placeholder="Search by course code or title"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search open-registration courses"
        />
        <div className="admin-page__toolbar-actions admin-page__toolbar-actions--open-term">
          <label className="admin-courses-term-field">
            <span className="admin-courses-term-field__label">Term</span>
            <select
              className="admin-input"
              value={termId}
              onChange={(e) => onTermIdChange(e.target.value)}
              disabled={termsLoading || !terms?.length}
              aria-label="Academic term"
            >
              {termsLoading || !terms?.length ? (
                <option value="">Loading…</option>
              ) : (
                terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.term_label}
                  </option>
                ))
              )}
            </select>
          </label>
        </div>
      </div>

      {error ? (
        <p className="admin-courses-feedback admin-courses-feedback--error" role="alert">
          {error}
        </p>
      ) : null}

      {!error && loading ? (
        <p className="portal-text-muted admin-courses-feedback" aria-live="polite">
          Loading…
        </p>
      ) : null}

      {!error && !loading && termId && rows.length === 0 ? (
        <p className="portal-text-muted admin-courses-feedback" aria-live="polite">
          {unfilteredCount > 0
            ? 'No courses match your search.'
            : 'No courses are currently open for registration for this term.'}
        </p>
      ) : null}

      {!error && !loading && rows.length > 0 ? (
        <div className="portal-table-wrap admin-table-wrap">
          <table className="portal-table portal-data-table">
            <thead>
              <tr>
                <th scope="col">Course Code</th>
                <th scope="col">Course Title</th>
                <th scope="col">Credits</th>
                <th scope="col">Category</th>
                <th scope="col">Term</th>
                <th scope="col">Open Sections</th>
                <th scope="col">Registration Status</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.courseCode}>
                  <td>{r.courseCode}</td>
                  <td>{r.courseTitle}</td>
                  <td>{Number.isInteger(r.credits) ? String(r.credits) : String(r.credits)}</td>
                  <td>{r.category}</td>
                  <td>{r.termLabel}</td>
                  <td>{r.openSections}</td>
                  <td>{r.registrationStatus}</td>
                  <td>
                    <Link
                      to={`/admin/course-sections?${adminSchedulingQueryString({
                        term: termId,
                        course: r.courseCode,
                      })}`}
                      className="portal-btn portal-btn--secondary portal-btn--compact"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  )
}
