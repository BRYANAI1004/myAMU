import type { CourseCatalogItem } from '../../../lib/api'

export function courseCatalogTitle(row: CourseCatalogItem): string {
  const eng = row.eng_name?.trim()
  if (eng) return eng
  const chi = row.chi_name?.trim()
  if (chi) return chi
  return row.code
}

export function formatCatalogCredits(units: number | string | null | undefined): string {
  if (units == null) return '—'
  if (typeof units === 'number' && Number.isFinite(units)) {
    return Number.isInteger(units) ? String(units) : String(units)
  }
  const s = String(units).trim()
  if (s === '') return '—'
  const n = Number(s)
  return Number.isFinite(n) ? (Number.isInteger(n) ? String(n) : String(n)) : s
}

export function catalogCategory(row: CourseCatalogItem): string {
  const c = row.category
  if (typeof c === 'string' && c.trim() !== '') return c.trim()
  return '—'
}
