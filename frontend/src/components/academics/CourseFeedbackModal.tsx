import { useEffect, useId, useState, type FormEvent, type MouseEvent } from 'react'
import { useLanguage, useStudentPortalT } from '@/LanguageContext'
import type { StudentPortalKey } from '@/lib/i18n'
import {
  fetchStudentCourseFeedback,
  postStudentCourseFeedback,
  type CourseFeedbackApiItem,
  type StudentAcademicsResponse,
} from '../../lib/api'
import { courseRowDisplayTitle } from '../../lib/academicsTranscriptDisplay'

export type EnrollmentHistoryRow = StudentAcademicsResponse['enrollmentHistory'][number]

const FEEDBACK_QUESTION_KEYS = [
  'feedbackQ1',
  'feedbackQ2',
  'feedbackQ3',
  'feedbackQ4',
  'feedbackQ5',
] as const satisfies readonly StudentPortalKey[]

const RATING_WORD_KEYS: Record<number, StudentPortalKey> = {
  1: 'ratingPoor',
  2: 'ratingFair',
  3: 'ratingGood',
  4: 'ratingVeryGood',
  5: 'ratingExcellent',
}

function isRating(n: unknown): n is number {
  return typeof n === 'number' && n >= 1 && n <= 5 && Number.isInteger(n)
}

function formatRatingDisplay(
  n: number,
  t: (key: StudentPortalKey) => string,
  dash: string,
): string {
  const wordKey = RATING_WORD_KEYS[n]
  const word = wordKey ? t(wordKey) : ''
  return word ? `${n} ${dash} ${word}` : String(n)
}

function formatSubmittedAt(
  iso: string | null | undefined,
  locale: string,
  dash: string,
): string {
  if (iso == null || iso === '') return dash
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return dash
    const loc = locale === 'zh' ? 'zh-Hant' : 'en-US'
    return d.toLocaleString(loc, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return dash
  }
}

