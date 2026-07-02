import { useCallback, useMemo, useState } from 'react'
import { useStudentPortalT } from '@/LanguageContext'
import type { AdminCourseSection } from '../../lib/api'
import { getPreferredCourseTitle } from '../../lib/courseDisplayName'
import { formatDeliveryModeForDisplay } from '../../lib/deliveryMode'
import { formatTimeRangeHmsForDisplay } from '../../lib/formatScheduleTime'
import { formatPrerequisiteCourseDisplay } from '../../lib/prerequisiteCourse'
import { formatWeekdaysShortFromStored } from '../../lib/weekdaySchedule'
import { scheduleTrackDetailLabel } from '../../lib/scheduleTrack'
import {
  courseBinKeyFromSectionFields,
  isCourseBinKeyInItemList,
  type CourseBinItem,
} from './CourseBinContext'
import { useRegistrationWindow } from './RegistrationWindowContext'
import { adminSectionToCourseBinItem, type CatalogCourseLite } from './sectionToCourseBinItem'

function cellText(value: string | number | null | undefined): string {
  if (value == null) return ''
  return String(value).trim()
}

function displayOrDash(value: string | number | null | undefined): string {
  const s = cellText(value)
  return s === '' ? '—' : s
}

function sectionEnrollmentKey(sec: AdminCourseSection): string {
  return courseBinKeyFromSectionFields({
    course_code: sec.course_code,
    section_code: sec.section_code,
    schedule_track: sec.schedule_track,
  })
}

function isSectionInBin(items: CourseBinItem[], sec: AdminCourseSection): boolean {
  return isCourseBinKeyInItemList(sectionEnrollmentKey(sec), items)
}

function isSectionEnrolled(enrolledKeys: Set<string>, sec: AdminCourseSection): boolean {
  return enrolledKeys.has(sectionEnrollmentKey(sec))
}

function unitsForCourse(
  catalog: CatalogCourseLite,
  sections: AdminCourseSection[],
): string {
  const fromCatalog = cellText(catalog.units)
  if (fromCatalog !== '') return fromCatalog
  const fromSection = sections.find((s) => s.units != null && !Number.isNaN(Number(s.units)))
  return fromSection?.units != null ? String(fromSection.units) : '—'
}

export type RegistrationCourseListPanelProps = {
  courses: CatalogCourseLite[]
  sectionsByCourseCode: Map<string, AdminCourseSection[]>
  catalogByCode: Map<string, CatalogCourseLite>
  binItems: CourseBinItem[]
  enrolledKeys: Set<string>
  addToCourseBin: (item: CourseBinItem) => void
  afterAddToCourseBin?: () => void
}

