import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAccount } from '../../context/AccountContext'
import {
  currentTermLabel,
  formatPortalCourseInstructor,
  formatPortalCourseLocation,
  noCurrentCoursesMessage,
} from '../../lib/academicCourseRecordsDisplay'
import type { ScheduleRow } from '../../types/billing'

type CalendarView = 'list' | 'week'

/**
 * Split free-text location into building/place (line 1) and room/suite/virtual detail (line 2).
 * Handles trailing room numbers, trailing "Suite", and parenthetical qualifiers (e.g. synchronous virtual).
 */
function splitLocationDisplay(raw: string): { line1: string; line2: string } {
  const s = raw.trim()
  if (!s) return { line1: '', line2: '' }

  const paren = s.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
  if (paren) {
    return { line1: paren[1]!.trim(), line2: `(${paren[2]!})` }
  }

  const words = s.split(/\s+/)
  if (words.length >= 2) {
    const last = words[words.length - 1]!
    if (/^\d+[A-Za-z]?$/.test(last)) {
      return { line1: words.slice(0, -1).join(' '), line2: last }
    }
    if (last.toLowerCase() === 'suite') {
      return { line1: words.slice(0, -1).join(' '), line2: last }
    }
  }

  return { line1: s, line2: '' }
}

function LocationCell({ location }: { location: string }) {
  const { line1, line2 } = splitLocationDisplay(location)
  return (
    <div className="portal-dashboard-courses-location-stack">
      <span className="portal-dashboard-courses-location-building">{line1}</span>
      {line2 ? <span className="portal-dashboard-courses-location-detail">{line2}</span> : null}
    </div>
  )
}

/**
 * Parse meeting text into card blocks: days (line 1) + time range (line 2).
 * Semicolons separate distinct meeting patterns (e.g. Mon/Thu blocks).
 */
