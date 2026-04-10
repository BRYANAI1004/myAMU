import { useStudentPortalT } from '@/LanguageContext'
import type { EnrollmentHistoryRow } from './CourseFeedbackModal'

export function CourseFeedbackCell({
  row,
  onOpenSubmit,
  onOpenView,
}: {
  row: EnrollmentHistoryRow
  onOpenSubmit: (row: EnrollmentHistoryRow) => void
  onOpenView: (row: EnrollmentHistoryRow) => void
}) {
  const t = useStudentPortalT()
  const submitted = row.feedbackSubmitted === true

  if (!row.feedbackEligible) {
    return <span className="portal-text-muted">{t('dashEm')}</span>
  }

  if (!submitted) {
    return (
      <button
        type="button"
        className="portal-btn portal-btn--secondary portal-btn--compact"
        onClick={() => onOpenSubmit(row)}
      >
        {t('submit')}
      </button>
    )
  }

  return (
    <button
      type="button"
      className="portal-btn portal-btn--secondary portal-btn--compact"
      onClick={() => onOpenView(row)}
    >
      {t('view')}
    </button>
  )
}
