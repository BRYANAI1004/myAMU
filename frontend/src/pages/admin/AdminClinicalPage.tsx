import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchAdminStudents,
  type AdminStudentClinicalProgressSummary,
  type AdminStudentListItem,
} from '../../lib/api'

const PAGE_SIZE = 25
const SEARCH_DEBOUNCE_MS = 300

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

function clinicalReadinessLabel(
  readiness: AdminStudentClinicalProgressSummary['readiness'],
): string {
  return readiness === 'ready' ? 'Ready' : 'Not ready'
}

export function AdminClinicalPage() {
  const [q, setQ] = useState('')
  const debouncedSearch = useDebouncedValue(q.trim(), SEARCH_DEBOUNCE_MS)
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<AdminStudentListItem[] | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

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
        const res = await fetchAdminStudents({
          signal: ac.signal,
          page,
          pageSize: PAGE_SIZE,
          search: debouncedSearch,
          clinicalSummary: true,
        })
        if (ac.signal.aborted) return
        setRows(res.items)
        setTotal(res.total)
        setError(null)
      } catch (e) {
        if (ac.signal.aborted) return
        setRows(null)
        setTotal(0)
        setError(
          e instanceof Error ? e.message : 'Could not load clinical roster.',
        )
      } finally {
        if (!ac.signal.aborted) {
          setLoading(false)
        }
      }
    })()
    return () => ac.abort()
  }, [page, debouncedSearch, reloadKey])

  const items = rows ?? []
  const sectionLoading = loading && rows === null && error === null

  const canGoPrev = page > 1 && !sectionLoading && !error
  const canGoNext =
    !sectionLoading && !error && page * PAGE_SIZE < total

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(page * PAGE_SIZE, total)

  return (
    <main className="admin-page">
      <div className="admin-page__toolbar">
        <h1 className="admin-page__title admin-page__title--inline">Clinical</h1>
        <div className="admin-page__toolbar-actions">
          <input
            type="search"
            className="admin-input admin-input--search"
            placeholder="Search by student ID, name, email, or program"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search clinical roster"
            disabled={sectionLoading || Boolean(error)}
          />
        </div>
      </div>

      {sectionLoading ? (
        <section
          className="portal-card portal-profile-state"
          aria-busy="true"
          aria-live="polite"
        >
          <p className="portal-profile-state__title">Loading clinical roster</p>
          <p className="portal-profile-state__detail">
            Please wait while we load each student&apos;s clinical progress from
            the school database.
          </p>
        </section>
      ) : null}

      {!sectionLoading && error ? (
        <section
          className="portal-card portal-profile-state portal-profile-state--error"
          role="alert"
          aria-live="assertive"
        >
          <p className="portal-profile-state__title">
            We could not load the clinical roster
          </p>
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
                  <th scope="col">Student ID</th>
                  <th scope="col">Name</th>
                  <th scope="col">Clinical level</th>
                  <th scope="col">Completed hours</th>
                  <th scope="col">Required hours</th>
                  <th scope="col">Readiness</th>
                  <th scope="col">Missing</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="portal-card-note">
                      {total === 0 && debouncedSearch === ''
                        ? 'No students on file.'
                        : 'No students match your search.'}
                    </td>
                  </tr>
                ) : (
                  items.map((r) => {
                    const s = r.clinicalProgressSummary
                    return (
                      <tr key={r.studentId}>
                        <td>{r.studentId}</td>
                        <td>{r.name}</td>
                        <td>
                          {s ? (
                            <span className="portal-status portal-status--scheduled">
                              Level {s.level}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>{s != null ? s.completedHours : '—'}</td>
                        <td>{s != null ? s.requiredHours : '—'}</td>
                        <td>
                          {s ? (
                            <span
                              className={
                                s.readiness === 'ready'
                                  ? 'portal-status portal-status--paid'
                                  : 'portal-status portal-status--pending'
                              }
                            >
                              {clinicalReadinessLabel(s.readiness)}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td
                          style={{
                            maxWidth: '14rem',
                            textAlign: 'left',
                            whiteSpace: 'normal',
                          }}
                        >
                          {s == null ? (
                            '—'
                          ) : s.missingCount === 0 ? (
                            <span className="portal-card-note">None</span>
                          ) : (
                            <>
                              <span className="portal-card-note">
                                {s.missingCount}{' '}
                                {s.missingCount === 1 ? 'item' : 'items'}
                              </span>
                              {s.missingSummary ? (
                                <div
                                  style={{
                                    marginTop: '0.25rem',
                                    fontSize: '0.8125rem',
                                    lineHeight: 1.35,
                                  }}
                                >
                                  {s.missingSummary}
                                </div>
                              ) : null}
                            </>
                          )}
                        </td>
                        <td>
                          <Link
                            to={`/admin/students/${encodeURIComponent(r.studentId)}`}
                            className="portal-btn portal-btn--secondary"
                            style={{
                              display: 'inline-flex',
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.8125rem',
                            }}
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div
            className="portal-actions"
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
              disabled={!canGoPrev}
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
              disabled={!canGoNext}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      ) : null}
    </main>
  )
}
