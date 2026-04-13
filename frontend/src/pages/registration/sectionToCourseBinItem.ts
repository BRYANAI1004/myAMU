import { formatTimeRangeHmsForDisplay } from '../../lib/formatScheduleTime'
import { formatWeekdaysShortFromStored } from '../../lib/weekdaySchedule'
import type { AdminCourseSection, OpenRegistrationCourseRow } from '../../lib/api'
import type { CourseBinItem } from './CourseBinContext'

const PLACEHOLDER_REGISTERED = '0 of 0'

export type CatalogCourseLite = {
  code: string | number | null | undefined
  eng_name: string | number | null | undefined
  chi_name: string | number | null | undefined
  units: string | number | null | undefined
}

function cellText(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
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

/** Match Course Search CourseBin `type` (raw delivery_mode, not display label). */
export function typeLabelForCourseBin(sec: AdminCourseSection): string {
  const d = cellText(sec.delivery_mode)
  return d === '' ? 'Lecture' : d
}

export function adminSectionToCourseBinItem(
  sec: AdminCourseSection,
  catalog: CatalogCourseLite | undefined,
  prerequisite?: Pick<
    OpenRegistrationCourseRow,
    'prerequisiteCourseId' | 'prerequisiteCourseCode' | 'prerequisiteCourseTitle'
  >,
): CourseBinItem {
  const code = cellText(sec.course_code)
  const timeRaw = formatTimeRangeHmsForDisplay(sec.start_time, sec.end_time)
  const daysRaw = formatWeekdaysShortFromStored(sec.weekday)
  const instRaw = cellText(sec.instructor)
  const locRaw = cellText(sec.room)
  const secCode = cellText(sec.section_code)
  const eng = catalog ? cellText(catalog.eng_name) : ''
  const chi = catalog ? cellText(catalog.chi_name) : ''
  const unitsCat = catalog ? cellText(catalog.units) : ''
  return {
    course_code: code,
    eng_name: eng === '' ? code : eng,
    chi_name: chi,
    prerequisite_course_id: prerequisite?.prerequisiteCourseId ?? null,
    prerequisite_course_code: prerequisite?.prerequisiteCourseCode ?? null,
    prerequisite_course_title: prerequisite?.prerequisiteCourseTitle ?? null,
    units: unitsCat === '' ? '—' : unitsCat,
    section: secCode === '' ? '—' : secCode,
    schedule_track: sec.schedule_track,
    session: sessionLabelFromSection(sec),
    type: typeLabelForCourseBin(sec),
    registered: PLACEHOLDER_REGISTERED,
    time: timeRaw === '—' ? 'TBA' : timeRaw,
    days: daysRaw === '—' ? 'TBA' : daysRaw,
    instructor: instRaw === '' ? 'TBA' : instRaw,
    location: locRaw === '' ? 'TBA' : locRaw,
    schedule_weekday: sec.weekday?.trim() ? sec.weekday.trim() : null,
    schedule_start_time: sec.start_time,
    schedule_end_time: sec.end_time,
  }
}
