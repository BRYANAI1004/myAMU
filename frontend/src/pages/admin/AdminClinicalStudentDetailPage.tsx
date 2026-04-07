import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  fetchAdminStudentDetail,
  type AdminStudentDetail,
  type ClinicalProgress,
} from '../../lib/api'

function dashText(value: string | null | undefined): string {
  const s = value?.trim() ?? ''
  return s.length > 0 ? s : '—'
}

function clinicalReadinessLabel(readiness: ClinicalProgress['readiness']): string {
  return readiness === 'ready' ? 'Ready' : 'Not ready'
}

function clinicalHoursProgressPct(cp: ClinicalProgress): number {
  if (cp.requiredHours > 0) {
    return Math.min(100, Math.round((cp.completedHours / cp.requiredHours) * 100))
  }
  return cp.completedHours > 0 ? 100 : 0
}

export function AdminClinicalStudentDetailPage() {
  const { studentId: studentIdParam } = useParams<{ studentId: string }>()
  const studentId = studentIdParam ?? ''

  const [detail, setDetail] = useState<AdminStudentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!studentId.trim()) {
      setDetail(null)
      setLoading(false)
      setError('Missing student id.')
      return
    }

    const ac = new AbortController()
    setDetail(null)
    setLoading(true)
    setError(null)

    ;(async () => {
      try {
        const d = await fetchAdminStudentDetail(studentId, {
          signal: ac.signal,
        })
        if (ac.signal.aborted) return
        setDetail(d)
        setError(null)
      } catch (e) {
        if (ac.signal.aborted) return
        setDetail(null)
        setError(
          e instanceof Error ? e.message : 'Could not load clinical record.',
        )
      } finally {
        if (!ac.signal.aborted) {
          setLoading(false)
        }
      }
    })()

    return () => ac.abort()
  }, [studentId, reloadKey])

  const sectionLoading = loading && detail === null && error === null
  const cp = detail?.clinicalProgress

  return (
    <main className="admin-page">
      <div className="admin-page__toolbar">
        <div>
          <Link
            to="/admin/clinical"
            className="portal-text-muted"
            style={{ fontSize: '0.875rem', textDecoration: 'none' }}
          >
            ← Clinical roster
          </Link>
          <h1 className="admin-page__title admin-page__title--inline">
            {detail?.name ?? 'Student'}
          </h1>
          {detail ? (
            <p
              className="portal-text-muted"
              style={{
                fontSize: '0.875rem',
                marginTop: '0.35rem',
                marginBottom: 0,
              }}
            >
              Student ID: {dashText(detail.studentId)}
              {' · '}
              Division: {dashText(detail.division)}
              {' · '}
              Latest registration term: {dashText(detail.latestRegistrationTerm)}
            </p>
          ) : null}
        </div>
      </div>

      {sectionLoading ? (
        <section
          className="portal-card portal-profile-state"
          aria-busy="true"
          aria-live="polite"
        >
          <p className="portal-profile-state__title">Loading clinical record</p>
          <p className="portal-profile-state__detail">
            Please wait while we load this student&apos;s clinical progress from
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
            We could not load this clinical record
          </p>
          <p className="portal-profile-state__detail">{error}</p>
          <div className="portal-actions portal-profile-state__actions">
            <Link to="/admin/clinical" className="portal-btn portal-btn--secondary">
              Back to clinical roster
            </Link>
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

      {!sectionLoading && !error && detail ? (
        <section
          className={`portal-card portal-stack${cp ? ' portal-academics-progress-card' : ''}`}
          aria-labelledby="admin-clinical-student-progress"
        >
          <h2
            id="admin-clinical-student-progress"
            className="portal-section-heading"
          >
            Clinical progress
          </h2>
          {cp == null ? (
            <p
              className="portal-card-note admin-detail-empty"
              role="status"
            >
              Clinical progress is not available for this student record.
            </p>
          ) : (
            <>
              <div className="portal-grid-4">
                <div>
                  <p className="portal-card-label">Current level</p>
                  <p className="portal-card-value">{cp.level}</p>
                </div>
                <div>
                  <p className="portal-card-label">Hours</p>
                  <p className="portal-card-value">
                    {cp.completedHours} / {cp.requiredHours}
                  </p>
                </div>
                <div>
                  <p className="portal-card-label">Readiness</p>
                  <p className="portal-card-value">
                    <span
                      className={
                        cp.readiness === 'ready'
                          ? 'portal-status portal-status--paid'
                          : 'portal-status portal-status--pending'
                      }
                    >
                      {clinicalReadinessLabel(cp.readiness)}
                    </span>
                  </p>
                </div>
              </div>
              <div
                className="portal-academics-progress-track"
                role="progressbar"
                aria-valuenow={clinicalHoursProgressPct(cp)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Clinical hours progress"
              >
                <div
                  className="portal-academics-progress-fill"
                  style={{
                    width: `${clinicalHoursProgressPct(cp)}%`,
                  }}
                />
              </div>
              <p className="portal-academics-progress-caption portal-inline-note portal-inline-note--flush">
                {cp.completedHours} of {cp.requiredHours} required hours in
                clinical records.
              </p>
              <div className="portal-stack" style={{ gap: '0.75rem' }}>
                <div>
                  <p className="portal-card-label">Completed courses</p>
                  {cp.completedCourses.length === 0 ? (
                    <p className="portal-inline-note portal-inline-note--flush">
                      No clinical course rows on file yet.
                    </p>
                  ) : (
                    <p
                      className="portal-card-value"
                      style={{ marginTop: '0.25rem' }}
                    >
                      {cp.completedCourses.join(', ')}
                    </p>
                  )}
                </div>
                <div>
                  <p className="portal-card-label">Missing</p>
                  {cp.missing.length === 0 ? (
                    <p className="portal-inline-note portal-inline-note--flush">
                      No open items listed.
                    </p>
                  ) : (
                    <ul className="portal-module-list">
                      {cp.missing.map((item) => (
                        <li key={item} className="portal-module-list-item">
                          <span className="portal-module-list-label">
                            {item}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      ) : null}
    </main>
  )
}
