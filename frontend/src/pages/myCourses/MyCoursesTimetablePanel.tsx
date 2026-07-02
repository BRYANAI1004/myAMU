import { useMemo, useState } from 'react'
import { useStudentPortalT } from '@/LanguageContext'
import type { StudentPortalKey } from '@/lib/i18n'
import { TimetableWeekGrid } from '../../components/timetable/TimetableWeekGrid'
import type { AdminCourseSection } from '../../lib/api'
import { getPreferredCourseTitle } from '../../lib/courseDisplayName'
import { formatDeliveryModeForDisplay } from '../../lib/deliveryMode'
import { formatTimeHmsForDisplay } from '../../lib/formatScheduleTime'
import { normalizeScheduleTrackValue } from '../../lib/scheduleTrack'
import {
  buildTimetablePlacedBlocksByDay,
  STUDENT_REGISTRATION_TIMETABLE_GRID,
  TIMETABLE_END_HOUR,
  TIMETABLE_START_HOUR,
  timetableBodyHeightPx,
} from '../../lib/timetableBlockLayout'
import { WEEKDAYS_FULL_ORDERED, type WeekdayFull } from '../../lib/weekdaySchedule'
import type { CourseBinItem } from '../registration/CourseBinContext'
import { courseBinSectionKey } from '../registration/CourseBinContext'
import { partitionCourseBinItemsForTimetable } from '../registration/courseBinSchedule'
import { adminSectionToCourseBinItem } from '../registration/sectionToCourseBinItem'

const MY_GRID = STUDENT_REGISTRATION_TIMETABLE_GRID

type TimetableLangTab = 'en' | 'cn'

const WEEKDAY_FULL_TO_LABEL: Record<WeekdayFull, StudentPortalKey> = {
  Monday: 'weekdayMonday',
  Tuesday: 'weekdayTuesday',
  Wednesday: 'weekdayWednesday',
  Thursday: 'weekdayThursday',
  Friday: 'weekdayFriday',
  Saturday: 'weekdaySaturday',
  Sunday: 'weekdaySunday',
}

function weekdayColumnLabel(full: WeekdayFull, t: (key: StudentPortalKey) => string): string {
  return t(WEEKDAY_FULL_TO_LABEL[full])
}

function filterSectionsByLangTab(
  sections: AdminCourseSection[],
  tab: TimetableLangTab,
): AdminCourseSection[] {
  return sections.filter((s) =>
    tab === 'cn'
      ? normalizeScheduleTrackValue(s.schedule_track) === 'CN'
      : normalizeScheduleTrackValue(s.schedule_track) !== 'CN',
  )
}

type TrackTimetableData = {
  placedSections: AdminCourseSection[]
  unplaced: CourseBinItem[]
  placedWeekdays: ReturnType<typeof buildTimetablePlacedBlocksByDay>
  preferredCourseTitleByBinKey: Map<string, string>
}

function buildTrackTimetableData(sections: AdminCourseSection[]): TrackTimetableData {
  const displayItems = sections.map((row) => adminSectionToCourseBinItem(row, undefined))
  const preferredCourseTitleByBinKey = new Map<string, string>()
  for (const it of displayItems) {
    const k = courseBinSectionKey(it.course_code, it.section, it.schedule_track)
    preferredCourseTitleByBinKey.set(
      k,
      getPreferredCourseTitle(
        {
          code: it.course_code,
          eng_name: it.eng_name,
          chi_name: it.chi_name,
        },
        it.schedule_track,
      ),
    )
  }
  const { sections: placedSections, unplaced } = partitionCourseBinItemsForTimetable(displayItems)
  const placedByDayFull = buildTimetablePlacedBlocksByDay(placedSections, MY_GRID)
  return {
    placedSections,
    unplaced,
    placedWeekdays: placedByDayFull.slice(0, WEEKDAYS_FULL_ORDERED.length),
    preferredCourseTitleByBinKey,
  }
}

type MyCoursesTimetableGridProps = {
  data: TrackTimetableData
  hourRows: number[]
  bodyHeightPx: number
  t: (key: StudentPortalKey) => string
}

