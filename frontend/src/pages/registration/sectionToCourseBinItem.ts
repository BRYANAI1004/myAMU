import { formatTimeRangeHmsForDisplay } from '../../lib/formatScheduleTime'
import { formatWeekdaysShortFromStored } from '../../lib/weekdaySchedule'
import type { AdminCourseSection } from '../../lib/api'
import type { CourseBinItem } from './CourseBinContext'

const PLACEHOLDER_REGISTERED = '0 of 0'

export type CatalogCourseLite = {
  code: string | number | null | undefined
  eng_name: string | number | null | undefined
  chi_name: string | number | null | undefined
  units: string | number | null | undefined
}

type SectionCourseBinSource = {
  course_code: string
  prerequisite_course_id?: string | null
  prerequisite_course_code?: string | null
  prerequisite_course_title?: string | null
  term: string
  year: number
  section_code: string
  schedule_track?: 'EN' | 'CN'
  weekday: string
  start_time: string | null
  end_time: string | null
  delivery_mode: string | null
  instructor: string | null
  room: string | null
}

function cellText(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function sessionLabelFromSection(
  sec: Pick<SectionCourseBinSource, 'term' | 'year'>,
): string {
  const term = cellText(sec.term)
  const year = sec.year
  if (term === '' && (year === null || year === undefined || Number.isNaN(Number(year)))) {
    return '—'
  }
  if (term === '') return String(year)
  return `${term} ${year}`
}

/** Match Course Search CourseBin `type` (raw delivery_mode, not display label). */
function typeLabelForCourseBin(sec: Pick<SectionCourseBinSource, 'delivery_mode'>): string {
  const d = cellText(sec.delivery_mode)
  return d === '' ? 'Lecture' : d
}

function sectionToCourseBinItem(
  sec: SectionCourseBinSource,
  catalog: CatalogCourseLite | undefined,
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
    prerequisite_course_id: sec.prerequisite_course_id ?? null,
    prerequisite_course_code: sec.prerequisite_course_code ?? null,
    prerequisite_course_title: sec.prerequisite_course_title ?? null,
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

export function adminSectionToCourseBinItem(
  sec: AdminCourseSection,
  catalog: CatalogCourseLite | undefined,
): CourseBinItem {
  return sectionToCourseBinItem(sec, catalog)
}

export function courseSearchSectionToCourseBinItem(
  sec: SectionCourseBinSource,
  catalog: CatalogCourseLite,
): CourseBinItem {
  return sectionToCourseBinItem(sec, catalog)
}
