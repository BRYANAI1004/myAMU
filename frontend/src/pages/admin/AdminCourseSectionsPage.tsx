import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAdminPortalTerm } from '../../context/AdminPortalTermContext'
import {
  adminSchedulingQueryString,
  applyAdminSchedulingToSearchParams,
} from '../../lib/adminSchedulingSearchParams'
import { AdminTime12hFields } from '../../components/admin/AdminTime12hFields'
import {
  createAdminCourseSection,
  deleteAdminCourseSection,
  downloadAdminRegisteredStudentsCsv,
  fetchAcademicTerms,
  fetchAdminCourseSectionCourseMeta,
  fetchAdminCourseSections,
  fetchCourses,
  updateAdminCourseSection,
  type AcademicTerm,
  type AdminCourseSection,
  type CourseCatalogItem,
} from '../../lib/api'
import {
  canonicalDeliveryMode,
  DELIVERY_MODE_OPTIONS,
  formatDeliveryModeForDisplay,
} from '../../lib/deliveryMode'
import {
  formatTimeHmsForDisplay,
  inputTimeToApi,
  timeToInputValue,
} from '../../lib/formatScheduleTime'
import {
  formatWeekdaysShortFromStored,
  parseStoredWeekdaysToFullNames,
  selectedWeekdaysToStorage,
  WEEKDAYS_FULL_ORDERED,
  type WeekdayFull,
} from '../../lib/weekdaySchedule'
import {
  formatCourseCatalogSelectLabel,
  getPreferredCourseTitle,
  type CourseTitleFields,
} from '../../lib/courseDisplayName'
import { getPreferredInstructorDisplay } from '../../lib/instructorDisplayName'
import type { AdminInstructorSuggestion } from '../../lib/api'
import { scheduleTrackTableLabel } from '../../lib/scheduleTrack'
import { formatCatalogCredits } from './courses/courseCatalogDisplay'

type FormState = {
  section_code: string
  schedule_track: 'EN' | 'CN'
  prerequisite_course_id: string
  weekdays: WeekdayFull[]
  start_time: string
  end_time: string
  delivery_mode: string
  room: string
  instructor: string
  notes: string
}

const emptyForm = (): FormState => ({
  section_code: '',
  schedule_track: 'EN',
  prerequisite_course_id: '',
  weekdays: ['Monday'],
  start_time: '',
  end_time: '',
  delivery_mode: '',
  room: '',
  instructor: '',
  notes: '',
})

function toggleWeekday(
  current: WeekdayFull[],
  day: WeekdayFull,
  checked: boolean,
): WeekdayFull[] {
  const set = new Set(current)
  if (checked) set.add(day)
  else set.delete(day)
  return WEEKDAYS_FULL_ORDERED.filter((d) => set.has(d))
}

const WEEKDAY_SHORT: Record<WeekdayFull, string> = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
  Sunday: 'Sun',
}

type SectionCardProps = {
  row: AdminCourseSection
  title: string
  prereqCode: string
  busy: boolean
  csvExportSectionId: number | null
  onEdit: (row: AdminCourseSection) => void
  onViewRoster: (row: AdminCourseSection) => void
  onExportCsv: (row: AdminCourseSection) => void
  onDeleteRow: (row: AdminCourseSection) => void
}

