/**
 * Shared labels/formatters for normalized academic course records (academics API + aligned account schedule).
 * Keeps current-term semantics and display consistent across Dashboard and Academics.
 */

import { t, type PortalLocale } from './i18n'

export type AcademicCourseStatus =
  | 'active'
  | 'completed'
  | 'withdrawn'
  | 'dropped'
  | 'unknown'

export function academicStatusLabel(status: string, locale?: PortalLocale): string {
  if (locale) {
    switch (status) {
      case 'active':
        return t(locale, 'enrollmentStatusActive')
      case 'completed':
        return t(locale, 'enrollmentStatusCompleted')
      case 'withdrawn':
        return t(locale, 'enrollmentStatusWithdrawn')
      case 'dropped':
        return t(locale, 'enrollmentStatusDropped')
      case 'unknown':
        return t(locale, 'enrollmentStatusUnknown')
      default: {
        const s = status.trim()
        return s.length > 0 ? s : t(locale, 'enrollmentStatusUnknown')
      }
    }
  }
  switch (status) {
    case 'active':
      return 'Active'
    case 'completed':
      return 'Completed'
    case 'withdrawn':
      return 'Withdrawn'
    case 'dropped':
      return 'Dropped'
    case 'unknown':
      return 'Unknown'
    default:
      return status.trim() || 'Unknown'
  }
}

export function formatDaysCell(days: string | null | undefined): string {
  const d = days?.trim()
  return d && d.length > 0 ? d : '—'
}

export function formatAcademicTimeRange(
  timeFrom: string | null | undefined,
  timeTo: string | null | undefined,
): string {
  const a = timeFrom?.trim()
  const b = timeTo?.trim()
  if (a && b) return `${a} – ${b}`
  if (a) return a
  if (b) return b
  return '—'
}

export function formatCreditsCell(credits: number | null | undefined): string {
  if (credits == null || !Number.isFinite(credits)) return '—'
  return credits === Math.floor(credits) ? String(credits) : String(credits)
}

export function formatGradeCell(grade: string | null | undefined): string {
  const g = grade?.trim()
  return g && g.length > 0 ? g : '—'
}

export function currentTermLabel(
  currentTerm: { term: string; year: number } | null,
): string {
  if (!currentTerm) return 'the current term'
  const t = currentTerm.term?.trim()
  const y = currentTerm.year
  if (t && Number.isFinite(y) && y > 0) return `${t} ${y}`
  return 'the current term'
}

export function noCurrentCoursesMessage(termLabel: string): string {
  return `You have no courses scheduled for ${termLabel}.`
}

/** Room/building line only; never substitute instructor. Empty source → TBD. */
export function formatPortalCourseLocation(
  location: string | null | undefined,
): string {
  const s = location?.trim()
  if (s && s.length > 0) return s
  return 'TBD'
}

export function formatPortalCourseInstructor(
  instructor: string | null | undefined,
): string {
  const s = instructor?.trim()
  if (s && s.length > 0) return s
  return '—'
}
