import type { AcademicTerm } from './api'

function normalizeTermName(s: string): string {
  return s.trim().toLowerCase()
}

/** Collapse legacy tokens like SPR1 / SUM1 / FAL to canonical season names used in `academic_terms.term_name`. */
function compactPortalTermKey(s: string): string {
  return s.trim().toLowerCase().replace(/[\s_-]+/g, '')
}

const COMPACT_ALIASES: Record<string, string> = {
  spr1: 'spring',
  spring1: 'spring',
  sum1: 'summer',
  summer1: 'summer',
  fal: 'fall',
  fall1: 'fall',
  win: 'winter',
  winter1: 'winter',
}

function canonicalSeasonFromPortalTerm(portalTerm: string): string | null {
  const c = compactPortalTermKey(portalTerm)
  return COMPACT_ALIASES[c] ?? null
}

/**
 * Match portal account/browse `term` + calendar year to an academic term row (for enrolled-sections API).
 * Uses exact `term_name`, compact aliases (e.g. SPR1 → Spring), and `term_label` overlap for mismatched legacy strings.
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

  const canon = canonicalSeasonFromPortalTerm(t)
  if (canon) {
    for (const row of terms) {
      if (row.year !== y) continue
      if (normalizeTermName(row.term_name) === canon) return row.id
    }
  }

  const firstToken = want.split(/\s+/)[0] ?? ''
  for (const row of terms) {
    if (row.year !== y) continue
    const lbl = row.term_label?.trim().toLowerCase() ?? ''
    if (lbl === want || lbl.startsWith(`${want} `) || lbl.includes(` ${want}`)) {
      return row.id
    }
    if (firstToken && normalizeTermName(row.term_name) === firstToken) {
      return row.id
    }
  }

  return null
}
