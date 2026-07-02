import type { AcademicTerm, AdminFinanceGlobalQuarter } from './api'

/** Registrar "Portal default" row (`is_posted_to_dashboard`). */
export function findPortalDefaultAcademicTerm(
  terms: AcademicTerm[],
): AcademicTerm | null {
  return terms.find((t) => t.is_posted_to_dashboard) ?? null
}

export function pickLatestAcademicTermId(terms: AcademicTerm[]): string {
  if (terms.length === 0) return ''
  const latest = terms.reduce((best, term) => {
    if (term.sequence_no !== best.sequence_no) {
      return term.sequence_no > best.sequence_no ? term : best
    }
    if (term.year !== best.year) return term.year > best.year ? term : best
    if (term.quarter_index !== best.quarter_index) {
      return term.quarter_index > best.quarter_index ? term : best
    }
    return term.id.localeCompare(best.id) > 0 ? term : best
  }, terms[0]!)
  return latest.id
}

/** Resolve which academic term id admin UI should show by default. */
export function resolveAdminAcademicTermId(
  terms: AcademicTerm[],
  options: {
    urlTermId?: string | null
    portalDefaultTerm?: AcademicTerm | null
  } = {},
): string {
  const url = (options.urlTermId ?? '').trim()
  if (url !== '' && terms.some((t) => t.id === url)) return url

  const posted =
    options.portalDefaultTerm ?? findPortalDefaultAcademicTerm(terms) ?? null
  if (posted != null && terms.some((t) => t.id === posted.id)) {
    return posted.id
  }

  return pickLatestAcademicTermId(terms)
}

export function findFinanceQuarterIndexForAcademicTerm(
  quarters: AdminFinanceGlobalQuarter[],
  academicTerm: AcademicTerm | null | undefined,
): number {
  if (!academicTerm || quarters.length === 0) return 0
  const targetTerm = academicTerm.term_name.trim().toLowerCase()
  const targetYear = academicTerm.year
  const idx = quarters.findIndex(
    (q) =>
      q.year === targetYear &&
      q.term.trim().toLowerCase() === targetTerm,
  )
  return idx >= 0 ? idx : 0
}

/** Route groups that share scheduling URL context vs. independent admin modules. */
export type AdminTermScope =
  | 'scheduling'
  | 'feedback'
  | 'finance'
  | 'clinical'
  | 'courses'
  | 'students'
  | 'other'

export function adminTermScopeFromPath(pathname: string): AdminTermScope {
  if (pathname.startsWith('/admin/course-sections')) return 'scheduling'
  if (pathname.startsWith('/admin/feedback')) return 'feedback'
  if (pathname.startsWith('/admin/finance')) return 'finance'
  if (pathname.startsWith('/admin/clinical')) return 'clinical'
  if (pathname.startsWith('/admin/courses')) return 'courses'
  if (pathname.startsWith('/admin/students')) return 'students'
  return 'other'
}