function SectionCard({
  row,
  title,
  prereqCode,
  busy,
  csvExportSectionId,
  onEdit,
  onViewRoster,
  onExportCsv,
  onDeleteRow,
}: SectionCardProps) {
  const scheduleLine = [
    formatWeekdaysShortFromStored(row.weekday),
    `${formatTimeHmsForDisplay(row.start_time)} – ${formatTimeHmsForDisplay(row.end_time)}`,
    row.room?.trim() ? row.room.trim() : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const metaLine = [
    row.instructor?.trim() ? row.instructor.trim() : null,
    formatDeliveryModeForDisplay(row.delivery_mode),
  ]
    .filter((x) => x && x !== '—')
    .join(' · ')

  return (
    <article className="admin-course-section-card">
      <div className="admin-course-section-card__header">
        <div className="admin-course-section-card__identity">
          <div className="admin-course-section-card__code-row">
            <span className="admin-course-section-card__code">
              {row.section_code}
            </span>
            <span
              className={`admin-course-section-card__track admin-course-section-card__track--${row.schedule_track === 'CN' ? 'cn' : 'en'}`}
            >
              {scheduleTrackTableLabel(row.schedule_track)}
            </span>
          </div>
          <h3 className="admin-course-section-card__title">{title}</h3>
        </div>
        <div className="admin-course-section-card__enrolled">
          <span className="admin-course-section-card__enrolled-count">
            {row.enrolled_count}
          </span>
          <span className="admin-course-section-card__enrolled-label">
            enrolled
          </span>
        </div>
      </div>

      <div className="admin-course-section-card__body">
        <p className="admin-course-section-card__schedule">{scheduleLine}</p>
        {metaLine ? (
          <p className="admin-course-section-card__meta">{metaLine}</p>
        ) : null}
        {prereqCode !== '—' ? (
          <p className="admin-course-section-card__prereq">
            Prerequisite: {prereqCode}
          </p>
        ) : null}
        {row.notes?.trim() ? (
          <p className="admin-course-section-card__notes">{row.notes.trim()}</p>
        ) : null}
      </div>

      <div className="admin-course-section-card__footer">
        <button
          type="button"
          className="admin-course-section-card__action"
          disabled={busy}
          onClick={() => onEdit(row)}
        >
          Edit
        </button>
        <button
          type="button"
          className="admin-course-section-card__action"
          disabled={busy}
          onClick={() => onViewRoster(row)}
        >
          Roster
        </button>
        <button
          type="button"
          className="admin-course-section-card__action"
          disabled={busy || csvExportSectionId != null}
          onClick={() => onExportCsv(row)}
        >
          {csvExportSectionId === row.id ? 'Exporting…' : 'Students CSV'}
        </button>
        <button
          type="button"
          className="admin-course-section-card__action admin-course-section-card__action--danger"
          disabled={busy}
          onClick={() => void onDeleteRow(row)}
        >
          Delete
        </button>
      </div>
    </article>
  )
}

type SectionGroupProps = {
  ariaLabelledBy: string
  title: string
  rows: AdminCourseSection[]
  emptyMessage: string
  resolveRowTitle: (row: AdminCourseSection) => string
  resolvePrerequisiteCode: (row: AdminCourseSection) => string
  busy: boolean
  csvExportSectionId: number | null
  onEdit: (row: AdminCourseSection) => void
  onViewRoster: (row: AdminCourseSection) => void
  onExportCsv: (row: AdminCourseSection) => void
  onDeleteRow: (row: AdminCourseSection) => void
}

function SectionGroup({
  ariaLabelledBy,
  title,
  rows,
  emptyMessage,
  resolveRowTitle,
  resolvePrerequisiteCode,
  busy,
  csvExportSectionId,
  onEdit,
  onViewRoster,
  onExportCsv,
  onDeleteRow,
}: SectionGroupProps) {
  return (
    <section
      className="admin-course-sections-group"
      aria-labelledby={ariaLabelledBy}
    >
      <h3 id={ariaLabelledBy} className="admin-course-sections-group__title">
        {title}
        <span className="admin-course-sections-group__count">{rows.length}</span>
      </h3>
      {rows.length === 0 ? (
        <p className="admin-course-sections-group__empty">{emptyMessage}</p>
      ) : (
        <div className="admin-course-sections-group__list">
          {rows.map((row) => (
            <SectionCard
              key={row.id}
              row={row}
              title={resolveRowTitle(row)}
              prereqCode={resolvePrerequisiteCode(row)}
              busy={busy}
              csvExportSectionId={csvExportSectionId}
              onEdit={onEdit}
              onViewRoster={onViewRoster}
              onExportCsv={onExportCsv}
              onDeleteRow={onDeleteRow}
            />
          ))}
        </div>
      )}
    </section>
  )
}

type SectionFormPanelProps = {
  open: boolean
  editingId: number | null
  busy: boolean
  form: FormState
  formMessage: string | null
  courseTitleDraft: string
  courseCode: string
  academicTermId: string
  selectedTermLabel: string
  fullCatalogPrerequisiteOptions: CourseCatalogItem[]
  courseCatalogById: Map<string, CourseCatalogItem>
  onClose: () => void
  onSubmitCreate: () => void
  onSubmitUpdate: () => void
  onDelete: () => void
  setForm: Dispatch<SetStateAction<FormState>>
  setCourseTitleDraft: (v: string) => void
  setCourseTitleLocked: (v: boolean) => void
  setInstructorLocked: (v: boolean) => void
}

function SectionFormPanel({
  open,
  editingId,
  busy,
  form,
  formMessage,
  courseTitleDraft,
  courseCode,
  academicTermId,
  selectedTermLabel,
  fullCatalogPrerequisiteOptions,
  courseCatalogById,
  onClose,
  onSubmitCreate,
  onSubmitUpdate,
  onDelete,
  setForm,
  setCourseTitleDraft,
  setCourseTitleLocked,
  setInstructorLocked,
}: SectionFormPanelProps) {
  const panelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!open) return
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [open, editingId])

  if (!open) return null

  const isEdit = editingId != null
  const hasContext =
    courseCode.trim() !== '' && academicTermId.trim() !== ''

  return (
    <section
      ref={panelRef}
      className="admin-course-section-form-panel portal-card"
      aria-labelledby="course-section-form-title"
    >
      <header className="admin-course-section-form__header">
        <div className="admin-course-section-form__header-main">
          <h2
            id="course-section-form-title"
            className="admin-course-section-form__title"
          >
            {isEdit ? `Edit section ${form.section_code}` : 'Add section'}
          </h2>
          {hasContext ? (
            <div className="admin-course-section-form__context">
              <span className="admin-course-section-form__context-chip admin-course-section-form__context-chip--course">
                {courseCode}
              </span>
              <span className="admin-course-section-form__context-chip">
                {selectedTermLabel}
              </span>
            </div>
          ) : (
            <p className="admin-course-section-form__context-hint">
              Select a term and course above first.
            </p>
          )}
        </div>
        <button
          type="button"
          className="admin-course-section-form__close"
          aria-label="Close"
          disabled={busy}
          onClick={onClose}
        >
          ×
        </button>
      </header>

      {formMessage != null ? (
        <p className="admin-course-section-form__error" role="alert">
          {formMessage}
        </p>
      ) : null}

      <div className="admin-course-section-form__grid">
            <section className="admin-course-section-form__panel">
              <h3 className="admin-course-section-form__panel-title">
                Section details
              </h3>
              <div className="admin-course-section-form__panel-body">
              <div className="admin-course-section-form__field">
                <span className="admin-course-section-form__field-label">
                  Schedule track
                </span>
                <div
                  className="admin-course-section-form__track-toggle"
                  role="group"
                  aria-label="Schedule track"
                >
                  {(
                    [
                      ['EN', 'English', 'English timetable'],
                      ['CN', 'Chinese', 'Chinese timetable'],
                    ] as const
                  ).map(([value, label, ariaLabel]) => {
                    const active = form.schedule_track === value
                    return (
                      <button
                        key={value}
                        type="button"
                        className={`admin-course-section-form__track-option${active ? ' admin-course-section-form__track-option--active' : ''}${value === 'EN' ? ' admin-course-section-form__track-option--en' : ' admin-course-section-form__track-option--cn'}`}
                        aria-pressed={active}
                        aria-label={ariaLabel}
                        disabled={busy}
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            schedule_track: value,
                          }))
                        }
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <label className="admin-course-section-form__field">
                <span>Section code</span>
                <input
                  className="admin-input admin-course-section-form__input"
                  value={form.section_code}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, section_code: e.target.value }))
                  }
                  placeholder="e.g. A"
                  autoComplete="off"
                  disabled={busy}
                />
              </label>
              <label className="admin-course-section-form__field">
                <span>Delivery mode</span>
                <select
                  className="admin-input admin-course-section-form__input"
                  value={form.delivery_mode.trim()}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, delivery_mode: e.target.value }))
                  }
                  disabled={busy}
                >
                  <option value="">Not selected</option>
                  {DELIVERY_MODE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                  {form.delivery_mode.trim() !== '' &&
                    canonicalDeliveryMode(form.delivery_mode) == null && (
                      <option value={form.delivery_mode.trim()}>
                        {form.delivery_mode.trim()} (legacy)
                      </option>
                    )}
                </select>
              </label>
              <label className="admin-course-section-form__field">
                <span>Course title</span>
                <input
                  type="text"
                  className="admin-input admin-course-section-form__input"
                  value={courseTitleDraft}
                  onChange={(e) => {
                    setCourseTitleLocked(true)
                    setCourseTitleDraft(e.target.value)
                  }}
                  disabled={busy}
                  autoComplete="off"
                />
              </label>
              <label className="admin-course-section-form__field">
                <span>Prerequisite course</span>
                <select
                  className="admin-input admin-course-section-form__input"
                  value={form.prerequisite_course_id}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      prerequisite_course_id: e.target.value,
                    }))
                  }
                  disabled={busy || fullCatalogPrerequisiteOptions.length === 0}
                >
                  <option value="">None</option>
                  {fullCatalogPrerequisiteOptions.map((c) => {
                    const courseId = c.course_id?.trim() ?? ''
                    const unmapped = courseId === ''
                    return (
                      <option
                        key={unmapped ? `unmapped:${c.code}` : courseId}
                        value={unmapped ? `unmapped:${c.code}` : courseId}
                        disabled={unmapped}
                      >
                        {formatCourseCatalogSelectLabel(c)}
                        {unmapped ? ' (no portal course_id)' : ''}
                      </option>
                    )
                  })}
                  {form.prerequisite_course_id.trim() !== '' &&
                    !courseCatalogById.has(form.prerequisite_course_id) && (
                      <option value={form.prerequisite_course_id}>
                        {form.prerequisite_course_id} (unavailable)
                      </option>
                    )}
                </select>
              </label>
              </div>
            </section>

            <section className="admin-course-section-form__panel">
              <h3 className="admin-course-section-form__panel-title">Schedule</h3>
              <div className="admin-course-section-form__panel-body">
              <div className="admin-course-section-form__field">
                <span className="admin-course-section-form__field-label">
                  Days of the week
                </span>
                <div
                  className="admin-course-section-form__weekdays"
                  role="group"
                  aria-label="Weekdays"
                >
                  {WEEKDAYS_FULL_ORDERED.map((d) => {
                    const active = form.weekdays.includes(d)
                    return (
                      <button
                        key={d}
                        type="button"
                        className={`admin-course-section-form__weekday${active ? ' admin-course-section-form__weekday--active' : ''}`}
                        aria-pressed={active}
                        aria-label={d}
                        disabled={busy}
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            weekdays: toggleWeekday(f.weekdays, d, !active),
                          }))
                        }
                      >
                        {WEEKDAY_SHORT[d]}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="admin-course-section-form__times">
                <div className="admin-course-section-form__time-slot">
                  <AdminTime12hFields
                    idPrefix="section-start"
                    label="Start time"
                    layout="stacked"
                    value={form.start_time}
                    onChange={(v) => setForm((f) => ({ ...f, start_time: v }))}
                    disabled={busy}
                  />
                </div>
                <span
                  className="admin-course-section-form__time-separator"
                  aria-hidden="true"
                >
                  to
                </span>
                <div className="admin-course-section-form__time-slot">
                  <AdminTime12hFields
                    idPrefix="section-end"
                    label="End time"
                    layout="stacked"
                    value={form.end_time}
                    onChange={(v) => setForm((f) => ({ ...f, end_time: v }))}
                    disabled={busy}
                  />
                </div>
              </div>
              </div>
            </section>

            <section className="admin-course-section-form__panel">
              <h3 className="admin-course-section-form__panel-title">
                Location &amp; staff
              </h3>
              <div className="admin-course-section-form__panel-body">
              <label className="admin-course-section-form__field">
                <span>Room</span>
                <input
                  className="admin-input admin-course-section-form__input"
                  value={form.room}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, room: e.target.value }))
                  }
                  placeholder="Building / room"
                  disabled={busy}
                />
              </label>
              <label className="admin-course-section-form__field">
                <span>Instructor</span>
                <input
                  className="admin-input admin-course-section-form__input"
                  value={form.instructor}
                  onChange={(e) => {
                    setInstructorLocked(true)
                    setForm((f) => ({ ...f, instructor: e.target.value }))
                  }}
                  disabled={busy}
                />
              </label>
              <label className="admin-course-section-form__field">
                <span>Notes</span>
                <textarea
                  className="admin-input admin-textarea admin-course-section-form__textarea"
                  rows={3}
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  placeholder="Optional scheduling notes…"
                  disabled={busy}
                />
              </label>
              </div>
            </section>
      </div>

      <footer className="admin-course-section-form__footer">
          {isEdit ? (
            <button
              type="button"
              className="portal-btn portal-btn--admin-danger portal-btn--compact"
              disabled={busy}
              onClick={() => void onDelete()}
            >
              Delete
            </button>
          ) : (
            <span aria-hidden="true" />
          )}
          <div className="admin-course-section-form__footer-actions">
            <button
              type="button"
              className="portal-btn portal-btn--secondary portal-btn--compact"
              disabled={busy}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="admin-academic-terms-page__save-btn portal-btn portal-btn--compact"
              disabled={busy || !hasContext}
              onClick={() => void (isEdit ? onSubmitUpdate() : onSubmitCreate())}
            >
              {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create section'}
            </button>
          </div>
        </footer>
    </section>
  )
}