function MyCoursesTimetableGrid({
  data,
  hourRows,
  bodyHeightPx,
  t,
}: MyCoursesTimetableGridProps) {
  const { placedSections, placedWeekdays, preferredCourseTitleByBinKey } = data

  if (placedSections.length === 0) {
    return (
      <p className="portal-text-muted" role="status">
        {t('registrationScheduleNoPlaceable')}
      </p>
    )
  }

  return (
    <div className="admin-timetable-wrap">
      <TimetableWeekGrid
        rootClassName="portal-my-timetable-v2"
        placedWeekdays={placedWeekdays}
        hourRows={hourRows}
        bodyHeightPx={bodyHeightPx}
        weekdayLabel={(d) => weekdayColumnLabel(d, t)}
        hourLabel={(h) => formatTimeHmsForDisplay(`${h}:00:00`)}
        renderBlock={(b, d) => {
          const sec = b.source
          const colW = 100 / b.colCount
          const insetPx = 3
          const binKey = courseBinSectionKey(
            sec.course_code,
            sec.section_code,
            sec.schedule_track,
          )
          const courseTitle = preferredCourseTitleByBinKey.get(binKey) ?? sec.course_code
          const ariaLabel = t('registrationTimetableBlockAria')
            .replace('{code}', String(sec.course_code))
            .replace('{section}', String(sec.section_code))
            .replace('{title}', courseTitle)
          return (
            <div
              key={`${sec.id}-${d}-${b.startMin}-${b.colIndex}`}
              className="admin-timetable-v2__block portal-my-timetable__block"
              style={{
                top: b.topPx,
                height: b.heightPx,
                left: `calc(${colW * b.colIndex}% + ${insetPx}px)`,
                width: `calc(${colW}% - ${insetPx * 2}px)`,
              }}
              role="group"
              aria-label={ariaLabel}
            >
              <span className="admin-timetable-v2__block-title">
                {sec.course_code} {sec.section_code}
              </span>
              <span className="admin-timetable-v2__block-subtitle">{courseTitle}</span>
              <span className="admin-timetable-v2__block-meta">
                {formatTimeHmsForDisplay(sec.start_time)} – {formatTimeHmsForDisplay(sec.end_time)}
              </span>
              {sec.instructor?.trim() ? (
                <span className="admin-timetable-v2__block-meta">{sec.instructor}</span>
              ) : null}
              {sec.room?.trim() ? (
                <span className="admin-timetable-v2__block-meta">{sec.room}</span>
              ) : null}
              {sec.delivery_mode?.trim() ? (
                <span className="admin-timetable-v2__block-meta">
                  {formatDeliveryModeForDisplay(sec.delivery_mode)}
                </span>
              ) : null}
            </div>
          )
        }}
      />
    </div>
  )
}

type MyCoursesTimetablePanelProps = {
  sections: AdminCourseSection[]
  loading: boolean
  error: string | null
  termMissing: boolean
}

