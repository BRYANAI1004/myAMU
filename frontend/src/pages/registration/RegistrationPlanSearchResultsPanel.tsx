import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { useStudentPortalT } from '@/LanguageContext'
import type { StudentPortalKey } from '@/lib/i18n'
import type { AdminCourseSection } from '../../lib/api'
import { formatTimeRangeHmsForDisplay } from '../../lib/formatScheduleTime'
import { formatWeekdaysShortFromStored } from '../../lib/weekdaySchedule'
import {
  courseBinKeyFromSectionFields,
  isCourseBinKeyInItemList,
  type CourseBinItem,
} from './CourseBinContext'
import { adminSectionToCourseBinItem, type CatalogCourseLite } from './sectionToCourseBinItem'

const NO_PREFIX_KEY = '__NO_PREFIX__'

const PREFIX_TO_I18N: Readonly<Record<string, StudentPortalKey>> = {
  AC: 'prefixLabelAcupuncture',
  BS: 'prefixLabelBasicScience',
  OM: 'prefixLabelOrientalMedicine',
  HB: 'prefixLabelHerbology',
  WM: 'prefixLabelWesternMedicine',
  CL: 'prefixLabelClinicSubject',
  MG: 'prefixLabelMedicalGeneral',
  CR: 'prefixLabelComprehensiveReview',
  PH: 'prefixLabelPublicHealth',
  CM: 'prefixLabelCaseManagement',
  EL: 'prefixLabelElective',
  IM: 'prefixLabelIntegrativeMedicine',
  ICM: 'prefixLabelIntegrativeCaseManagement',
  PRO: 'prefixLabelProfessionalPortfolio',
}

