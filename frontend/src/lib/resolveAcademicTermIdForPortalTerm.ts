import type { AcademicTerm } from './api'

function normalizeTermName(s: string): string {
  return s.trim().toLowerCase()
}

/**
 * Match portal account/browse `term` + calendar year to an academic term row (for enrolled-sections API).
 */
export function resolveAcademicTermIdForPortalTerm(
  terms: AcademicTerm[],
  portalTerm: string,
  portalYear: number,
): string | null {
  const t = portalTerm.trim()
  const y = Number(portalYear)
  if (!t || !Number.isFinite(y)) return null
  const want = normalizeTermName(t)
  for (const row of terms) {
    if (row.year !== y) continue
    if (normalizeTermName(row.term_name) === want) return row.id
  }
  return null
}