export function MyCoursesTimetablePanel({
  sections,
  loading,
  error,
  termMissing,
}: MyCoursesTimetablePanelProps) {
  const t = useStudentPortalT()
  const tba = t('scheduleTba')
  const [langTab, setLangTab] = useState<TimetableLangTab>('en')

  const englishSections = useMemo(
    () => filterSectionsByLangTab(sections, 'en'),
    [sections],
  )
  const chineseSections = useMemo(
    () => filterSectionsByLangTab(sections, 'cn'),
    [sections],
  )

  const enData = useMemo(() => buildTrackTimetableData(englishSections), [englishSections])
  const cnData = useMemo(() => buildTrackTimetableData(chineseSections), [chineseSections])
  const activeData = langTab === 'en' ? enData : cnData

  const hourRows = useMemo(
    () =>
      Array.from(
        { length: TIMETABLE_END_HOUR - TIMETABLE_START_HOUR + 1 },
        (_, i) => TIMETABLE_START_HOUR + i,
      ),
    [],
  )

  const bodyHeightPx = timetableBodyHeightPx(MY_GRID)

  if (termMissing) {
    return (
      <p className="portal-text-muted" role="status">
        {t('myCoursesSelectTermUnavailable')}
      </p>
    )
  }

  if (loading && sections.length === 0) {
    return (
      <p className="portal-text-muted" role="status" aria-busy="true">
        {t('loadingEllipsis')}
      </p>
    )
  }

  if (error) {
    return (
      <p className="portal-text-muted" role="alert">
        {error}
      </p>
    )
  }

  if (sections.length === 0) {
    return (
      <p className="portal-text-muted" role="status">
        {t('noRegisteredCoursesThisTerm')}
      </p>
    )
  }

  return (
    <div className="portal-my-courses-timetable">
      <div className="admin-scheduling-timetable-card">
        <div className="admin-scheduling-timetable-card__head">
          <div
            className="admin-finance-page-tabs admin-scheduling-timetable-tabs"
            role="tablist"
            aria-label={t('offeredTimetableLanguageAria')}
          >
            <button
              type="button"
              role="tab"
              id="my-courses-tt-tab-en"
              className={`admin-finance-page-tab${langTab === 'en' ? ' admin-finance-page-tab--active' : ''}`}
              aria-selected={langTab === 'en'}
              aria-controls="my-courses-tt-panel-en"
              onClick={() => setLangTab('en')}
            >
              {t('offeredTimetableTabEnglish')}
            </button>
            <button
              type="button"
              role="tab"
              id="my-courses-tt-tab-cn"
              className={`admin-finance-page-tab${langTab === 'cn' ? ' admin-finance-page-tab--active' : ''}`}
              aria-selected={langTab === 'cn'}
              aria-controls="my-courses-tt-panel-cn"
              onClick={() => setLangTab('cn')}
            >
              {t('offeredTimetableTabChinese')}
            </button>
          </div>
        </div>

        <div className="admin-scheduling-timetable-card__body">
          {langTab === 'en' ? (
            <div role="tabpanel" id="my-courses-tt-panel-en" aria-labelledby="my-courses-tt-tab-en">
              {englishSections.length === 0 ? (
                <p className="portal-text-muted" role="status">
                  {t('offeredNoEnglishSections')}
                </p>
              ) : (
                <MyCoursesTimetableGrid
                  data={enData}
                  hourRows={hourRows}
                  bodyHeightPx={bodyHeightPx}
                  t={t}
                />
              )}
            </div>
          ) : (
            <div role="tabpanel" id="my-courses-tt-panel-cn" aria-labelledby="my-courses-tt-tab-cn">
              {chineseSections.length === 0 ? (
                <p className="portal-text-muted" role="status">
                  {t('offeredNoChineseSections')}
                </p>
              ) : (
                <MyCoursesTimetableGrid
                  data={cnData}
                  hourRows={hourRows}
                  bodyHeightPx={bodyHeightPx}
                  t={t}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {activeData.unplaced.length > 0 ? (
        <div className="portal-my-timetable-unplaced portal-stack">
          <h3 className="portal-my-timetable-unplaced__title">{t('registrationScheduleUnplacedTitle')}</h3>
          <p className="portal-text-muted" style={{ marginTop: 0 }}>
            {t('registrationScheduleUnplacedHelp')}
          </p>
          <ul className="portal-my-timetable-unplaced__list">
            {activeData.unplaced.map((u) => (
              <li key={courseBinSectionKey(u.course_code, u.section, u.schedule_track)}>
                <strong>{u.course_code.trim() || '—'}</strong>
                {u.section.trim() ? ` · ${u.section}` : ''}
                {' · '}
                {getPreferredCourseTitle(
                  {
                    code: u.course_code,
                    eng_name: u.eng_name,
                    chi_name: u.chi_name,
                  },
                  u.schedule_track,
                )}
                {u.time.trim() && u.time !== tba ? ` · ${u.time}` : ''}
                {u.days.trim() && u.days !== tba ? ` · ${u.days}` : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
