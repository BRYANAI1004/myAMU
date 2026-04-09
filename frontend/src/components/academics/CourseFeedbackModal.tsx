import { useEffect, useState, type FormEvent, type MouseEvent } from 'react'
import {
  fetchStudentCourseFeedback,
  postStudentCourseFeedback,
  type CourseFeedbackApiItem,
  type StudentAcademicsResponse,
} from '../../lib/api'
import { courseRowDisplayTitle } from '../../lib/academicsTranscriptDisplay'

export type EnrollmentHistoryRow = StudentAcademicsResponse['enrollmentHistory'][number]

function findFeedbackItemForRow(
  items: CourseFeedbackApiItem[],
  row: Pick<EnrollmentHistoryRow, 'courseCode' | 'term' | 'year'>,
): CourseFeedbackApiItem | undefined {
  const code = row.courseCode.trim()
  const term = row.term.trim().toLowerCase()
  return items.find(
    (it) =>
      it.courseCode.trim() === code &&
      it.year === row.year &&
      it.term.trim().toLowerCase() === term,
  )
}

function ratingSelectField(
  id: string,
  label: string,
  value: number,
  onChange: (n: number) => void,
) {
  return (
    <div className="portal-course-feedback-modal__field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </div>
  )
}

export function CourseFeedbackModal({
  mode,
  row,
  studentId,
  onClose,
  onSubmitted,
}: {
  mode: 'submit' | 'view'
  row: EnrollmentHistoryRow
  studentId: string
  onClose: () => void
  onSubmitted: () => void
}) {
  const [overallRating, setOverallRating] = useState<number>(3)
  const [workload, setWorkload] = useState<number>(3)
  const [difficulty, setDifficulty] = useState<number>(3)
  const [comment, setComment] = useState<string>('')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [viewLoading, setViewLoading] = useState(mode === 'view')
  const [viewError, setViewError] = useState<string | null>(null)
  const [viewItem, setViewItem] = useState<CourseFeedbackApiItem | null>(null)

  useEffect(() => {
    if (mode !== 'view') return
    const ac = new AbortController()
    ;(async () => {
      try {
        const res = await fetchStudentCourseFeedback(studentId, { signal: ac.signal })
        if (ac.signal.aborted) return
        const item = findFeedbackItemForRow(res.items, row)
        if (!item) {
          setViewItem(null)
          setViewError('Could not find submitted feedback for this course.')
        } else {
          setViewItem(item)
          setViewError(null)
        }
      } catch (e) {
        if (ac.signal.aborted) return
        setViewError(e instanceof Error ? e.message : 'Could not load feedback.')
      } finally {
        if (!ac.signal.aborted) setViewLoading(false)
      }
    })()
    return () => ac.abort()
  }, [mode, studentId, row.courseCode, row.term, row.year])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function backdropMouseDown(e: MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      if (!row.courseCode?.trim() || !row.term?.trim() || row.year == null) {
        throw new Error('Missing course metadata')
      }
      const payload = {
        courseCode: row.courseCode.trim(),
        term: row.term.trim(),
        year: row.year,
        q1Rating: overallRating,
        q2Rating: workload,
        q3Rating: difficulty,
        q4Rating: overallRating,
        q5Rating: overallRating,
        overallRating,
        comment: comment?.trim() || null,
      }
      await postStudentCourseFeedback(studentId, payload)
      onClose()
      onSubmitted()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not submit feedback.')
    } finally {
      setSubmitting(false)
    }
  }

  const titleId = 'course-feedback-modal-title'
  const courseLabel = `${row.courseCode.trim()} — ${courseRowDisplayTitle(row)}`

  const view = viewItem
  const vQ1 = view ? (view.q1Rating ?? view.rating) : null
  const vQ2 = view ? (view.q2Rating ?? view.workloadRating) : null
  const vQ3 = view ? (view.q3Rating ?? view.difficultyRating) : null
  const vQ4 = view ? (view.q4Rating ?? view.rating) : null
  const vQ5 = view ? (view.q5Rating ?? view.rating) : null
  const vOverall = view ? (view.overallRating ?? view.rating) : null

  return (
    <div
      className="portal-course-feedback-modal-backdrop"
      onMouseDown={backdropMouseDown}
      role="presentation"
    >
      <div
        className="portal-course-feedback-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {mode === 'submit' ? (
          <>
            <h2 id={titleId} className="portal-course-feedback-modal__title">
              Course evaluation
            </h2>
            <p className="portal-course-feedback-modal__meta">
              {courseLabel}
              <br />
              {row.term} {row.year}
            </p>
            <form onSubmit={handleSubmit}>
              {ratingSelectField(
                'cfb-overall',
                'Overall Rating (1–5)',
                overallRating,
                setOverallRating,
              )}
              {ratingSelectField('cfb-workload', 'Workload (1–5)', workload, setWorkload)}
              {ratingSelectField(
                'cfb-difficulty',
                'Difficulty (1–5)',
                difficulty,
                setDifficulty,
              )}
              <div className="portal-course-feedback-modal__field">
                <label htmlFor="cfb-comment">Comment</label>
                <textarea
                  id="cfb-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={8000}
                  rows={4}
                />
              </div>
              {formError ? (
                <p className="portal-card-note portal-profile-state--error" role="alert">
                  {formError}
                </p>
              ) : null}
              <div className="portal-course-feedback-modal__actions">
                <button
                  type="button"
                  className="portal-btn portal-btn--secondary"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="portal-btn portal-btn--primary"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </form>
          </>
        ) : null}

        {mode === 'view' ? (
          <>
            <h2 id={titleId} className="portal-course-feedback-modal__title">
              Submitted evaluation
            </h2>
            <p className="portal-course-feedback-modal__meta">
              {courseLabel}
              <br />
              {row.term} {row.year}
            </p>
            {viewLoading ? (
              <p className="portal-card-note">Loading…</p>
            ) : null}
            {viewError && !viewLoading ? (
              <p className="portal-card-note portal-profile-state--error" role="alert">
                {viewError}
              </p>
            ) : null}
            {viewItem && !viewLoading ? (
              <>
                <dl className="portal-course-feedback-modal__readonly-dl">
                  <div>
                    <dt>Q1 rating</dt>
                    <dd>{vQ1 ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Q2 rating</dt>
                    <dd>{vQ2 ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Q3 rating</dt>
                    <dd>{vQ3 ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Q4 rating</dt>
                    <dd>{vQ4 ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Q5 rating</dt>
                    <dd>{vQ5 ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Overall Rating</dt>
                    <dd>{vOverall ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Comment</dt>
                    <dd>
                      {(viewItem.comment ?? viewItem.comments)?.trim()
                        ? (viewItem.comment ?? viewItem.comments)
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>Submitted</dt>
                    <dd>
                      {viewItem.submittedAt
                        ? new Date(viewItem.submittedAt).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : '—'}
                    </dd>
                  </div>
                </dl>
              </>
            ) : null}
            <div className="portal-course-feedback-modal__actions">
              <button type="button" className="portal-btn portal-btn--secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
