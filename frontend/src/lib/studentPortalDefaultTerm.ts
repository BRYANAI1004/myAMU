import type { AcademicTerm, AccountingQuarterOption } from './api'
import { findPortalDefaultAcademicTerm } from './adminPortalDefaultTerm'

export type StudentModuleScope =
  | 'dashboard'
  | 'registration'
  | 'myCourses'
  | 'clinical'
  | 'finances'
  | 'academics'
  | 'documents'
  | 'profile'
  | 'other'

export function studentModuleScopeFromPath(pathname: string): StudentModuleScope {
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    return 'dashboard'
  }
  if (pathname.startsWith('/registration')) return 'registration'
  if (pathname.startsWith('/my-courses')) return 'myCourses'
  if (pathname.startsWith('/clinical')) return 'clinical'
  if (pathname.startsWith('/finances')) return 'finances'
  if (pathname.startsWith('/academics')) return 'academics'
  if (pathname.startsWith('/documents')) return 'documents'
  if (pathname.startsWith('/profile') || pathname.startsWith('/my-account')) {
    return 'profile'
  }
  return 'other'
}

export function findAccountingQuarterForAcademicTerm(
  quarters: AccountingQuarterOption[],
  academicTerm: AcademicTerm | null | undefined,
): AccountingQuarterOption | null {
  if (!academicTerm || quarters.length === 0) return null
  const targetTerm = academicTerm.term_name.trim().toLowerCase()
  const targetYear = academicTerm.year
  return (
    quarters.find(
      (q) =>
        q.year === targetYear &&
        q.term.trim().toLowerCase() === targetTerm,
    ) ?? null
  )
}

export function resolveDefaultAccountingQuarter(
  quarters: AccountingQuarterOption[],
  academicTerm: AcademicTerm | null | undefined,
): AccountingQuarterOption | null {
  if (quarters.length === 0) return null
  return (
    findAccountingQuarterForAcademicTerm(quarters, academicTerm) ??
    quarters[0] ??
    null
  )
}

export function resolveStudentAcademicTermId(
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

  return terms[0]?.id ?? ''
}

export function termYearKey(term: string, year: number): string {
  return `${term}\t${year}`
}
