import type { AcademicTerm } from './api'

const SCHOOL_TIME_ZONE = 'America/Los_Angeles'

export type RegistrationWindowStatus = 'open' | 'not_yet_open' | 'closed'

function normalizeIsoDate(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const d = raw.trim().slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null
}

export function schoolLocalTodayIsoDate(now: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: SCHOOL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(now)
  const year = parts.find((p) => p.type === 'year')?.value ?? ''
  const month = parts.find((p) => p.type === 'month')?.value ?? ''
  const day = parts.find((p) => p.type === 'day')?.value ?? ''
  return `${year}-${month}-${day}`
}

export function getRegistrationWindowStatus(
  term: Pick<AcademicTerm, 'registration_open' | 'registration_close'> | null | undefined,
  now: Date = new Date(),
): RegistrationWindowStatus {
  if (term == null) return 'open'

  const open = normalizeIsoDate(term.registration_open)
  const close = normalizeIsoDate(term.registration_close)
  const today = schoolLocalTodayIsoDate(now)

  if (open != null && today < open) return 'not_yet_open'
  if (close != null && today > close) return 'closed'
  return 'open'
}

export function isRegistrationWindowOpen(
  term: Pick<AcademicTerm, 'registration_open' | 'registration_close'> | null | undefined,
  now: Date = new Date(),
): boolean {
  return getRegistrationWindowStatus(term, now) === 'open'
}

export function formatRegistrationWindowDate(
  iso: string | null | undefined,
  locale: string,
): string {
  const normalized = normalizeIsoDate(iso)
  if (normalized == null) return '—'
  const [y, m, d] = normalized.split('-').map(Number)
  if (!y || !m || !d) return normalized
  return new Intl.DateTimeFormat(locale, {
    timeZone: SCHOOL_TIME_ZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(Date.UTC(y, m - 1, d, 12)))
}

export function registrationTermDisplayLabel(
  term: Pick<AcademicTerm, 'term_label' | 'term_name' | 'year'> | null | undefined,
): string {
  if (term == null) return ''
  const label = term.term_label?.trim() ?? ''
  if (label !== '') return label
  return `${term.term_name} ${term.year}`.trim()
}