function cellText(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function displayOrDash(value: string | number | null | undefined): string {
  const s = cellText(value)
  return s === '' ? '—' : s
}

function extractCoursePrefix(code: string): string {
  const upper = code.trim().toUpperCase()
  const m = upper.match(/^([A-Z]+)/)
  return m ? m[1] : NO_PREFIX_KEY
}

function prefixDisplayLabel(prefixKey: string, t: (key: StudentPortalKey) => string): string {
  if (prefixKey === NO_PREFIX_KEY) return t('otherUnmappedPrefix')
  const k = PREFIX_TO_I18N[prefixKey]
  return k ? t(k) : t('otherUnmappedPrefix')
}

function panelIdForPrefix(prefixKey: string): string {
  const safe = prefixKey === NO_PREFIX_KEY ? 'no-prefix' : prefixKey.replace(/[^A-Z0-9_-]/gi, '-')
  return `plan-search-catalog-panel-${safe}`
}

function sessionLabelFromSection(sec: AdminCourseSection): string {
  const term = cellText(sec.term)
  const year = sec.year
  if (term === '' && (year === null || year === undefined || Number.isNaN(Number(year)))) {
    return '—'
  }
  if (term === '') return String(year)
  return `${term} ${year}`
}

function typeLabelFromSection(sec: AdminCourseSection, t: (key: StudentPortalKey) => string): string {
  const d = cellText(sec.delivery_mode)
  return d === '' ? t('sessionTypeLecture') : d
}

function adminSectionEnrollmentKey(sec: AdminCourseSection): string {
  return courseBinKeyFromSectionFields({
    course_code: sec.course_code,
    section_code: sec.section_code,
    schedule_track: sec.schedule_track,
  })
}

function isAdminSectionInBin(items: CourseBinItem[], sec: AdminCourseSection): boolean {
  return isCourseBinKeyInItemList(adminSectionEnrollmentKey(sec), items)
}

function isAdminSectionEnrolled(enrolledKeys: Set<string>, sec: AdminCourseSection): boolean {
  return enrolledKeys.has(adminSectionEnrollmentKey(sec))
}

function unitsForSection(sec: AdminCourseSection, catalog: CatalogCourseLite | undefined): string {
  if (sec.units != null && !Number.isNaN(Number(sec.units))) return String(sec.units)
  return displayOrDash(catalog?.units)
}

export type RegistrationPlanSearchResultsPanelProps = {
  filteredCourses: CatalogCourseLite[]
  sectionsByCourseCode: Map<string, AdminCourseSection[]>
  catalogByCode: Map<string, CatalogCourseLite>
  binItems: CourseBinItem[]
  enrolledKeys: Set<string>
  addToCourseBin: (item: CourseBinItem) => void
  showToast: (message: string) => void
}

export function RegistrationPlanSearchResultsPanel({
  filteredCourses,
  sectionsByCourseCode,
  catalogByCode,
  binItems,
  enrolledKeys,
  addToCourseBin,
  showToast,
}: RegistrationPlanSearchResultsPanelProps) {
  const t = useStudentPortalT()
  const [expandedPrefixes, setExpandedPrefixes] = useState<Set<string>>(() => new Set())
  const [expandedCourseCodes, setExpandedCourseCodes] = useState<Set<string>>(() => new Set())

  const groupedCatalog = useMemo(() => {
    const buckets = new Map<string, CatalogCourseLite[]>()
    for (const c of filteredCourses) {
      const prefixKey = extractCoursePrefix(cellText(c.code))
      const list = buckets.get(prefixKey)
      if (list) list.push(c)
      else buckets.set(prefixKey, [c])
    }
    for (const list of buckets.values()) {
      list.sort((a, b) =>
        cellText(a.code).localeCompare(cellText(b.code), undefined, { numeric: true }),
      )
    }
    const keys = [...buckets.keys()].sort((a, b) => {
      if (a === NO_PREFIX_KEY) return 1
      if (b === NO_PREFIX_KEY) return -1
      return a.localeCompare(b)
    })
    return keys.map((prefixKey) => ({
      prefixKey,
      displayPrefix: prefixKey === NO_PREFIX_KEY ? '—' : prefixKey,
      label: prefixDisplayLabel(prefixKey, t),
      courses: buckets.get(prefixKey)!,
    }))
  }, [filteredCourses, t])

  useEffect(() => {
    setExpandedPrefixes(new Set(groupedCatalog.map((g) => g.prefixKey)))
  }, [groupedCatalog])

  const toggleGroup = useCallback((prefixKey: string) => {
    setExpandedPrefixes((prev) => {
      const next = new Set(prev)
      if (next.has(prefixKey)) next.delete(prefixKey)
      else next.add(prefixKey)
      return next
    })
  }, [])

  const toggleCourseRow = useCallback((courseCode: string) => {
    const code = courseCode.trim()
    if (code === '') return
    setExpandedCourseCodes((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }, [])

  const tba = t('scheduleTba')

  if (filteredCourses.length === 0) {
    return (
      <div
        className="portal-registration-placeholder portal-registration-results-placeholder portal-plan-search-results--empty"
        role="status"
      >
        {t('registrationPlanSearchNoTermMatches')}
      </div>
    )
  }

  return (
    <div
      className="portal-course-catalog portal-plan-search-results"
      role="region"
      aria-label={t('registrationPlanSearchResultsAria')}
    >
      <div className="portal-course-catalog-groups">
        {groupedCatalog.map((group) => {
          const open = expandedPrefixes.has(group.prefixKey)
          const panelId = panelIdForPrefix(group.prefixKey)
          const count = group.courses.length
          return (
            <section key={group.prefixKey} className="portal-course-catalog-group" aria-labelledby={`${panelId}-heading`}>
              <button
                type="button"
                id={`${panelId}-heading`}
                className="portal-course-catalog-group-header"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => toggleGroup(group.prefixKey)}
              >
                <span className="portal-course-catalog-group-chevron" aria-hidden>
                  {open ? '▼' : '▶'}
                </span>
                <span className="portal-course-catalog-group-titles">
                  <span className="portal-course-catalog-group-prefix">{group.displayPrefix}</span>
                  <span className="portal-course-catalog-group-label">{group.label}</span>
                </span>
                <span className="portal-course-catalog-group-count">
                  {count} {count === 1 ? t('courseSingular') : t('coursePlural')}
                </span>
              </button>
              {open && (
                <div
                  id={panelId}
                  className="portal-course-catalog-group-body"
                  role="region"
                  aria-label={`${group.displayPrefix} ${group.label}`}
                >
                  <div className="portal-table-wrap portal-table-wrap--nested">
                    <table className="portal-table portal-table--courses portal-table--course-search">
                      <thead>
                        <tr>
                          <th scope="col" className="portal-course-search-col-expand">
                            <span className="visually-hidden">{t('showSectionsVisuallyHidden')}</span>
                          </th>
                          <th scope="col">{t('courseColCode')}</th>
                          <th scope="col">{t('courseColEnglishName')}</th>
                          <th scope="col">{t('courseColChineseName')}</th>
                          <th scope="col">{t('courseColUnits')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.courses.map((c, i) => {
                          const code = cellText(c.code)
                          const rowKey = `${group.prefixKey}-${code || 'row'}-${i}`
                          const panelCourseId = `plan-search-sections-${rowKey}`
                          const courseOpen = expandedCourseCodes.has(code)
                          const cat = catalogByCode.get(code.toUpperCase()) ?? c
                          const sectionRows = sectionsByCourseCode.get(code.toUpperCase()) ?? []
                          return (
                            <Fragment key={rowKey}>
                              <tr className="portal-course-search-summary-row">
                                <td className="portal-course-search-col-expand">
                                  <button
                                    type="button"
                                    className="portal-course-search-expand-btn"
                                    aria-expanded={courseOpen}
                                    aria-controls={panelCourseId}
                                    onClick={() => toggleCourseRow(code)}
                                    disabled={code === ''}
                                  >
                                    <span className="portal-course-catalog-group-chevron" aria-hidden>
                                      {courseOpen ? '▼' : '▶'}
                                    </span>
                                    <span className="visually-hidden">
                                      {(courseOpen ? t('collapseSectionsFor') : t('expandSectionsFor')).replace(
                                        '{code}',
                                        code || t('courseWordFallback'),
                                      )}
                                    </span>
                                  </button>
                                </td>
                                <td>{displayOrDash(c.code)}</td>
                                <td>{displayOrDash(c.eng_name)}</td>
                                <td>{displayOrDash(c.chi_name)}</td>
                                <td>{displayOrDash(c.units)}</td>
                              </tr>
                              {courseOpen && (
                                <tr className="portal-course-search-detail-row">
                                  <td colSpan={5} className="portal-course-search-sections-cell">
                                    <div
                                      id={panelCourseId}
                                      className="portal-course-search-sections-panel"
                                      role="region"
                                      aria-label={t('sectionScheduleForCourse').replace('{code}', code)}
                                    >
                                      <div className="portal-course-search-sections-table-wrap portal-course-search-sections-table-wrap--schedule">
                                        <div className="portal-course-search-sections-table-scroll">
                                          <table className="portal-table portal-table--course-sections portal-table--course-section-schedule">
                                            <thead>
                                              <tr>
                                                <th scope="col">{t('sectionColSection')}</th>
                                                <th scope="col">{t('sectionColSession')}</th>
                                                <th scope="col">{t('sectionColType')}</th>
                                                <th scope="col">{t('sectionColUnits')}</th>
                                                <th scope="col">{t('sectionColRegistered')}</th>
                                                <th scope="col">{t('sectionColTime')}</th>
                                                <th scope="col">{t('sectionColDays')}</th>
                                                <th scope="col">{t('sectionColInstructor')}</th>
                                                <th scope="col">{t('sectionColLocation')}</th>
                                                <th scope="col" className="portal-course-section-schedule-col-action">
                                                  {t('tableColAction')}
                                                </th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {sectionRows.length === 0 ? (
                                                <tr>
                                                  <td colSpan={10}>
                                                    <p className="portal-text-muted portal-inline-note portal-inline-note--flush">
                                                      {t('registrationPlanSearchNoSectionsForCourse')}
                                                    </p>
                                                  </td>
                                                </tr>
                                              ) : (
                                                sectionRows.map((sec) => {
                                                  const timeRaw = formatTimeRangeHmsForDisplay(
                                                    sec.start_time,
                                                    sec.end_time,
                                                  )
                                                  const daysRaw = formatWeekdaysShortFromStored(sec.weekday)
                                                  const instRaw = cellText(sec.instructor)
                                                  const locRaw = cellText(sec.room)
                                                  const secCode = cellText(sec.section_code)
                                                  const inBin = isAdminSectionInBin(binItems, sec)
                                                  const enrolled = isAdminSectionEnrolled(enrolledKeys, sec)
                                                  return (
                                                    <tr key={`${sec.id}-${secCode}`}>
                                                      <td>{secCode === '' ? '—' : secCode}</td>
                                                      <td>{sessionLabelFromSection(sec)}</td>
                                                      <td>{typeLabelFromSection(sec, t)}</td>
                                                      <td>{unitsForSection(sec, cat)}</td>
                                                      <td>{sec.enrolled_count}</td>
                                                      <td>{timeRaw === '—' ? tba : timeRaw}</td>
                                                      <td>{daysRaw === '—' ? tba : daysRaw}</td>
                                                      <td>{instRaw === '' ? tba : instRaw}</td>
                                                      <td>{locRaw === '' ? tba : locRaw}</td>
                                                      <td className="portal-course-section-schedule-col-action">
                                                        {enrolled ? (
                                                          <span className="portal-text-muted" aria-label={t('offeredRegisteredBadge').trim()}>
                                                            {t('offeredRegisteredBadge').trim()}
                                                          </span>
                                                        ) : inBin ? (
                                                          <span className="portal-text-muted" aria-label={t('offeredAddedBadge').trim()}>
                                                            {t('offeredAddedBadge').trim()}
                                                          </span>
                                                        ) : (
                                                          <button
                                                            type="button"
                                                            className="portal-btn portal-btn--course-search-bin"
                                                            onClick={() => {
                                                              addToCourseBin(adminSectionToCourseBinItem(sec, cat))
                                                              showToast(t('toastAddedToCourseBin'))
                                                            }}
                                                          >
                                                            {t('addToCourseBin')}
                                                          </button>
                                                        )}
                                                      </td>
                                                    </tr>
                                                  )
                                                })
                                              )}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