export function AdminCourseSectionsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    activeTermId,
    setActiveTermId,
    resolveTermId,
    loading: portalTermLoading,
  } = useAdminPortalTerm()
  const [terms, setTerms] = useState<AcademicTerm[] | null>(null)
  const [courses, setCourses] = useState<CourseCatalogItem[] | null>(null)
  const [academicTermId, setAcademicTermId] = useState('')
  const [courseCode, setCourseCode] = useState('')
  const [courseSearch, setCourseSearch] = useState('')
  const [sections, setSections] = useState<AdminCourseSection[] | null>(null)
  const [sectionsLoading, setSectionsLoading] = useState(false)
  const [sectionsError, setSectionsError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(() => emptyForm())
  const [editingId, setEditingId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [csvExportSectionId, setCsvExportSectionId] = useState<number | null>(
    null,
  )
  const [csvExportError, setCsvExportError] = useState<string | null>(null)
  const [formMessage, setFormMessage] = useState<string | null>(null)
  const [showSectionForm, setShowSectionForm] = useState(false)
  /** Bumped after create/update/delete so the sections query re-runs without changing term/course. */
  const [listVersion, setListVersion] = useState(0)
  /**
   * Course-meta for the selected `courseCode` only (stale rows cleared when code changes).
   * Legacy title is used when catalog `eng_name` / `chi_name` are both empty.
   * `instructorSuggestion` drives create-mode instructor auto-fill (track-aware via getPreferredInstructorDisplay).
   */
  const [resolvedCourseMeta, setResolvedCourseMeta] = useState<{
    courseCode: string
    legacyTitle: string | null
    instructorSuggestion: AdminInstructorSuggestion | null
  } | null>(null)

  /** Create/edit: auto-filled course title; `locked` stops track-driven overwrites after manual edits. */
  const [courseTitleDraft, setCourseTitleDraft] = useState('')
  const [courseTitleLocked, setCourseTitleLocked] = useState(false)

  /** Create mode: after a manual instructor edit, do not overwrite until reset/create/cancel. */
  const [instructorLocked, setInstructorLocked] = useState(false)

  const resetForm = useCallback(() => {
    setForm(emptyForm())
    setEditingId(null)
    setFormMessage(null)
    setCourseTitleLocked(false)
    setInstructorLocked(false)
    setShowSectionForm(false)
  }, [])

  /** Create flow: clear section fields but keep the admin's timetable track (EN/CN) when only the course changes. */
  const resetFormKeepingScheduleTrack = useCallback(() => {
    setForm((prev) => ({ ...emptyForm(), schedule_track: prev.schedule_track }))
    setEditingId(null)
    setFormMessage(null)
    setCourseTitleLocked(false)
    setInstructorLocked(false)
    setShowSectionForm(false)
  }, [])

  useEffect(() => {
    if (portalTermLoading) return
    const ac = new AbortController()
    ;(async () => {
      const [termOutcome, courseOutcome] = await Promise.allSettled([
        fetchAcademicTerms({ signal: ac.signal }),
        fetchCourses({ signal: ac.signal }),
      ])
      if (ac.signal.aborted) return

      const t = termOutcome.status === 'fulfilled' ? termOutcome.value : []
      const c = courseOutcome.status === 'fulfilled' ? courseOutcome.value : []
      setTerms(t)
      setCourses(c)

      const termFailed = termOutcome.status === 'rejected'
      const courseFailed = courseOutcome.status === 'rejected'
      if (termFailed && courseFailed) {
        const a =
          termOutcome.reason instanceof Error
            ? termOutcome.reason.message
            : 'Could not load academic terms.'
        const b =
          courseOutcome.reason instanceof Error
            ? courseOutcome.reason.message
            : 'Could not load courses.'
        setSectionsError(`${a} — ${b}`)
      } else if (termFailed) {
        setSectionsError(
          termOutcome.reason instanceof Error
            ? termOutcome.reason.message
            : 'Could not load academic terms.',
        )
      } else if (courseFailed) {
        setSectionsError(
          courseOutcome.reason instanceof Error
            ? courseOutcome.reason.message
            : 'Could not load courses.',
        )
      } else {
        setSectionsError(null)
      }

      const sp = new URLSearchParams(window.location.search)
      const urlTerm = sp.get('term')?.trim() ?? ''
      const urlCourse = sp.get('course')?.trim() ?? ''
      const urlQ = sp.get('q') ?? ''

      const nextTerm =
        activeTermId ||
        resolveTermId(urlTerm && t.some((x) => x.id === urlTerm) ? urlTerm : '')
      const nextCourse =
        urlCourse && c.some((x) => x.code === urlCourse)
          ? urlCourse
          : c.length > 0
            ? c[0].code
            : ''

      setAcademicTermId(nextTerm)
      setCourseCode(nextCourse)
      setCourseSearch(urlQ)

      setSearchParams(
        (prev) =>
          applyAdminSchedulingToSearchParams(prev, {
            term: nextTerm,
            course: nextCourse,
            q: urlQ,
          }),
        { replace: true },
      )
    })()
    return () => ac.abort()
  }, [setSearchParams, activeTermId, resolveTermId, portalTermLoading])

  useEffect(() => {
    if (portalTermLoading || terms == null || activeTermId === '') return
    if (activeTermId === academicTermId.trim()) return
    setAcademicTermId(activeTermId)
    setSearchParams(
      (prev) =>
        applyAdminSchedulingToSearchParams(prev, {
          term: activeTermId,
          course: courseCode,
          q: courseSearch,
        }),
      { replace: true },
    )
  }, [
    activeTermId,
    portalTermLoading,
    terms,
    academicTermId,
    courseCode,
    courseSearch,
    setSearchParams,
  ])

  useEffect(() => {
    const tid = academicTermId.trim()
    const code = courseCode.trim()
    if (tid === '' || code === '') {
      setSections([])
      setSectionsLoading(false)
      return
    }
    const ac = new AbortController()
    setSectionsLoading(true)
    setSectionsError(null)
    ;(async () => {
      try {
        const rows = await fetchAdminCourseSections({
          academicTermId: tid,
          courseCode: code,
          signal: ac.signal,
        })
        if (ac.signal.aborted) return
        setSections(rows)
      } catch (e) {
        if (ac.signal.aborted) return
        setSections(null)
        setSectionsError(
          e instanceof Error ? e.message : 'Could not load sections.',
        )
      } finally {
        if (!ac.signal.aborted) setSectionsLoading(false)
      }
    })()
    return () => ac.abort()
  }, [academicTermId, courseCode, listVersion])

  const enSectionRows = useMemo(
    () => (sections ?? []).filter((s) => s.schedule_track !== 'CN'),
    [sections],
  )
  const cnSectionRows = useMemo(
    () => (sections ?? []).filter((s) => s.schedule_track === 'CN'),
    [sections],
  )

  const sortedCourses = useMemo(() => {
    if (courses == null) return []
    return [...courses].sort((a, b) => a.code.localeCompare(b.code))
  }, [courses])

  const filteredCoursesForSelect = useMemo(() => {
    const q = courseSearch.trim().toLowerCase()
    if (q === '') return sortedCourses
    return sortedCourses.filter((c) => {
      if (c.code.toLowerCase().includes(q)) return true
      const eng = c.eng_name?.trim().toLowerCase() ?? ''
      if (eng.includes(q)) return true
      const chi = c.chi_name?.trim().toLowerCase() ?? ''
      return chi.includes(q)
    })
  }, [sortedCourses, courseSearch])

  const courseCatalogById = useMemo(() => {
    const m = new Map<string, CourseCatalogItem>()
    for (const row of sortedCourses) {
      const courseId = row.course_id?.trim()
      if (!courseId) continue
      m.set(courseId, row)
    }
    return m
  }, [sortedCourses])

  const selectedCourseCatalog = useMemo(
    () => sortedCourses.find((c) => c.code === courseCode) ?? null,
    [sortedCourses, courseCode],
  )

  const catalogTitleFields: CourseTitleFields = useMemo(() => {
    const code = courseCode.trim()
    return (
      selectedCourseCatalog ?? {
        code,
        eng_name: null,
        chi_name: null,
      }
    )
  }, [selectedCourseCatalog, courseCode])

  const metaLegacyTitleForCourse = useMemo((): string | null => {
    const code = courseCode.trim()
    if (code === '') return null
    if (resolvedCourseMeta?.courseCode !== code) return null
    const t = resolvedCourseMeta.legacyTitle?.trim() ?? ''
    return t !== '' ? t : null
  }, [resolvedCourseMeta, courseCode])

  const autoFormCourseTitle = useMemo(
    () =>
      getPreferredCourseTitle(
        catalogTitleFields,
        form.schedule_track,
        metaLegacyTitleForCourse,
      ),
    [catalogTitleFields, form.schedule_track, metaLegacyTitleForCourse],
  )

  useEffect(() => {
    if (courseTitleLocked) return
    setCourseTitleDraft(autoFormCourseTitle)
  }, [autoFormCourseTitle, courseTitleLocked])

  const resolveSectionRowTitle = useCallback(
    (row: AdminCourseSection) =>
      getPreferredCourseTitle(
        catalogTitleFields,
        row.schedule_track,
        row.course_title ?? metaLegacyTitleForCourse,
      ),
    [catalogTitleFields, metaLegacyTitleForCourse],
  )

  const resolvePrerequisiteCode = useCallback(
    (row: AdminCourseSection) => {
      if (row.prerequisite_course_id == null) return '—'
      return courseCatalogById.get(row.prerequisite_course_id)?.code ?? '—'
    },
    [courseCatalogById],
  )

  useEffect(() => {
    const code = courseCode.trim()
    if (code === '') {
      setResolvedCourseMeta(null)
      return
    }
    const ac = new AbortController()
    setResolvedCourseMeta((prev) => (prev?.courseCode === code ? prev : null))
    void (async () => {
      try {
        const meta = await fetchAdminCourseSectionCourseMeta(code, {
          signal: ac.signal,
        })
        if (ac.signal.aborted) return
        setResolvedCourseMeta({
          courseCode: code,
          legacyTitle: meta.title.trim() !== '' ? meta.title.trim() : null,
          instructorSuggestion: meta.instructorSuggestion,
        })
      } catch {
        if (!ac.signal.aborted) setResolvedCourseMeta(null)
      }
    })()
    return () => ac.abort()
  }, [courseCode])

  const autoInstructorForCreate = useMemo((): string | undefined => {
    if (editingId != null) return undefined
    const code = courseCode.trim()
    if (code === '' || resolvedCourseMeta == null) return ''
    if (resolvedCourseMeta.courseCode !== code) return ''
    return getPreferredInstructorDisplay(
      resolvedCourseMeta.instructorSuggestion,
      form.schedule_track,
    )
  }, [editingId, courseCode, resolvedCourseMeta, form.schedule_track])

  useEffect(() => {
    if (editingId != null) return
    if (instructorLocked) return
    if (autoInstructorForCreate === undefined) return
    setForm((f) => ({ ...f, instructor: autoInstructorForCreate }))
  }, [editingId, instructorLocked, autoInstructorForCreate])

  const courseSelectOptions = useMemo(() => {
    const selected = sortedCourses.find((c) => c.code === courseCode)
    if (!selected) return filteredCoursesForSelect
    const inFiltered = filteredCoursesForSelect.some(
      (c) => c.code === courseCode,
    )
    if (inFiltered) return filteredCoursesForSelect
    return [selected, ...filteredCoursesForSelect]
  }, [sortedCourses, filteredCoursesForSelect, courseCode])

  const fullCatalogPrerequisiteOptions = useMemo(
    () => sortedCourses,
    [sortedCourses],
  )

  const beginEdit = useCallback((row: AdminCourseSection) => {
    setEditingId(row.id)
    setCourseTitleLocked(false)
    setInstructorLocked(false)
    const parsed = parseStoredWeekdaysToFullNames(row.weekday)
    setForm({
      section_code: row.section_code,
      schedule_track: row.schedule_track === 'CN' ? 'CN' : 'EN',
      prerequisite_course_id: row.prerequisite_course_id ?? '',
      weekdays: parsed.length > 0 ? parsed : ['Monday'],
      start_time: timeToInputValue(row.start_time),
      end_time: timeToInputValue(row.end_time),
      delivery_mode:
        canonicalDeliveryMode(row.delivery_mode) ??
        (row.delivery_mode ?? '').trim(),
      room: row.room ?? '',
      instructor: row.instructor ?? '',
      notes: row.notes ?? '',
    })
    setFormMessage(null)
    setShowSectionForm(true)
  }, [])

  const openCreateForm = useCallback(() => {
    setForm(emptyForm())
    setEditingId(null)
    setFormMessage(null)
    setCourseTitleLocked(false)
    setInstructorLocked(false)
    setShowSectionForm(true)
  }, [])

  const closeSectionForm = useCallback(() => {
    if (busy) return
    resetForm()
  }, [busy, resetForm])

  /** Browser back/forward and in-app links: keep selects aligned with URL (term/course/q are source of truth). */
  useEffect(() => {
    if (terms == null || courses == null) return
    const t = searchParams.get('term')?.trim() ?? ''
    const c = searchParams.get('course')?.trim() ?? ''
    const q = searchParams.get('q') ?? ''
    const termOk = t && terms.some((x) => x.id === t) ? t : null
    const courseOk = c && courses.some((x) => x.code === c) ? c : null

    const termChanged = termOk != null && termOk !== academicTermId.trim()
    const courseChanged = courseOk != null && courseOk !== courseCode.trim()

    if (termChanged) {
      setAcademicTermId(termOk)
      setActiveTermId(termOk)
    }
    if (courseChanged) {
      setCourseCode(courseOk)
    }
    if (q !== courseSearch) {
      setCourseSearch(q)
    }
    if (termChanged || courseChanged) {
      if (termChanged || editingId != null) {
        resetForm()
      } else {
        resetFormKeepingScheduleTrack()
      }
    }
  }, [
    searchParams,
    terms,
    courses,
    academicTermId,
    courseCode,
    courseSearch,
    editingId,
    resetForm,
    resetFormKeepingScheduleTrack,
  ])

  /**
   * Deep link: ?edit= — open editor once sections are loaded. Only removes `edit`; keeps term/course in the URL.
   */
  useEffect(() => {
    if (terms == null || courses == null) return
    const editRaw = searchParams.get('edit')?.trim() ?? ''
    if (editRaw === '') return

    const stripEditOnly = () => {
      setSearchParams(
        (p) => {
          const n = new URLSearchParams(p)
          n.delete('edit')
          return n
        },
        { replace: true },
      )
    }

    const id = Number(editRaw)
    if (!Number.isInteger(id) || id <= 0) {
      stripEditOnly()
      return
    }
    const t = searchParams.get('term')?.trim() ?? ''
    const c = searchParams.get('course')?.trim() ?? ''
    if (t !== '' && academicTermId.trim() !== t) return
    if (c !== '' && courseCode.trim() !== c) return
    if (sectionsLoading || sections == null) return

    const row =
      c !== ''
        ? sections.find((s) => s.id === id && s.course_code === c)
        : sections.find((s) => s.id === id)
    if (row == null) {
      stripEditOnly()
      return
    }
    beginEdit(row)
    stripEditOnly()
  }, [
    terms,
    courses,
    academicTermId,
    courseCode,
    sections,
    sectionsLoading,
    searchParams,
    setSearchParams,
    beginEdit,
  ])

  function pushSchedulingContext(
    next: { term: string; course: string; q: string },
    options?: { clearEdit?: boolean },
  ) {
    setSearchParams(
      (prev) =>
        applyAdminSchedulingToSearchParams(prev, next, {
          clearEdit: options?.clearEdit ?? true,
        }),
      { replace: true },
    )
  }

  const weekdayStorage = (): string | null => {
    const s = selectedWeekdaysToStorage(form.weekdays)
    return s === '' ? null : s
  }

  const onCreate = async () => {
    const tid = academicTermId.trim()
    const code = courseCode.trim()
    if (tid === '' || code === '') {
      setFormMessage('Select an academic term and a course first.')
      return
    }
    if (form.section_code.trim() === '') {
      setFormMessage('Section code is required.')
      return
    }
    const wd = weekdayStorage()
    if (wd == null) {
      setFormMessage('Select at least one weekday.')
      return
    }
    setBusy(true)
    setFormMessage(null)
    try {
      await createAdminCourseSection({
        academic_term_id: tid,
        course_code: code,
        prerequisite_course_id: form.prerequisite_course_id.trim() || null,
        section_code: form.section_code.trim(),
        schedule_track: form.schedule_track,
        weekday: wd,
        start_time: inputTimeToApi(form.start_time),
        end_time: inputTimeToApi(form.end_time),
        delivery_mode: form.delivery_mode.trim() || null,
        room: form.room.trim() || null,
        instructor: form.instructor.trim() || null,
        notes: form.notes.trim() || null,
      })
      setForm(emptyForm())
      setCourseTitleLocked(false)
      setInstructorLocked(false)
      setSectionsError(null)
      setListVersion((v) => v + 1)
      setShowSectionForm(false)
    } catch (e) {
      setFormMessage(
        e instanceof Error ? e.message : 'Create failed.',
      )
    } finally {
      setBusy(false)
    }
  }

  const onUpdate = async () => {
    if (editingId == null) return
    const tid = academicTermId.trim()
    if (tid === '') {
      setFormMessage('Select an academic term.')
      return
    }
    const wd = weekdayStorage()
    if (wd == null) {
      setFormMessage('Select at least one weekday.')
      return
    }
    setBusy(true)
    setFormMessage(null)
    try {
      await updateAdminCourseSection(editingId, {
        academic_term_id: tid,
        course_code: courseCode.trim(),
        prerequisite_course_id: form.prerequisite_course_id.trim() || null,
        section_code: form.section_code.trim(),
        schedule_track: form.schedule_track,
        weekday: wd,
        start_time: inputTimeToApi(form.start_time),
        end_time: inputTimeToApi(form.end_time),
        delivery_mode: form.delivery_mode.trim() || null,
        room: form.room.trim() || null,
        instructor: form.instructor.trim() || null,
        notes: form.notes.trim() || null,
      })
      resetForm()
      setSectionsError(null)
      setListVersion((v) => v + 1)
    } catch (e) {
      setFormMessage(
        e instanceof Error ? e.message : 'Update failed.',
      )
    } finally {
      setBusy(false)
    }
  }

  const onDelete = async () => {
    if (editingId == null) return
    if (!window.confirm('Delete this section? This cannot be undone.')) return
    setBusy(true)
    setFormMessage(null)
    try {
      await deleteAdminCourseSection(editingId)
      resetForm()
      setSectionsError(null)
      setListVersion((v) => v + 1)
    } catch (e) {
      setFormMessage(
        e instanceof Error ? e.message : 'Delete failed.',
      )
    } finally {
      setBusy(false)
    }
  }

  const openRosterForSection = useCallback(
    (row: AdminCourseSection) => {
      const tid = academicTermId.trim()
      const code = courseCode.trim()
      if (tid === '' || code === '') return
      const p = new URLSearchParams()
      p.set('term', tid)
      p.set('course', code)
      const q = courseSearch.trim()
      if (q !== '') p.set('q', q)
      p.set('section', row.section_code)
      p.set('track', row.schedule_track)
      p.set('sectionId', String(row.id))
      navigate(`/admin/course-sections/roster?${p.toString()}`)
    },
    [academicTermId, courseCode, courseSearch, navigate],
  )

  const onExportCsvForSection = useCallback(
    (row: AdminCourseSection) => {
      setCsvExportError(null)
      setCsvExportSectionId(row.id)
      void (async () => {
        try {
          await downloadAdminRegisteredStudentsCsv(row.id)
        } catch (e) {
          setCsvExportError(
            e instanceof Error ? e.message : 'CSV export failed.',
          )
        } finally {
          setCsvExportSectionId(null)
        }
      })()
    },
    [],
  )

  const onDeleteRow = async (row: AdminCourseSection) => {
    if (!window.confirm(`Delete section ${row.section_code}?`)) return
    setBusy(true)
    setSectionsError(null)
    try {
      await deleteAdminCourseSection(row.id)
      if (editingId === row.id) resetForm()
      setSectionsError(null)
      setListVersion((v) => v + 1)
    } catch (e) {
      setSectionsError(
        e instanceof Error ? e.message : 'Delete failed.',
      )
    } finally {
      setBusy(false)
    }
  }

  const selectedTermLabel = useMemo(() => {
    const term = terms?.find((t) => t.id === academicTermId.trim())
    return term?.term_label ?? academicTermId
  }, [terms, academicTermId])

  const totalSections = sections?.length ?? 0

  return (
    <main className="admin-page admin-course-sections-page">
      <div className="admin-course-sections-page__header">
        <div className="admin-course-sections-page__heading">
          <h1 className="admin-page__title admin-page__title--inline">
            Course Sections
          </h1>
          <p className="admin-course-sections-page__lede">
            Manage class sections for each term and course. Use the timetable view
            to see the full weekly schedule.
            {!sectionsLoading && sections != null ? (
              <span className="admin-course-sections-page__count">
                {' '}
                {totalSections} {totalSections === 1 ? 'section' : 'sections'}
              </span>
            ) : null}
          </p>
        </div>
        <div className="admin-course-sections-page__header-actions">
          <Link
            to={{
              pathname: '/admin/course-sections/timetable',
              search: (() => {
                const qs = adminSchedulingQueryString({
                  term: academicTermId,
                  course: courseCode,
                  q: courseSearch,
                })
                return qs ? `?${qs}` : ''
              })(),
            }}
            className="admin-course-sections-page__timetable-link"
          >
            View timetable
          </Link>
          <button
            type="button"
            className="admin-academic-terms-page__add-btn"
            disabled={
              sectionsLoading ||
              academicTermId.trim() === '' ||
              courseCode.trim() === ''
            }
            onClick={openCreateForm}
          >
            <span className="admin-academic-terms-page__add-icon" aria-hidden="true">
              +
            </span>
            Add section
          </button>
        </div>
      </div>

      <section className="admin-course-sections-filters portal-card" aria-label="Filters">
        <div className="admin-course-sections-filters__row">
          <label className="admin-course-sections-filters__field">
            <span className="admin-course-sections-filters__label">Academic term</span>
            <select
              className="admin-input admin-course-sections-filters__input"
              value={academicTermId}
              onChange={(e) => {
                const v = e.target.value
                setAcademicTermId(v)
                setActiveTermId(v)
                pushSchedulingContext({
                  term: v,
                  course: courseCode,
                  q: courseSearch,
                })
                resetForm()
              }}
              disabled={terms == null || terms.length === 0}
            >
              {terms == null ? (
                <option value="">Loading…</option>
              ) : (
                terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.term_label}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="admin-course-sections-filters__field admin-course-sections-filters__field--course">
            <span className="admin-course-sections-filters__label">Course</span>
            <select
              className="admin-input admin-course-sections-filters__input"
              value={courseCode}
              onChange={(e) => {
                const v = e.target.value
                setCourseCode(v)
                pushSchedulingContext({
                  term: academicTermId,
                  course: v,
                  q: courseSearch,
                })
                if (editingId != null) {
                  resetForm()
                } else {
                  resetFormKeepingScheduleTrack()
                }
              }}
              disabled={sortedCourses.length === 0}
            >
              {courseSelectOptions.length === 0 ? (
                <option value="">No matches</option>
              ) : (
                courseSelectOptions.map((c) => (
                  <option key={c.code} value={c.code}>
                    {formatCourseCatalogSelectLabel(c)}
                  </option>
                ))
              )}
            </select>
          </label>
          <div className="admin-course-sections-filters__credits">
            <span className="admin-course-sections-filters__label">Credits</span>
            <span className="admin-course-sections-filters__credits-value">
              {formatCatalogCredits(selectedCourseCatalog?.units)}
            </span>
          </div>
        </div>
        <label className="admin-course-sections-filters__field admin-course-sections-filters__field--search">
          <span className="admin-course-sections-filters__label">Search courses</span>
          <input
            type="search"
            className="admin-input admin-input--search admin-course-sections-filters__input"
            value={courseSearch}
            onChange={(e) => {
              const v = e.target.value
              setCourseSearch(v)
              pushSchedulingContext(
                {
                  term: academicTermId,
                  course: courseCode,
                  q: v,
                },
                { clearEdit: false },
              )
            }}
            placeholder="Filter by code or title…"
            disabled={sortedCourses.length === 0}
          />
        </label>
        {selectedCourseCatalog ? (
          <p className="admin-course-sections-filters__context">
            Showing sections for{' '}
            <strong>{selectedCourseCatalog.code}</strong> in{' '}
            <strong>{selectedTermLabel}</strong>
          </p>
        ) : null}
      </section>

      {showSectionForm ? (
        <SectionFormPanel
          open={showSectionForm}
          editingId={editingId}
          busy={busy}
          form={form}
          formMessage={formMessage}
          courseTitleDraft={courseTitleDraft}
          courseCode={courseCode}
          academicTermId={academicTermId}
          selectedTermLabel={selectedTermLabel}
          fullCatalogPrerequisiteOptions={fullCatalogPrerequisiteOptions}
          courseCatalogById={courseCatalogById}
          onClose={closeSectionForm}
          onSubmitCreate={onCreate}
          onSubmitUpdate={onUpdate}
          onDelete={onDelete}
          setForm={setForm}
          setCourseTitleDraft={setCourseTitleDraft}
          setCourseTitleLocked={setCourseTitleLocked}
          setInstructorLocked={setInstructorLocked}
        />
      ) : null}

      {sectionsError != null ? (
        <p className="admin-course-sections-page__alert" role="alert">
          {sectionsError}
        </p>
      ) : null}

      {csvExportError != null ? (
        <p className="admin-course-sections-page__alert" role="alert">
          {csvExportError}
        </p>
      ) : null}

      {sectionsLoading ? (
        <section className="portal-card portal-profile-state" aria-busy="true">
          <p className="portal-profile-state__title">Loading sections</p>
          <p className="portal-profile-state__detail">
            Fetching sections for the selected term and course.
          </p>
        </section>
      ) : null}

      {!sectionsLoading && sections != null && sections.length === 0 ? (
        <section className="admin-course-sections-empty portal-card">
          <p className="admin-course-sections-empty__title">No sections yet</p>
          <p className="admin-course-sections-empty__detail">
            Add a section to schedule this course for {selectedTermLabel}.
          </p>
          <button
            type="button"
            className="admin-academic-terms-page__add-btn"
            disabled={academicTermId.trim() === '' || courseCode.trim() === ''}
            onClick={openCreateForm}
          >
            <span className="admin-academic-terms-page__add-icon" aria-hidden="true">
              +
            </span>
            Add section
          </button>
        </section>
      ) : null}

      {!sectionsLoading && sections != null && sections.length > 0 ? (
        <div className="admin-course-sections-list">
          <SectionGroup
            ariaLabelledBy="admin-course-sections-en-heading"
            title="English timetable"
            rows={enSectionRows}
            emptyMessage="No English sections for this course."
            resolveRowTitle={resolveSectionRowTitle}
            resolvePrerequisiteCode={resolvePrerequisiteCode}
            busy={busy}
            csvExportSectionId={csvExportSectionId}
            onEdit={beginEdit}
            onViewRoster={openRosterForSection}
            onExportCsv={onExportCsvForSection}
            onDeleteRow={onDeleteRow}
          />
          <SectionGroup
            ariaLabelledBy="admin-course-sections-cn-heading"
            title="Chinese timetable"
            rows={cnSectionRows}
            emptyMessage="No Chinese sections for this course."
            resolveRowTitle={resolveSectionRowTitle}
            resolvePrerequisiteCode={resolvePrerequisiteCode}
            busy={busy}
            csvExportSectionId={csvExportSectionId}
            onEdit={beginEdit}
            onViewRoster={openRosterForSection}
            onExportCsv={onExportCsvForSection}
            onDeleteRow={onDeleteRow}
          />
        </div>
      ) : null}
    </main>
  )
}
