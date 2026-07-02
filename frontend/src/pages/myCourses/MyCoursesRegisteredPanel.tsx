import { useMemo } from 'react'
import { useStudentPortalT } from '@/LanguageContext'
import type { AdminCourseSection } from '../../lib/api'
import { getPreferredCourseTitle } from '../../lib/courseDisplayName'
import { formatDeliveryModeForDisplay } from '../../lib/deliveryMode'
import { formatTimeRangeHmsForDisplay } from '../../lib/formatScheduleTime'
import { formatWeekdaysLongFromStored } from '../../lib/weekdaySchedule'
import { scheduleTrackDetailLabel } from '../../lib/scheduleTrack'

type MyCoursesRegisteredPanelProps = {
  sections: AdminCourseSection[]
  loading: boolean
  error: string | null
  termMissing: boolean
}

function scheduleLine(sec: AdminCourseSection, tba: string): string {
  const days = formatWeekdaysLongFromStored(sec.weekday).trim()
  const time = formatTimeRangeHmsForDisplay(sec.start_time, sec.end_time).trim()
  const parts = [days, time].filter((p) => p !== '' && p !== tba)
  return parts.length > 0 ? parts.join(' · ') : tba
}

export function MyCoursesRegisteredPanel({
  sections,
  loading,
  error,
  termMissing,
}: MyCoursesRegisteredPanelProps) {
  const t = useStudentPortalT()
  const tba = t('scheduleTba')

  const rows = useMemo(
    () =>
      [...sections].sort((a, b) => {
        const codeCmp = a.course_code.localeCompare(b.course_code)
        if (codeCmp !== 0) return codeCmp
        return a.section_code.localeCompare(b.section_code)
      }),
    [sections],
  )

  if (termMissing) {
    return (
      <p className="portal-text-muted" role="status">
        {t('myCoursesSelectTermUnavailable')}
      </p>
    )
  }

  if (loading && rows.length === 0) {
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

  if (rows.length === 0) {
    return (
      <p className="portal-text-muted" role="status">
        {t('noRegisteredCoursesThisTerm')}
      </p>
    )
  }

  return (
    <div className="portal-table-wrap">
      <table className="portal-table portal-table--courses portal-my-courses-table">
        <caption className="visually-hidden">{t('myCoursesRegisteredCaption')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('code')}</th>
            <th scope="col">{t('description')}</th>
            <th scope="col">{t('sectionColSection')}</th>
            <th scope="col">{t('myCoursesColSchedule')}</th>
            <th scope="col">{t('sectionColInstructor')}</th>
            <th scope="col">{t('sectionColLocation')}</th>
            <th scope="col">{t('sectionColType')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((sec) => {
            const title = getPreferredCourseTitle(
              {
                code: sec.course_code,
                eng_name: sec.course_title,
                chi_name: null,
              },
              sec.schedule_track,
              sec.course_title,
            )
            const track = scheduleTrackDetailLabel(sec.schedule_track)
            return (
              <tr key={sec.id}>
                <td>{sec.course_code.trim() || '—'}</td>
                <td>
                  <div>{title}</div>
                  {track ? (
                    <div className="portal-my-courses-table__sub">{track}</div>
                  ) : null}
                </td>
                <td>{sec.section_code.trim() || '—'}</td>
                <td>{scheduleLine(sec, tba)}</td>
                <td>{sec.instructor?.trim() || '—'}</td>
                <td>{sec.room?.trim() || '—'}</td>
                <td className="portal-table-cell-capitalize">
                  {sec.delivery_mode?.trim()
                    ? formatDeliveryModeForDisplay(sec.delivery_mode)
                    : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
