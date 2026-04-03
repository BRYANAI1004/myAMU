import { useEffect, useMemo, useState } from 'react'
import { useAccount } from '../../context/AccountContext'
import {
  fetchStudentTranscriptPreview,
  type StudentTranscriptPreviewResponse,
} from '../../lib/api'
import {
  buildTranscriptTermOptions,
  computeQuarterTermSummary,
  defaultTermKeyFromPreview,
  formatCreditCell,
  groupTranscriptByTermYear,
  rowsForSelectedTerm,
  termYearKey,
} from '../../lib/academicsTranscriptDisplay'

type AcademicsMode = 'quarter' | 'transcript'

/** Displayed in transcript masthead (print + screen). */
const SCHOOL_TITLE = 'ALHAMBRA MEDICAL UNIVERSITY'

function formatIssueDate(): string {
  try {
    return new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

function formatSummaryDecimal(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2)
}

const GRADES_TABLE_CLASS =
  'portal-table portal-table--grades portal-academics-portal-grades-table'

export function AcademicsPortalPage() {
  const { currentStudentId } = useAccount()
  const [mode, setMode] = useState<AcademicsMode>('quarter')
  const [transcriptPreview, setTranscriptPreview] =
    useState<StudentTranscriptPreviewResponse | null>(null)
  const [transcriptPreviewError, setTranscriptPreviewError] = useState<
    string | null
  >(null)
  const [transcriptPreviewLoading, setTranscriptPreviewLoading] =
    useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  useEffect(() => {
    const id = currentStudentId?.trim()
    if (!id) {
      setTranscriptPreview(null)
      setTranscriptPreviewError(null)
      setTranscriptPreviewLoading(false)
      setSelectedKey(null)
      return
    }

    const ac = new AbortController()
    setTranscriptPreview(null)
    setTranscriptPreviewError(null)
    setTranscriptPreviewLoading(true)
    setSelectedKey(null)

    ;(async () => {
      try {
        const data = await fetchStudentTranscriptPreview(id, {
          signal: ac.signal,
        })
        if (ac.signal.aborted) return
        setTranscriptPreview(data)
        const opts = buildTranscriptTermOptions(data.transcript)
        setSelectedKey(defaultTermKeyFromPreview(opts))
        setTranscriptPreviewError(null)
      } catch (e) {
        if (ac.signal.aborted) return
        setTranscriptPreview(null)
        setTranscriptPreviewError(
          e instanceof Error
            ? e.message
            : 'Could not load transcript preview.',
        )
      } finally {
        if (!ac.signal.aborted) {
          setTranscriptPreviewLoading(false)
        }
      }
    })()

    return () => ac.abort()
  }, [currentStudentId, reloadKey])

  const termOptions = useMemo(
    () =>
      transcriptPreview
        ? buildTranscriptTermOptions(transcriptPreview.transcript)
        : [],
    [transcriptPreview],
  )

  useEffect(() => {
    if (!transcriptPreview) return
    if (termOptions.length === 0) {
      if (selectedKey != null) setSelectedKey(null)
      return
    }
    const valid = new Set(termOptions.map((o) => o.key))
    if (selectedKey != null && !valid.has(selectedKey)) {
      setSelectedKey(defaultTermKeyFromPreview(termOptions))
    }
  }, [transcriptPreview, termOptions, selectedKey])

  const groupedPreview = useMemo(
    () =>
      transcriptPreview
        ? groupTranscriptByTermYear(transcriptPreview.transcript)
        : [],
    [transcriptPreview],
  )

  const quarterRows = useMemo(() => {
    if (!transcriptPreview || !selectedKey) return []
    const parts = selectedKey.split('\t')
    const selectedTerm = parts[0] ?? ''
    const selectedYear = Number(parts[1])
    return rowsForSelectedTerm(
      transcriptPreview.transcript,
      selectedTerm,
      selectedYear,
    )
  }, [transcriptPreview, selectedKey])

  const termSummary = useMemo(
    () => computeQuarterTermSummary(quarterRows),
    [quarterRows],
  )

  const id = currentStudentId?.trim()
  const showEmpty = !id
  const sectionLoading =
    transcriptPreviewLoading &&
    transcriptPreview === null &&
    transcriptPreviewError === null
  const loadError =
    transcriptPreviewError != null && transcriptPreview === null

  const issueDate = formatIssueDate()

  return (
    <main className="portal-page portal-stack">
      <div
        className="portal-academics-print-hide"
        role="tablist"
        aria-label="Academics view"
      >
        <div className="portal-tab-group portal-academics-portal-tabs">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'quarter'}
            className={[
              'portal-tab',
              mode === 'quarter' ? 'portal-tab--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => setMode('quarter')}
          >
            Quarter Grades
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'transcript'}
            className={[
              'portal-tab',
              mode === 'transcript' ? 'portal-tab--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => setMode('transcript')}
          >
            Transcript Preview
          </button>
        </div>
      </div>

      {showEmpty ? (
        <section
          className="portal-card portal-profile-state"
          aria-live="polite"
        >
          <p className="portal-profile-state__title">Sign in to view academics</p>
          <p className="portal-profile-state__detail">
            Your grades and transcript appear here after you log in with your
            student account.
          </p>
        </section>
      ) : null}

      {sectionLoading ? (
        <section
          className="portal-card portal-profile-state"
          aria-busy="true"
          aria-live="polite"
        >
          <p className="portal-profile-state__title">Loading academics</p>
          <p className="portal-profile-state__detail">
            Please wait while we load your record.
          </p>
        </section>
      ) : null}

      {!showEmpty && !sectionLoading && loadError ? (
        <section
          className="portal-card portal-profile-state portal-profile-state--error"
          role="alert"
          aria-live="assertive"
        >
          <p className="portal-profile-state__title">
            We could not load your academics
          </p>
          <p className="portal-profile-state__detail">{transcriptPreviewError}</p>
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

      {!showEmpty && !sectionLoading && !loadError && transcriptPreview && mode === 'quarter' ? (
        <section className="portal-stack" aria-label="Quarter grades">
          <div className="portal-account-ledger__toolbar portal-academics-print-hide portal-academics-term-toolbar">
            <label
              className="portal-account-ledger__quarter-label"
              htmlFor="academics-term-select"
            >
              <span className="visually-hidden">Term</span>
              <select
                id="academics-term-select"
                className="portal-account-ledger__select"
                value={selectedKey ?? ''}
                onChange={(e) => setSelectedKey(e.target.value || null)}
              >
                {termOptions.length === 0 ? (
                  <option value="">No terms on file</option>
                ) : null}
                {termOptions.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="portal-table-wrap">
            <table className={GRADES_TABLE_CLASS}>
              <thead>
                <tr>
                  <th scope="col">Code</th>
                  <th scope="col">Course title</th>
                  <th scope="col">Grade</th>
                  <th scope="col">Numeric grade</th>
                  <th scope="col">Credit</th>
                </tr>
              </thead>
              <tbody>
                {quarterRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="portal-card-note">
                      No graded courses for this term.
                    </td>
                  </tr>
                ) : (
                  quarterRows.map((row, idx) => (
                    <tr
                      key={`${row.courseCode}-${row.term}-${row.year}-${idx}`}
                    >
                      <td>{row.courseCode}</td>
                      <td className="portal-academics-course-title-cell">
                        <span className="portal-academics-course-title__en">
                          {row.courseTitle?.trim()
                            ? row.courseTitle.trim()
                            : '—'}
                        </span>
                      </td>
                      <td>{row.grade?.trim() ? row.grade : '—'}</td>
                      <td>
                        {row.numericGrade != null &&
                        Number.isFinite(row.numericGrade)
                          ? String(row.numericGrade)
                          : '—'}
                      </td>
                      <td>{formatCreditCell(row)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <section
            className="portal-academics-quarter-term-summary"
            aria-labelledby="quarter-term-summary-heading"
          >
            <h3
              id="quarter-term-summary-heading"
              className="portal-academics-quarter-term-summary__title"
            >
              Term Summary
            </h3>
            <dl className="portal-academics-quarter-term-summary__dl">
              <div className="portal-academics-quarter-term-summary__row">
                <dt>Course Count</dt>
                <dd>{termSummary.courseCount}</dd>
              </div>
              <div className="portal-academics-quarter-term-summary__row">
                <dt>Units Attempted</dt>
                <dd>{formatSummaryDecimal(termSummary.unitsAttempted)}</dd>
              </div>
              <div className="portal-academics-quarter-term-summary__row">
                <dt>Units Completed</dt>
                <dd>{formatSummaryDecimal(termSummary.unitsCompleted)}</dd>
              </div>
              <div className="portal-academics-quarter-term-summary__row">
                <dt>Grade Points</dt>
                <dd>{formatSummaryDecimal(termSummary.gradePoints)}</dd>
              </div>
              <div className="portal-academics-quarter-term-summary__row">
                <dt>Term GPA</dt>
                <dd>
                  {termSummary.termGpa == null
                    ? '—'
                    : formatSummaryDecimal(termSummary.termGpa)}
                </dd>
              </div>
            </dl>
          </section>
        </section>
      ) : null}

      {!showEmpty && !sectionLoading && !loadError && transcriptPreview && mode === 'transcript' ? (
        <div className="portal-academics-transcript-preview portal-stack">
          <div className="portal-academics-print-hide portal-academics-transcript-preview__actions">
            <button
              type="button"
              className="portal-btn portal-btn--secondary"
              onClick={() => window.print()}
            >
              Print
            </button>
          </div>

          <div className="portal-academics-transcript-sheet">
            <header className="portal-academics-transcript-sheet__masthead">
              <div className="portal-academics-transcript-sheet__masthead-inner">
                <img
                  className="portal-academics-transcript-sheet__logo"
                  src="/AMULogo.png"
                  alt=""
                />
                <p className="portal-academics-transcript-sheet__school">
                  {SCHOOL_TITLE}
                </p>
                <p className="portal-academics-transcript-sheet__title">
                  UNOFFICIAL TRANSCRIPT
                </p>
              </div>
            </header>

            <dl className="portal-academics-transcript-sheet__meta">
              <div className="portal-academics-transcript-sheet__meta-row">
                <dt>Student name</dt>
                <dd>{transcriptPreview.studentName}</dd>
              </div>
              <div className="portal-academics-transcript-sheet__meta-row">
                <dt>Student ID</dt>
                <dd>{transcriptPreview.studentId}</dd>
              </div>
              <div className="portal-academics-transcript-sheet__meta-row">
                <dt>Date issued</dt>
                <dd>{issueDate}</dd>
              </div>
            </dl>

            {groupedPreview.length === 0 ? (
              <p className="portal-card-note">No transcript rows on file yet.</p>
            ) : (
              <div className="portal-academics-transcript-sheet__terms">
                {groupedPreview.map((g) => (
                  <section
                    key={termYearKey(g.term, g.year)}
                    className="portal-academics-transcript-sheet__term-block"
                  >
                    <h3 className="portal-academics-transcript-sheet__term-heading">
                      {g.term} {g.year}
                    </h3>
                    <div className="portal-table-wrap">
                      <table
                        className={`${GRADES_TABLE_CLASS} portal-academics-transcript-sheet__table`}
                      >
                        <thead>
                          <tr>
                            <th scope="col">Code</th>
                            <th scope="col">Course title</th>
                            <th scope="col">Grade</th>
                            <th scope="col">Numeric</th>
                            <th scope="col">Credit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.rows.map((row, idx) => (
                            <tr
                              key={`${row.courseCode}-${g.term}-${g.year}-${idx}`}
                            >
                              <td>{row.courseCode}</td>
                              <td className="portal-academics-course-title-cell">
                                <span className="portal-academics-course-title__en">
                                  {row.courseTitle?.trim()
                                    ? row.courseTitle.trim()
                                    : '—'}
                                </span>
                              </td>
                              <td>{row.grade?.trim() ? row.grade : '—'}</td>
                              <td>
                                {row.numericGrade != null &&
                                Number.isFinite(row.numericGrade)
                                  ? String(row.numericGrade)
                                  : '—'}
                              </td>
                              <td>{formatCreditCell(row)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ))}
              </div>
            )}

            <section
              className="portal-academics-transcript-sheet__cumulative"
              aria-labelledby="transcript-cumulative-heading"
            >
              <h3
                id="transcript-cumulative-heading"
                className="portal-academics-transcript-sheet__cumulative-heading"
              >
                Cumulative Total
              </h3>
              <dl className="portal-academics-transcript-sheet__cumulative-dl">
                <div className="portal-academics-transcript-sheet__cumulative-row">
                  <dt>Units Transferred</dt>
                  <dd>45.0</dd>
                </div>
                <div className="portal-academics-transcript-sheet__cumulative-row">
                  <dt>Clinic Hour Transferred</dt>
                  <dd>100 Hours</dd>
                </div>
                <div className="portal-academics-transcript-sheet__cumulative-row">
                  <dt>Units Completed</dt>
                  <dd>198.0</dd>
                </div>
                <div className="portal-academics-transcript-sheet__cumulative-row">
                  <dt>Clinic Completed</dt>
                  <dd>980 Hours</dd>
                </div>
                <div className="portal-academics-transcript-sheet__cumulative-row">
                  <dt>GPA</dt>
                  <dd>3.76</dd>
                </div>
              </dl>
            </section>
          </div>
        </div>
      ) : null}
    </main>
  )
}
