import type {
  StudentAcademicCourseRecord,
  StudentAcademicsResponse,
  StudentTranscriptPreviewResponse,
} from './api'

export type { StudentAcademicCourseRecord }

/** Row shape from either legacy academics transcript or transcript-preview (merged marks + clinic). */
export type TranscriptRow =
  | StudentAcademicsResponse['transcript'][number]
  | StudentTranscriptPreviewResponse['transcript'][number]
  | StudentAcademicCourseRecord

/**
 * Prefer for future Course Feedback: only legacy-completed rows (final outcome, not active/unknown/withdrawn).
 */
export function isCompletedForCourseFeedback(
  row: Pick<StudentAcademicCourseRecord, 'status'>,
): boolean {
  return row.status === 'completed'
}

/** Map normalized `/academics` rows into the same columns Quarter Grades / transcript tables already expect. */
export function transcriptViewRowsFromCourseRecords(
  records: StudentAcademicCourseRecord[],
): Array<{
  courseCode: string
  courseTitle: string
  term: string
  year: number
  grade: string | null
  numericGrade: number | null
  credits: number | null
  source?: 'marks' | 'clinic'
  status?: StudentAcademicCourseRecord['status']
}> {
  return records.map((r) => ({
    courseCode: r.courseCode,
    courseTitle: r.courseTitle,
    term: r.term,
    year: r.year,
    grade: r.grade,
    numericGrade: r.numericGrade,
    credits: r.credits,
    source: r.source,
    status: r.status,
  }))
}

const MIN_MEANINGFUL_YEAR = 1900
const MAX_MEANINGFUL_YEAR = 2100

function strOpt(v: unknown): string | null {
  if (v == null) return null
  const s = String(v).trim()
  return s.length > 0 ? s : null
}

/**
 * Single portal rule for course title cells: prefer explicit English fields when present,
 * otherwise the API-normalized `courseTitle` / legacy `course_title`.
 */
export function courseRowDisplayTitle(
  row: { courseTitle?: string | null } & Record<string, unknown>,
): string {
  const ex = row as Record<string, unknown>
  const en =
    strOpt(ex.titleEn) ??
    strOpt(ex.courseTitleEn) ??
    strOpt(ex.course_title_en) ??
    strOpt(ex.eng_name)
  if (en) return en
  const legacy =
    strOpt(row.courseTitle) ?? strOpt(ex.course_title)
  return legacy || '—'
}

/** Safe key for select value: tab cannot appear in normalized academic terms from DB. */
export function termYearKey(term: string, year: number): string {
  return `${term.trim().replace(/\t/g, ' ')}\t${year}`
}

export function isValidTranscriptTermYear(term: string, year: number): boolean {
  const t = term.trim().replace(/\t/g, ' ')
  if (t.length === 0) return false
  if (t === '0') return false
  if (!Number.isFinite(year) || Math.floor(year) !== year) return false
  if (year < MIN_MEANINGFUL_YEAR || year > MAX_MEANINGFUL_YEAR) return false
  const label = `${t} ${year}`.trim()
  if (label === '0' || /^0+$/.test(label.replace(/\s/g, ''))) return false
  return true
}

function termsMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

function termRank(term: string): number {
  const t = term.trim().toLowerCase()
  if (t === 'fall') return 4
  if (t === 'summer') return 3
  if (t === 'spring') return 2
  if (t === 'winter') return 1
  return 0
}

export function compareTermGroups(
  a: { year: number; term: string },
  b: { year: number; term: string },
): number {
  if (a.year !== b.year) return b.year - a.year
  return termRank(b.term) - termRank(a.term)
}

/**
 * Groups rows by term/year (newest first). Shared by transcript, registration history, etc.
 */
export function groupRowsByTermYear<T extends { term: string; year: number }>(
  rows: T[],
): Array<{ year: number; term: string; rows: T[] }> {
  const map = new Map<string, { year: number; term: string; rows: T[] }>()
  const order: string[] = []

  for (const row of rows) {
    const trimmed = row.term.trim().replace(/\t/g, ' ')
    const year = row.year
    if (!isValidTranscriptTermYear(trimmed, year)) continue

    const matchKey = `${trimmed.toLowerCase()}\t${year}`
    let bucket = map.get(matchKey)
    if (!bucket) {
      bucket = { year, term: trimmed, rows: [] }
      map.set(matchKey, bucket)
      order.push(matchKey)
    }
    bucket.rows.push(row)
  }

  const meta = order.map((k) => {
    const b = map.get(k)!
    return { year: b.year, term: b.term, key: k }
  })
  meta.sort(compareTermGroups)

  return meta.map(({ key }) => {
    const b = map.get(key)!
    return { year: b.year, term: b.term, rows: b.rows }
  })
}

/**
 * Groups transcript rows by term/year using only rows with valid term/year.
 * Canonical term string is the first seen trimmed term for that bucket (stable casing).
 */
export function groupTranscriptByTermYear(
  transcript: TranscriptRow[],
): Array<{ year: number; term: string; rows: TranscriptRow[] }> {
  return groupRowsByTermYear(transcript)
}

export type TranscriptTermOption = {
  term: string
  year: number
  label: string
  key: string
}

