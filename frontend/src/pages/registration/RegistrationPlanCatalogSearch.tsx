import {
  type FormEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useOptionalPortalLocale, useStudentPortalT } from '@/LanguageContext'
import type { AdminCourseSection } from '../../lib/api'
import { getPreferredCourseTitle } from '../../lib/courseDisplayName'
import type { CourseBinItem } from './CourseBinContext'
import { RegistrationPlanSearchResultsPanel } from './RegistrationPlanSearchResultsPanel'
import type { CatalogCourseLite } from './sectionToCourseBinItem'

const NO_PREFIX_KEY = '__NO_PREFIX__'

function cellText(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

/** Leading letters of course code (same idea as full course search). */
function extractCoursePrefix(code: string): string {
  const upper = code.trim().toUpperCase()
  const m = upper.match(/^([A-Z]+)/)
  return m ? m[1] : NO_PREFIX_KEY
}

/** Portion of the course code from the first digit onward (e.g. BS510 → 510, LS7A → 7A). */
function numericTailFromCourseCode(code: string): string {
  const u = cellText(code).toUpperCase()
  const i = u.search(/\d/)
  if (i === -1) return ''
  return u.slice(i)
}

function subjectTextMatches(course: CatalogCourseLite, raw: string): boolean {
  const q = raw.trim().toLowerCase()
  if (q === '') return false
  if (/^\d+$/.test(q)) return false
  const code = cellText(course.code).toLowerCase()
  const eng = cellText(course.eng_name).toLowerCase()
  const chi = cellText(course.chi_name).toLowerCase()
  const pref = extractCoursePrefix(cellText(course.code))
  const prefLower = pref === NO_PREFIX_KEY ? '' : pref.toLowerCase()
  const hay = [code, eng, chi, prefLower].join('\n')
  return (
    code.startsWith(q) ||
    eng.startsWith(q) ||
    chi.startsWith(q) ||
    prefLower.startsWith(q) ||
    hay.includes(q)
  )
}

function numberQueryMatches(course: CatalogCourseLite, raw: string): boolean {
  const q = raw.trim()
  if (q === '') return true
  const tail = numericTailFromCourseCode(cellText(course.code))
  const codeFull = cellText(course.code).toLowerCase()
  if (/^\d+$/.test(q)) return tail.includes(q)
  return tail.toLowerCase().includes(q.toLowerCase()) || codeFull.includes(q.toLowerCase())
}

/** Filter courses for this term using subject + number fields (same rules as combobox hints). */
function matchesTermPlanFilter(
  course: CatalogCourseLite,
  selectedCode: string | null,
  subjectQ: string,
  numberQ: string,
): boolean {
  const codeNorm = cellText(course.code).toUpperCase()
  if (selectedCode && codeNorm === selectedCode) return true
  const s = subjectQ.trim()
  const n = numberQ.trim()
  if (s === '' && n === '' && !selectedCode) return true
  if (/^\d+$/.test(s) && n === '') {
    return numberQueryMatches(course, s)
  }
  const subOk = s === '' || subjectTextMatches(course, s)
  const numOk = n === '' || numberQueryMatches(course, n)
  return subOk && numOk
}

function subjectSortKey(course: CatalogCourseLite, qRaw: string): number {
  const q = qRaw.trim().toLowerCase()
  if (q === '') return 99
  const code = cellText(course.code).toLowerCase()
  const eng = cellText(course.eng_name).toLowerCase()
  const chi = cellText(course.chi_name).toLowerCase()
  if (eng.startsWith(q) || chi.startsWith(q)) return 0
  if (code.startsWith(q)) return 1
  if (eng.includes(q) || chi.includes(q)) return 2
  return 3
}

function compareCourses(a: CatalogCourseLite, b: CatalogCourseLite, q: string): number {
  const d = subjectSortKey(a, q) - subjectSortKey(b, q)
  if (d !== 0) return d
  return cellText(a.code).localeCompare(cellText(b.code), undefined, { numeric: true })
}

const MAX_SUGGESTIONS = 45

function displayCourseLine(course: CatalogCourseLite, track: 'EN' | 'CN'): string {
  const title = getPreferredCourseTitle(
    {
      code: course.code,
      eng_name: course.eng_name,
      chi_name: course.chi_name,
    },
    track,
  )
  const code = cellText(course.code)
  return `${title} (${code})`
}

export type RegistrationPlanCatalogSearchProps = {
  termSections: AdminCourseSection[]
  catalogByCode: Map<string, CatalogCourseLite>
  termMissing: boolean
  binItems: CourseBinItem[]
  enrolledKeys: Set<string>
  addToCourseBin: (item: CourseBinItem) => void
  showToast: (message: string) => void
}

export function RegistrationPlanCatalogSearch({
  termSections,
  catalogByCode,
  termMissing,
  binItems,
  enrolledKeys,
  addToCourseBin,
  showToast,
}: RegistrationPlanCatalogSearchProps) {
  const t = useStudentPortalT()
  const locale = useOptionalPortalLocale()
  const titleTrack: 'EN' | 'CN' = locale === 'zh' ? 'CN' : 'EN'

  const rootRef = useRef<HTMLDivElement>(null)
  const subjectInputRef = useRef<HTMLInputElement>(null)
  const numberInputRef = useRef<HTMLInputElement>(null)

  const subjectListId = useId()
  const numberListId = useId()

  const [subjectQuery, setSubjectQuery] = useState('')
  const [numberQuery, setNumberQuery] = useState('')
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const [subjectOpen, setSubjectOpen] = useState(false)
  const [numberOpen, setNumberOpen] = useState(false)
  const [searchResultCourses, setSearchResultCourses] = useState<CatalogCourseLite[] | null>(null)

  const catalogThisTerm = useMemo(() => {
    const codes = new Set<string>()
    for (const s of termSections) {
      const c = cellText(s.course_code).toUpperCase()
      if (c !== '') codes.add(c)
    }
    const out: CatalogCourseLite[] = []
    for (const code of codes) {
      const row = catalogByCode.get(code)
      if (row) out.push(row)
      else out.push({ code, eng_name: code, chi_name: '', units: '' })
    }
    out.sort((a, b) => cellText(a.code).localeCompare(cellText(b.code), undefined, { numeric: true }))
    return out
  }, [termSections, catalogByCode])

  const sectionsByCourseCode = useMemo(() => {
    const m = new Map<string, AdminCourseSection[]>()
    for (const s of termSections) {
      const c = cellText(s.course_code).toUpperCase()
      if (c === '') continue
      const list = m.get(c) ?? []
      list.push(s)
      m.set(c, list)
    }
    for (const list of m.values()) {
      list.sort((a, b) =>
        cellText(a.section_code).localeCompare(cellText(b.section_code), undefined, { numeric: true }),
      )
    }
    return m
  }, [termSections])

  useEffect(() => {
    setSearchResultCourses(null)
  }, [termSections])

  const subjectSuggestions = useMemo(() => {
    const q = subjectQuery
    if (termMissing || cellText(q) === '') return []
    const rows = catalogThisTerm.filter((c) => subjectTextMatches(c, q))
    rows.sort((a, b) => compareCourses(a, b, q))
    return rows.slice(0, MAX_SUGGESTIONS)
  }, [catalogThisTerm, subjectQuery, termMissing])

  const poolForNumber = useMemo(() => {
    if (termMissing) return []
    const sel = selectedCode != null ? cellText(selectedCode).toUpperCase() : ''
    if (sel !== '') {
      const chosen = catalogThisTerm.find((c) => cellText(c.code).toUpperCase() === sel)
      if (chosen) {
        const pref = extractCoursePrefix(cellText(chosen.code))
        if (pref !== NO_PREFIX_KEY) {
          return catalogThisTerm.filter((c) => extractCoursePrefix(cellText(c.code)) === pref)
        }
        return [chosen]
      }
    }
    const sub = subjectQuery.trim().toLowerCase()
    if (sub === '' || /^\d+$/.test(sub)) return catalogThisTerm
    return catalogThisTerm.filter((c) => subjectTextMatches(c, subjectQuery))
  }, [catalogThisTerm, selectedCode, subjectQuery, termMissing])

  const numberSuggestions = useMemo(() => {
    if (termMissing) return []
    const q = numberQuery
    const rows = poolForNumber.filter((c) => numberQueryMatches(c, q))
    rows.sort((a, b) =>
      cellText(a.code).localeCompare(cellText(b.code), undefined, { numeric: true }),
    )
    return rows.slice(0, MAX_SUGGESTIONS)
  }, [numberQuery, poolForNumber, termMissing])

  const showNumberDropdown =
    numberOpen &&
    (cellText(numberQuery) !== '' ||
      selectedCode != null ||
      poolForNumber.length < catalogThisTerm.length)

  useEffect(() => {
    if (!subjectOpen && !numberOpen) return
    const onDocDown = (e: MouseEvent) => {
      const el = rootRef.current
      if (el && !el.contains(e.target as Node)) {
        setSubjectOpen(false)
        setNumberOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSubjectOpen(false)
        setNumberOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [subjectOpen, numberOpen])

  const applySubjectSelection = useCallback(
    (course: CatalogCourseLite) => {
      const code = cellText(course.code)
      setSelectedCode(code.toUpperCase())
      setSubjectQuery(displayCourseLine(course, titleTrack))
      setNumberQuery(numericTailFromCourseCode(code))
      setSubjectOpen(false)
      setNumberOpen(false)
      setSearchResultCourses(null)
      requestAnimationFrame(() => numberInputRef.current?.focus())
    },
    [titleTrack],
  )

  const applyNumberSelection = useCallback(
    (course: CatalogCourseLite) => {
      const code = cellText(course.code)
      setSelectedCode(code.toUpperCase())
      setSubjectQuery(displayCourseLine(course, titleTrack))
      setNumberQuery(numericTailFromCourseCode(code))
      setSubjectOpen(false)
      setNumberOpen(false)
      setSearchResultCourses(null)
    },
    [titleTrack],
  )

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      const filtered = catalogThisTerm.filter((c) =>
        matchesTermPlanFilter(c, selectedCode, subjectQuery, numberQuery),
      )
      setSearchResultCourses(filtered)
    },
    [catalogThisTerm, numberQuery, selectedCode, subjectQuery],
  )

  const disabled = termMissing || catalogThisTerm.length === 0

  return (
    <div ref={rootRef} className="portal-plan-catalog-search">
      <form className="portal-plan-catalog-search__form" onSubmit={onSubmit} noValidate>
        <div className="portal-plan-catalog-search__by-row">
          <span className="portal-plan-catalog-search__by-label">{t('registrationPlanSearchByLabel')}</span>
          <div className="portal-plan-catalog-search__stack">
            <div className="portal-plan-catalog-combobox">
              <input
                ref={subjectInputRef}
                id="registration-plan-search-subject"
                type="text"
                className="portal-registration-search-input portal-plan-catalog-combobox__input"
                autoComplete="off"
                placeholder={t('registrationPlanSearchSubjectPlaceholder')}
                value={subjectQuery}
                disabled={disabled}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={subjectOpen}
                aria-controls={subjectListId}
                onChange={(e) => {
                  setSubjectQuery(e.target.value)
                  setSelectedCode(null)
                  setSearchResultCourses(null)
                  setSubjectOpen(true)
                  setNumberOpen(false)
                }}
                onFocus={() => {
                  setSubjectOpen(true)
                  setNumberOpen(false)
                }}
              />
              {subjectOpen && subjectSuggestions.length > 0 ? (
                <ul
                  id={subjectListId}
                  className="portal-plan-catalog-combobox__list"
                  role="listbox"
                  aria-label={t('registrationPlanSearchSubjectPlaceholder')}
                >
                  {subjectSuggestions.map((c) => {
                    const code = cellText(c.code)
                    return (
                      <li key={code}>
                        <button
                          type="button"
                          className="portal-plan-catalog-combobox__option"
                          role="option"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => applySubjectSelection(c)}
                        >
                          {displayCourseLine(c, titleTrack)}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : null}
              {subjectOpen && cellText(subjectQuery) !== '' && subjectSuggestions.length === 0 ? (
                <p className="portal-plan-catalog-combobox__empty" role="status">
                  {t('registrationPlanSearchNoMatches')}
                </p>
              ) : null}
            </div>

            <div className="portal-plan-catalog-combobox">
              <input
                ref={numberInputRef}
                id="registration-plan-search-number"
                type="text"
                className="portal-registration-search-input portal-plan-catalog-combobox__input"
                autoComplete="off"
                placeholder={t('registrationPlanSearchNumberPlaceholder')}
                value={numberQuery}
                disabled={disabled}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={numberOpen}
                aria-controls={numberListId}
                onChange={(e) => {
                  setNumberQuery(e.target.value)
                  setSelectedCode(null)
                  setSearchResultCourses(null)
                  setNumberOpen(true)
                  setSubjectOpen(false)
                }}
                onFocus={() => {
                  setNumberOpen(true)
                  setSubjectOpen(false)
                }}
              />
              {showNumberDropdown ? (
                numberSuggestions.length > 0 ? (
                  <ul
                    id={numberListId}
                    className="portal-plan-catalog-combobox__list"
                    role="listbox"
                    aria-label={t('registrationPlanSearchNumberPlaceholder')}
                  >
                    {numberSuggestions.map((c) => {
                      const code = cellText(c.code)
                      const tail = numericTailFromCourseCode(code)
                      const title = getPreferredCourseTitle(
                        {
                          code: c.code,
                          eng_name: c.eng_name,
                          chi_name: c.chi_name,
                        },
                        titleTrack,
                      )
                      return (
                        <li key={code}>
                          <button
                            type="button"
                            className="portal-plan-catalog-combobox__option"
                            role="option"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => applyNumberSelection(c)}
                          >
                            <span className="portal-plan-catalog-combobox__option-code">{tail || code}</span>
                            <span className="portal-plan-catalog-combobox__option-sep"> — </span>
                            <span className="portal-plan-catalog-combobox__option-title">{title}</span>
                            <span className="portal-plan-catalog-combobox__option-meta"> ({code})</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                ) : cellText(numberQuery) !== '' || poolForNumber.length === 0 ? (
                  <p className="portal-plan-catalog-combobox__empty" role="status">
                    {t('registrationPlanSearchNoMatches')}
                  </p>
                ) : null
              ) : null}
            </div>

            <div className="portal-plan-catalog-search__go-wrap">
              <button type="submit" className="portal-btn portal-btn--secondary" disabled={disabled}>
                {t('registrationPlanSearchGo')}
              </button>
            </div>
          </div>
        </div>
      </form>

      {searchResultCourses != null ? (
        <RegistrationPlanSearchResultsPanel
          filteredCourses={searchResultCourses}
          sectionsByCourseCode={sectionsByCourseCode}
          catalogByCode={catalogByCode}
          binItems={binItems}
          enrolledKeys={enrolledKeys}
          addToCourseBin={addToCourseBin}
          showToast={showToast}
        />
      ) : null}
    </div>
  )
}