function parseScheduleBlocks(schedule: string): { line1: string; line2: string }[] {
  const parts = schedule
    .split(/\s*;\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
  const timeTail = /^(.+?),\s*(\d{1,2}:\d{2}\s*(?:AM|PM)\s*[–-]\s*\d{1,2}:\d{2}\s*(?:AM|PM))\s*$/i
  const blocks: { line1: string; line2: string }[] = []
  for (const part of parts) {
    const m = part.match(timeTail)
    if (m) {
      blocks.push({ line1: m[1]!.trim(), line2: m[2]!.trim() })
    } else {
      blocks.push({ line1: part, line2: '' })
    }
  }
  return blocks.length ? blocks : [{ line1: schedule.trim(), line2: '' }]
}

function ScheduleCell({ schedule }: { schedule: string }) {
  const blocks = parseScheduleBlocks(schedule)
  return (
    <div className="portal-dashboard-courses-schedule-stack">
      {blocks.map((b, i) => (
        <div key={i} className="portal-dashboard-courses-schedule-block">
          <span className="portal-dashboard-courses-schedule-day">{b.line1}</span>
          {b.line2 ? <span className="portal-dashboard-courses-schedule-time">{b.line2}</span> : null}
        </div>
      ))}
    </div>
  )
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function WeekGridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M3 9h18M9 4v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function registrationStatusLabel(status: string): string {
  switch (status) {
    case 'registered':
      return 'Registered'
    case 'not_registered':
      return 'Not registered'
    case 'in_progress':
      return 'Registration in progress'
    case 'unknown':
      return 'Schedule status unavailable'
    default:
      return 'Schedule status unavailable'
  }
}

function scheduleRowKey(row: ScheduleRow, index: number): string {
  const code = row.courseCode?.trim() || 'course'
  return `${code}-${index}`
}

export function DashboardCoursesWidget() {
  const [view, setView] = useState<CalendarView>('list')
  const { account, loading, isAuthenticated } = useAccount()

  const scheduleRows = account.scheduleRows
  const currentTerm = account.currentTerm
  const registration = account.registration
  const termLabel =
    currentTerm.label?.trim() ||
    currentTermLabel(
      currentTerm.term?.trim() && Number.isFinite(currentTerm.year) && currentTerm.year > 0
        ? { term: currentTerm.term, year: currentTerm.year }
        : null,
    )

  const isLoadingAccount = Boolean(loading && isAuthenticated)
  const showCourseTable =
    !isLoadingAccount &&
    registration.status === 'registered' &&
    scheduleRows.length > 0

  const showWeekTimetableMessage =
    !isLoadingAccount && showCourseTable && view === 'week'

  const showEmptyState =
    !isLoadingAccount && (registration.status !== 'registered' || scheduleRows.length === 0)

  return (
    <section className="portal-dashboard-courses" aria-labelledby="portal-dashboard-courses-heading">
      <header className="portal-dashboard-courses-head">
        <div className="portal-dashboard-courses-head-text">
          <h2 id="portal-dashboard-courses-heading" className="portal-dashboard-card-panel-title">
            My Calendar
          </h2>
          <p className="portal-dashboard-courses-term-line">{termLabel}</p>
          <p
            className="portal-dashboard-courses-registration-status"
            data-status={registration.status}
          >
            {registrationStatusLabel(registration.status)}
          </p>
        </div>
        <div
          className="portal-dashboard-courses-view-tabs"
          role="tablist"
          aria-label="Calendar view"
        >
          <button
            type="button"
            role="tab"
            className="portal-dashboard-courses-view-tab"
            aria-selected={view === 'list'}
            id="portal-dashboard-calendar-tab-courses"
            onClick={() => setView('list')}
          >
            <ListIcon className="portal-dashboard-courses-view-tab-icon" />
            <span>Courses</span>
          </button>
          <button
            type="button"
            role="tab"
            className="portal-dashboard-courses-view-tab"
            aria-selected={view === 'week'}
            id="portal-dashboard-calendar-tab-week"
            onClick={() => setView('week')}
          >
            <WeekGridIcon className="portal-dashboard-courses-view-tab-icon" />
            <span>Week</span>
          </button>
        </div>
      </header>

      {isLoadingAccount ? (
        <div className="portal-dashboard-courses-loading" role="status">
          Loading your courses…
        </div>
      ) : null}

      {!isLoadingAccount && showEmptyState ? (
        <div className="portal-dashboard-courses-empty" aria-live="polite">
          <h3 className="portal-dashboard-courses-empty-title">No courses registered</h3>
          <p className="portal-dashboard-courses-empty-text">
            {registration.emptyReason?.trim()
              ? registration.emptyReason.trim()
              : noCurrentCoursesMessage(termLabel)}
          </p>
          <Link to="/registration" className="portal-dashboard-courses-empty-cta">
            Go to Registration
          </Link>
        </div>
      ) : null}

      {!isLoadingAccount && showCourseTable && view === 'list' ? (
        <div className="portal-dashboard-courses-table-wrap">
          <table className="portal-dashboard-courses-table">
            <colgroup>
              <col className="portal-dashboard-courses-col-course" />
              <col className="portal-dashboard-courses-col-title" />
              <col className="portal-dashboard-courses-col-schedule" />
              <col className="portal-dashboard-courses-col-instructor" />
              <col className="portal-dashboard-courses-col-location" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">Course</th>
                <th scope="col">Title</th>
                <th scope="col">Schedule</th>
                <th scope="col">Instructor</th>
                <th scope="col">Location</th>
              </tr>
            </thead>
            <tbody>
              {scheduleRows.map((c, i) => {
                const sched =
                  c.schedule != null && String(c.schedule).trim() !== ''
                    ? String(c.schedule)
                    : '—'
                const loc = formatPortalCourseLocation(c.location)
                const inst = formatPortalCourseInstructor(c.instructor)
                return (
                  <tr key={scheduleRowKey(c, i)}>
                    <td className="portal-dashboard-courses-code">
                      <span className="portal-dashboard-courses-course-code">{c.courseCode}</span>
                    </td>
                    <td className="portal-dashboard-courses-title-cell">
                      <span className="portal-dashboard-courses-title-text">
                        {c.title?.trim() ? c.title.trim() : '—'}
                      </span>
                    </td>
                    <td className="portal-dashboard-courses-schedule">
                      <ScheduleCell schedule={sched} />
                    </td>
                    <td className="portal-dashboard-courses-instructor">{inst}</td>
                    <td className="portal-dashboard-courses-location">
                      <LocationCell location={loc} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {showWeekTimetableMessage ? (
        <div
          className="portal-dashboard-courses-timetable-wrap"
          role="region"
          aria-label="Weekly timetable"
        >
          <p className="portal-dashboard-courses-week-placeholder">
            Official weekly timetable is not available for this term. Use the Courses tab for meeting
            days and times from your schedule of record.
          </p>
        </div>
      ) : null}

    </section>
  )
}
