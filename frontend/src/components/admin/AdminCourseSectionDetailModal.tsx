import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  downloadAdminRegisteredStudentsCsv,
  type AdminCourseSection,
} from '../../lib/api'
import { adminSchedulingQueryString } from '../../lib/adminSchedulingSearchParams'
import {
  getPreferredCourseTitle,
  getSecondaryCourseTitle,
  type CourseTitleFields,
} from '../../lib/courseDisplayName'
import { scheduleTrackDetailLabel } from '../../lib/scheduleTrack'
import { formatDeliveryModeForDisplay } from '../../lib/deliveryMode'
import { formatTimeRangeHmsForDisplay } from '../../lib/formatScheduleTime'
import { formatPrerequisiteCourseDisplay } from '../../lib/prerequisiteCourse'
import { formatWeekdaysLongFromStored } from '../../lib/weekdaySchedule'

type Props = {
  section: AdminCourseSection | null
  /** Catalog names for `section.course_code`, when available */
  courseCatalog?: CourseTitleFields | null
  /** Resolved catalog label for selected term, if available */
  termCatalogLabel?: string | null
  /** Current timetable term filter — enables deep link to edit on Course Sections */
  academicTermId?: string | null
  /** Current page query string (no `?`) — preserved on links back to Course Sections */
  returnSearch?: string
  onClose: () => void
}

function DetailItem({
  label,
  value,
  wide = false,
}: {
  label: string
  value: string
  wide?: boolean
}) {
  return (
    <div
      className={
        wide
          ? 'admin-course-section-detail__item admin-course-section-detail__item--wide'
          : 'admin-course-section-detail__item'
      }
    >
      <span className="admin-course-section-detail__label">{label}</span>
      <span className="admin-course-section-detail__value">{value}</span>
    </div>
  )
}

export function AdminCourseSectionDetailModal({
  section,
  courseCatalog = null,
  termCatalogLabel,
  academicTermId,
  returnSearch = '',
  onClose,
}: Props) {
  const [csvExporting, setCsvExporting] = useState(false)
  const [csvExportError, setCsvExportError] = useState<string | null>(null)

  useEffect(() => {
    setCsvExportError(null)
    setCsvExporting(false)
  }, [section?.id])

  if (section == null) return null

  const titleFields: CourseTitleFields = {
    code: section.course_code,
    eng_name: courseCatalog?.eng_name ?? null,
    chi_name: courseCatalog?.chi_name ?? null,
  }
  const courseTitlePrimary = getPreferredCourseTitle(
    titleFields,
    section.schedule_track,
  )
  const courseTitleAlternate = getSecondaryCourseTitle(
    titleFields,
    section.schedule_track,
  )

  const termLine =
    termCatalogLabel?.trim() ||
    [section.term, section.year].filter(Boolean).join(' ') ||
    '—'
  const prerequisiteDisplay = formatPrerequisiteCourseDisplay({
    courseCode: section.prerequisite_course_code,
    courseTitle: section.prerequisite_course_title,
  })
  const selectedCourseCode = section.course_code.trim()
  const selectedAcademicTermId = academicTermId?.trim() ?? ''
  const courseSectionsSearch = (() => {
    if (selectedCourseCode === '' || selectedAcademicTermId === '') return null
    const query = adminSchedulingQueryString({
      term: selectedAcademicTermId,
      course: selectedCourseCode,
    })
    return query === '' ? null : `?${query}`
  })()

  const scheduleTime = formatTimeRangeHmsForDisplay(
    section.start_time,
    section.end_time,
  )
  const deliveryLabel = formatDeliveryModeForDisplay(section.delivery_mode)
  const trackLabel = scheduleTrackDetailLabel(section.schedule_track)
  const weekdayLabel = formatWeekdaysLongFromStored(section.weekday)

  return (
    <div
      className="admin-section-detail-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="admin-section-detail-modal admin-section-detail-modal--course-section"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-section-detail-title"
      >
        <header className="admin-course-section-detail__head">
          <div className="admin-course-section-detail__head-text">
            <p className="admin-course-section-detail__code">
              {section.course_code} · {section.section_code}
            </p>
            <h2
              id="admin-section-detail-title"
              className="admin-course-section-detail__title"
            >
              {courseTitlePrimary}
            </h2>
            {courseTitleAlternate !== '' ? (
              <p className="admin-course-section-detail__subtitle">
                {courseTitleAlternate}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="admin-course-section-detail__close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="admin-course-section-detail__body">
          <div className="admin-course-section-detail__chips">
            <span className="admin-course-section-detail__chip">{termLine}</span>
            <span className="admin-course-section-detail__chip">{deliveryLabel}</span>
          </div>

          <div className="admin-course-section-detail__grid">
            <DetailItem label="Weekdays" value={weekdayLabel} />
            <DetailItem label="Time" value={scheduleTime} />
            <DetailItem
              label="Room"
              value={section.room?.trim() ? section.room : '—'}
            />
            <DetailItem
              label="Instructor"
              value={section.instructor?.trim() ? section.instructor : '—'}
            />
            <DetailItem
              label="Prerequisite"
              value={prerequisiteDisplay ?? '—'}
            />
            <DetailItem label="Timetable track" value={trackLabel} />
            {section.notes?.trim() ? (
              <DetailItem label="Notes" value={section.notes.trim()} wide />
            ) : null}
          </div>

          {csvExportError != null ? (
            <p
              className="portal-card-note portal-profile-state--error admin-course-section-detail__error"
              role="alert"
            >
              {csvExportError}
            </p>
          ) : null}
        </div>

        <footer className="admin-course-section-detail__foot">
          <button
            type="button"
            className="portal-btn portal-btn--secondary portal-btn--compact"
            disabled={csvExporting}
            onClick={() => {
              setCsvExportError(null)
              setCsvExporting(true)
              void (async () => {
                try {
                  await downloadAdminRegisteredStudentsCsv(section.id)
                } catch (e) {
                  setCsvExportError(
                    e instanceof Error ? e.message : 'CSV export failed.',
                  )
                } finally {
                  setCsvExporting(false)
                }
              })()
            }}
          >
            {csvExporting ? 'Exporting…' : 'Export CSV'}
          </button>
          {academicTermId != null &&
            academicTermId !== '' &&
            selectedCourseCode !== '' && (
              <Link
                to={{
                  pathname: '/admin/course-sections',
                  search: (() => {
                    const n = new URLSearchParams(returnSearch)
                    n.set('term', selectedAcademicTermId)
                    n.set('course', selectedCourseCode)
                    n.set('edit', String(section.id))
                    const s = n.toString()
                    return s ? `?${s}` : ''
                  })(),
                }}
                className="portal-btn portal-btn--secondary portal-btn--compact"
                onClick={onClose}
              >
                Edit section
              </Link>
            )}
          {courseSectionsSearch != null ? (
            <Link
              to={{
                pathname: '/admin/course-sections',
                search: courseSectionsSearch,
              }}
              className="portal-btn portal-btn--secondary portal-btn--compact"
              onClick={onClose}
            >
              Course Sections
            </Link>
          ) : (
            <button
              type="button"
              className="portal-btn portal-btn--secondary portal-btn--compact"
              disabled
            >
              Course Sections
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}