export function RegistrationCourseListPanel({
  courses,
  sectionsByCourseCode,
  catalogByCode,
  binItems,
  enrolledKeys,
  addToCourseBin,
  afterAddToCourseBin,
}: RegistrationCourseListPanelProps) {
  const t = useStudentPortalT()
  const { isOpen: registrationWindowOpen } = useRegistrationWindow()
  const [expandedCourseCode, setExpandedCourseCode] = useState<string | null>(null)

  const sortedCourses = useMemo(
    () =>
      [...courses].sort((a, b) =>
        cellText(a.code).localeCompare(cellText(b.code), undefined, { numeric: true }),
      ),
    [courses],
  )

  const toggleCourse = useCallback((code: string) => {
    const normalized = code.trim()
    if (normalized === '') return
    setExpandedCourseCode((prev) => (prev === normalized ? null : normalized))
  }, [])

  const tba = t('scheduleTba')

  if (sortedCourses.length === 0) {
    return (
      <div className="portal-registration-course-list-empty" role="status">
        {t('registrationPlanSearchNoTermMatches')}
      </div>
    )
  }

  return (
    <ul className="portal-registration-course-list" aria-label={t('registrationCourseListAria')}>
      {sortedCourses.map((course) => {
        const code = cellText(course.code)
        const codeKey = code.toUpperCase()
        const cat = catalogByCode.get(codeKey) ?? course
        const sectionRows = sectionsByCourseCode.get(codeKey) ?? []
        const expanded = expandedCourseCode === code
        const panelId = `registration-course-sections-${codeKey.replace(/[^A-Z0-9_-]/gi, '-')}`
        const title = getPreferredCourseTitle(
          { code: cat.code, eng_name: cat.eng_name, chi_name: cat.chi_name },
          'EN',
        )
        const units = unitsForCourse(cat, sectionRows)
        const sectionCountLabel =
          sectionRows.length === 1
            ? t('registrationCourseListOneSection')
            : t('registrationCourseListSectionCount').replace('{n}', String(sectionRows.length))
        const prerequisite = formatPrerequisiteCourseDisplay({
          courseCode: sectionRows[0]?.prerequisite_course_code,
          courseTitle: sectionRows[0]?.prerequisite_course_title,
        })

        return (
          <li key={codeKey || title} className="portal-registration-course-list__item">
            <button
              type="button"
              className={[
                'portal-registration-course-list__header',
                expanded ? 'portal-registration-course-list__header--open' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={() => toggleCourse(code)}
            >
              <span className="portal-registration-course-list__header-main">
                <span className="portal-registration-course-list__code">{displayOrDash(code)}</span>
                <span className="portal-registration-course-list__titles">
                  <span className="portal-registration-course-list__title">{title}</span>
                  {cellText(cat.chi_name) !== '' ? (
                    <span className="portal-registration-course-list__title-alt">
                      {displayOrDash(cat.chi_name)}
                    </span>
                  ) : null}
                </span>
                <span className="portal-registration-course-list__meta">
                  <span>{t('registrationCourseListUnitsLabel').replace('{units}', units)}</span>
                  <span aria-hidden>·</span>
                  <span>{sectionCountLabel}</span>
                </span>
              </span>
              <span className="portal-registration-course-list__toggle">
                {expanded ? t('registrationCourseListHideSections') : t('registrationCourseListViewSections')}
              </span>
            </button>

            {expanded ? (
              <div
                id={panelId}
                className="portal-registration-course-list__panel"
                role="region"
                aria-label={t('sectionScheduleForCourse').replace('{code}', code)}
              >
                <dl className="portal-registration-course-list__details">
                  <div>
                    <dt>{t('courseColEnglishName')}</dt>
                    <dd>{displayOrDash(cat.eng_name)}</dd>
                  </div>
                  <div>
                    <dt>{t('courseColChineseName')}</dt>
                    <dd>{displayOrDash(cat.chi_name)}</dd>
                  </div>
                  <div>
                    <dt>{t('courseColUnits')}</dt>
                    <dd>{units}</dd>
                  </div>
                  <div>
                    <dt>{t('prerequisiteLabel')}</dt>
                    <dd>{prerequisite ?? t('dashEm')}</dd>
                  </div>
                </dl>

                {sectionRows.length === 0 ? (
                  <p className="portal-text-muted">{t('registrationPlanSearchNoSectionsForCourse')}</p>
                ) : (
                  <div className="portal-table-wrap">
                    <table className="portal-table portal-registration-course-list__sections-table">
                      <caption className="visually-hidden">
                        {t('sectionScheduleForCourse').replace('{code}', code)}
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">{t('sectionColSection')}</th>
                          <th scope="col">{t('offeredModalDtTimetableTrack')}</th>
                          <th scope="col">{t('sectionColDays')}</th>
                          <th scope="col">{t('sectionColTime')}</th>
                          <th scope="col">{t('sectionColInstructor')}</th>
                          <th scope="col">{t('sectionColLocation')}</th>
                          <th scope="col">{t('sectionColType')}</th>
                          <th scope="col">{t('tableColAction')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sectionRows.map((sec) => {
                          const timeRaw = formatTimeRangeHmsForDisplay(sec.start_time, sec.end_time)
                          const daysRaw = formatWeekdaysShortFromStored(sec.weekday)
                          const instRaw = cellText(sec.instructor)
                          const locRaw = cellText(sec.room)
                          const secCode = cellText(sec.section_code)
                          const inBin = isSectionInBin(binItems, sec)
                          const enrolled = isSectionEnrolled(enrolledKeys, sec)
                          return (
                            <tr key={`${sec.id}-${secCode}`}>
                              <td>{secCode === '' ? '—' : secCode}</td>
                              <td>{scheduleTrackDetailLabel(sec.schedule_track)}</td>
                              <td>{daysRaw === '—' ? tba : daysRaw}</td>
                              <td>{timeRaw === '—' ? tba : timeRaw}</td>
                              <td>{instRaw === '' ? tba : instRaw}</td>
                              <td>{locRaw === '' ? tba : locRaw}</td>
                              <td>{formatDeliveryModeForDisplay(sec.delivery_mode)}</td>
                              <td className="portal-registration-course-list__action-cell">
                                {enrolled ? (
                                  <span className="portal-registration-course-list__status portal-registration-course-list__status--enrolled">
                                    {t('registrationPlanStatusEnrolled')}
                                  </span>
                                ) : inBin ? (
                                  <span className="portal-registration-course-list__status portal-registration-course-list__status--bin">
                                    {t('registrationPlanStatusInPlan')}
                                  </span>
                                ) : !registrationWindowOpen ? (
                                  <span className="portal-registration-course-list__status portal-registration-course-list__status--closed">
                                    {t('registrationWindowClosedShort')}
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    className="portal-btn portal-btn--primary portal-btn--compact"
                                    onClick={() => {
                                      addToCourseBin(adminSectionToCourseBinItem(sec, cat))
                                      afterAddToCourseBin?.()
                                    }}
                                  >
                                    {t('addToCourseBin')}
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