/** Dropdown options derived only from transcript rows with valid term/year (aligned with preview). */
export function buildTranscriptTermOptions(
  transcript: TranscriptRow[],
): TranscriptTermOption[] {
  return groupRowsByTermYear(transcript).map((g) => ({
    term: g.term,
    year: g.year,
    label: `${g.term} ${g.year}`,
    key: termYearKey(g.term, g.year),
  }))
}

export function rowsForSelectedTerm(
  transcript: TranscriptRow[],
  selectedTerm: string,
  selectedYear: number,
): TranscriptRow[] {
  if (!isValidTranscriptTermYear(selectedTerm, selectedYear)) return []
  return transcript.filter(
    (r) =>
      isValidTranscriptTermYear(r.term, r.year) &&
      r.year === selectedYear &&
      termsMatch(r.term, selectedTerm),
  )
}

export function defaultTermKeyFromTranscript(
  data: StudentAcademicsResponse,
  options: TranscriptTermOption[],
): string | null {
  if (options.length === 0) return null
  const ct = data.currentTerm
  if (ct && isValidTranscriptTermYear(ct.term, ct.year)) {
    const hit = options.find(
      (o) => o.year === ct.year && termsMatch(o.term, ct.term),
    )
    if (hit) return hit.key
  }
  return options[0]!.key
}

/** Default quarter term from preview transcript order (newest term first; see `compareTermGroups`). */
export function defaultTermKeyFromPreview(
  options: TranscriptTermOption[],
): string | null {
  if (options.length === 0) return null
  return options[0]!.key
}

function rowRecord(row: TranscriptRow): Record<string, unknown> {
  return row as TranscriptRow & Record<string, unknown>
}

/**
 * Primary title follows `courseRowDisplayTitle` (English-first). Secondary is Chinese only when
 * present and different from the primary line.
 */
export function bilingualCourseTitleParts(row: TranscriptRow): {
  primary: string
  secondary: string | null
} {
  const ex = rowRecord(row)
  const primary = courseRowDisplayTitle(row)
  const zh =
    strOpt(ex.titleZh) ??
    strOpt(ex.courseTitleZh) ??
    strOpt(ex.course_title_zh) ??
    strOpt(ex.chi_name)
  if (zh && zh !== primary) return { primary, secondary: zh }
  return { primary, secondary: null }
}

const CREDIT_FIELD_KEYS = [
  'credits',
  'credit',
  'units',
  'creditHours',
  'credit_hours',
  'unit',
] as const

/** Finite numeric credits for a transcript row, or null if not parseable as a number. */
export function transcriptRowCredits(row: TranscriptRow): number | null {
  const ex = rowRecord(row)
  for (const k of CREDIT_FIELD_KEYS) {
    const v = ex[k]
    if (v == null || v === '') continue
    if (typeof v === 'number' && Number.isFinite(v)) return v
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return null
}

export function formatCreditCell(row: TranscriptRow): string {
  const parsed = transcriptRowCredits(row)
  if (parsed != null) {
    return parsed === Math.floor(parsed) ? String(parsed) : String(parsed)
  }
  const ex = rowRecord(row)
  for (const k of CREDIT_FIELD_KEYS) {
    const v = ex[k]
    if (v == null || v === '') continue
    const s = String(v).trim()
    if (s.length > 0) return s
  }
  return '—'
}

function normalizedLetterGrade(grade: string | null | undefined): string | null {
  const t = grade?.trim()
  if (!t) return null
  return t.toUpperCase()
}

/**
 * Quarter Grades term totals from displayed rows only.
 *
 * Units completed: institutional placeholder — only `W` and `F` withhold completed credit; refine later.
 * Term GPA: excludes `P`, `W`, `AUD`, `T` and rows without finite numericGrade + finite credits.
 */
export function computeQuarterTermSummary(rows: TranscriptRow[]): {
  courseCount: number
  unitsAttempted: number
  unitsCompleted: number
  gradePoints: number
  termGpa: number | null
} {
  const GRADES_NO_COMPLETED_UNITS = new Set(['W', 'F'])
  const GRADES_EXCLUDED_FROM_GPA = new Set(['P', 'W', 'AUD', 'T'])

  let unitsAttempted = 0
  let unitsCompleted = 0
  let gradePoints = 0
  let gpaEligibleUnits = 0

  for (const row of rows) {
    const credits = transcriptRowCredits(row)
    const g = normalizedLetterGrade(row.grade)

    if (credits != null) {
      unitsAttempted += credits
      const withholdsCompleted = g != null && GRADES_NO_COMPLETED_UNITS.has(g)
      if (!withholdsCompleted) {
        unitsCompleted += credits
      }
    }

    const excludedFromGpa = g != null && GRADES_EXCLUDED_FROM_GPA.has(g)
    const ng = row.numericGrade
    const numericOk =
      ng != null && typeof ng === 'number' && Number.isFinite(ng)
    if (!excludedFromGpa && numericOk && credits != null) {
      gradePoints += ng * credits
      gpaEligibleUnits += credits
    }
  }

  const termGpa =
    gpaEligibleUnits > 0 ? gradePoints / gpaEligibleUnits : null

  return {
    courseCount: rows.length,
    unitsAttempted,
    unitsCompleted,
    gradePoints,
    termGpa,
  }
}