function RatingScaleRow({
  name,
  value,
  onChange,
  labelledBy,
}: {
  name: string
  value: number
  onChange: (n: number) => void
  labelledBy: string
}) {
  return (
    <div
      className="portal-course-feedback-modal__rating-scale"
      role="radiogroup"
      aria-labelledby={labelledBy}
    >
      <div className="portal-course-feedback-modal__rating-scale-row">
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className={
              value === n
                ? 'portal-course-feedback-modal__rating-option portal-course-feedback-modal__rating-option--selected'
                : 'portal-course-feedback-modal__rating-option'
            }
          >
            <input
              type="radio"
              className="visually-hidden"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
            />
            <span className="portal-course-feedback-modal__rating-option-face" aria-hidden>
              {n}
            </span>
          </label>
        ))}
      </div>
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
  const { locale } = useLanguage()
  const t = useStudentPortalT()
  const dash = t('dashEm')
  const reactId = useId()
  const [q1, setQ1] = useState<number>(3)
  const [q2, setQ2] = useState<number>(3)
  const [q3, setQ3] = useState<number>(3)
  const [q4, setQ4] = useState<number>(3)
  const [q5, setQ5] = useState<number>(3)
  const [overall, setOverall] = useState<number>(3)
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
        const item = await fetchStudentCourseFeedback(
          {
            studentId,
            courseCode: row.courseCode,
            term: row.term,
            year: row.year,
          },
          { signal: ac.signal },
        )
        if (ac.signal.aborted) return
        if (!item) {
          setViewItem(null)
          setViewError(t('feedbackNotFound'))
        } else {
          setViewItem(item)
          setViewError(null)
        }
      } catch (e) {
        if (ac.signal.aborted) return
        setViewError(e instanceof Error ? e.message : t('couldNotLoadFeedbackFallback'))
      } finally {
        if (!ac.signal.aborted) setViewLoading(false)
      }
    })()
    return () => ac.abort()
  }, [mode, studentId, row.courseCode, row.term, row.year, t])

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
        throw new Error(t('feedbackMissingCourseMetadata'))
      }
      if (!isRating(q1) || !isRating(q2) || !isRating(q3) || !isRating(q4) || !isRating(q5) || !isRating(overall)) {
        throw new Error(t('pleaseRateAll'))
      }
      const payload = {
        courseCode: row.courseCode,
        term: row.term,
        year: row.year,
        q1Rating: q1,
        q2Rating: q2,
        q3Rating: q3,
        q4Rating: q4,
        q5Rating: q5,
        overallRating: overall,
        comment: comment.trim() || null,
      }
      await postStudentCourseFeedback(studentId, payload)
      onClose()
      onSubmitted()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('couldNotSubmitFeedback'))
    } finally {
      setSubmitting(false)
    }
  }

  const titleId = 'course-feedback-modal-title'
  const courseTitle = courseRowDisplayTitle(row)
  const courseLine = `${row.courseCode.trim()} ${dash} ${courseTitle}`
  const termLine = `${row.term} ${row.year}`

  const radioName = (suffix: string) => `cfb-${suffix}-${reactId.replace(/:/g, '')}`

  const view = viewItem

  return (
    <div
      className="portal-course-feedback-modal-backdrop"
      onMouseDown={backdropMouseDown}
      role="presentation"
    >
      <div
        className="portal-course-feedback-modal portal-course-feedback-modal--student-eval"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="portal-course-feedback-modal__header">
          {mode === 'submit' ? (
            <h2 id={titleId} className="portal-course-feedback-modal__header-title">
              {t('courseEvaluation')}
            </h2>
          ) : (
            <h2 id={titleId} className="portal-course-feedback-modal__header-title">
              {t('submittedEvaluation')}
            </h2>
          )}
          <p className="portal-course-feedback-modal__header-course">{courseLine}</p>
          {mode === 'view' ? (
            <p className="portal-course-feedback-modal__header-term portal-text-muted">{termLine}</p>
          ) : null}
        </header>
        <div className="portal-course-feedback-modal__section-divider" aria-hidden="true" />

        {mode === 'submit' ? (
          <form onSubmit={handleSubmit}>
            <div className="portal-course-feedback-modal__body-inner">
              <p className="portal-course-feedback-modal__rating-legend-once portal-text-muted">
                {t('ratingScaleLegend')}
              </p>
              {FEEDBACK_QUESTION_KEYS.map((qk, i) => {
                const id = `cfb-q${i + 1}-text`
                const setter = [setQ1, setQ2, setQ3, setQ4, setQ5][i]
                const val = [q1, q2, q3, q4, q5][i]
                return (
                  <div key={qk} className="portal-course-feedback-modal__feedback-block">
                    <p className="portal-course-feedback-modal__question" id={id}>
                      {t(qk)}
                    </p>
                    <RatingScaleRow
                      name={radioName(`q${i + 1}`)}
                      value={val}
                      onChange={setter}
                      labelledBy={id}
                    />
                  </div>
                )
              })}
              <div className="portal-course-feedback-modal__feedback-block portal-course-feedback-modal__feedback-block--overall">
                <p className="portal-course-feedback-modal__question" id="cfb-overall-text">
                  {t('overallRating')}
                </p>
                <RatingScaleRow
                  name={radioName('overall')}
                  value={overall}
                  onChange={setOverall}
                  labelledBy="cfb-overall-text"
                />
              </div>
              <div className="portal-course-feedback-modal__comment-block">
                <label className="portal-course-feedback-modal__comment-label" htmlFor="cfb-comment">
                  {t('additionalComments')}
                </label>
                <textarea
                  id="cfb-comment"
                  className="portal-course-feedback-modal__comment-textarea"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={8000}
                  rows={4}
                  placeholder={t('feedbackCommentPlaceholder')}
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
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="portal-btn portal-btn--primary"
                  disabled={submitting}
                >
                  {submitting ? t('submitting') : t('submit')}
                </button>
              </div>
            </div>
          </form>
        ) : null}

        {mode === 'view' ? (
          <>
            {viewLoading ? <p className="portal-card-note">{t('loading')}</p> : null}
            {viewError && !viewLoading ? (
              <p className="portal-card-note portal-profile-state--error" role="alert">
                {viewError}
              </p>
            ) : null}
            {view && !viewLoading ? (
              <div className="portal-course-feedback-modal__body-inner">
                <dl className="portal-course-feedback-modal__readonly-dl">
                  {FEEDBACK_QUESTION_KEYS.map((qk, idx) => {
                    const ratings = [view.q1Rating, view.q2Rating, view.q3Rating, view.q4Rating, view.q5Rating]
                    const r = ratings[idx]
                    return (
                      <div key={qk} className="portal-course-feedback-modal__readonly-row">
                        <dt className="portal-course-feedback-modal__readonly-label">{t(qk)}</dt>
                        <dd className="portal-course-feedback-modal__readonly-value">
                          {isRating(r) ? formatRatingDisplay(r, t, dash) : dash}
                        </dd>
                      </div>
                    )
                  })}
                  <div className="portal-course-feedback-modal__readonly-row portal-course-feedback-modal__readonly-row--summary-first">
                    <dt className="portal-course-feedback-modal__readonly-label">{t('overallRating')}</dt>
                    <dd className="portal-course-feedback-modal__readonly-value">
                      {isRating(view.overallRating)
                        ? formatRatingDisplay(view.overallRating, t, dash)
                        : dash}
                    </dd>
                  </div>
                  <div className="portal-course-feedback-modal__readonly-row portal-course-feedback-modal__readonly-row--multiline">
                    <dt className="portal-course-feedback-modal__readonly-label">{t('additionalComments')}</dt>
                    <dd className="portal-course-feedback-modal__readonly-value">
                      {view.comment != null && view.comment.trim() !== '' ? view.comment : dash}
                    </dd>
                  </div>
                </dl>
                <div
                  className="portal-course-feedback-modal__submitted-row"
                  role="group"
                  aria-label={t('feedbackSubmittedAtAria')}
                >
                  <span className="portal-course-feedback-modal__submitted-label">{t('submittedLabel')}</span>
                  <span className="portal-course-feedback-modal__submitted-value">
                    {formatSubmittedAt(view.submittedAt, locale, dash)}
                  </span>
                </div>
              </div>
            ) : null}
            <div className="portal-course-feedback-modal__actions">
              <button type="button" className="portal-btn portal-btn--secondary" onClick={onClose}>
                {t('close')}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
