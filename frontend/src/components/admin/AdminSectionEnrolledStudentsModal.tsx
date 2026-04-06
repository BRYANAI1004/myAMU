import { useState } from 'react'
import { deleteAdminPortalEnrollment, type AdminCourseSection } from '../../lib/api'

type EnrolledStudent = NonNullable<AdminCourseSection['enrolled_students']>[number]

type Props = {
  section: AdminCourseSection
  academicTermId: string
  /** Called after a successful removal so the parent can refresh section data. */
  onEnrollmentRemoved: () => void
  onClose: () => void
}

/**
 * Lists students enrolled via `portal_enrollments` for this course + term.
 * Enrollment is course-level (not tied to `section_code`); the same list appears on every section row for the course.
 */
export function AdminSectionEnrolledStudentsModal({
  section,
  academicTermId,
  onEnrollmentRemoved,
  onClose,
}: Props) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const students: EnrolledStudent[] = section.enrolled_students ?? []

  const onRemove = async (student_external_id: string) => {
    setError(null)
    setBusyId(student_external_id)
    try {
      const res = await deleteAdminPortalEnrollment({
        studentId: student_external_id,
        academic_term_id: academicTermId.trim(),
        course_code: section.course_code.trim(),
      })
      if (res.removedCount < 1) {
        setError('No enrollment row was removed (already removed or not found).')
        return
      }
      onEnrollmentRemoved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Remove failed.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div
      className="admin-section-detail-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="admin-section-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-enrolled-students-title"
      >
        <h2
          id="admin-enrolled-students-title"
          className="admin-section-detail-modal__title"
        >
          Enrolled students · {section.course_code}
        </h2>
        <p className="portal-text-muted admin-form-hint" style={{ marginTop: 0 }}>
          Registrations are stored per course and term in{' '}
          <code className="admin-code">portal_enrollments</code>, not per section. Removing a student
          drops their course enrollment for this term; counts on all sections for this course will
          update together.
        </p>
        {error != null && (
          <p className="admin-form-message" role="alert">
            {error}
          </p>
        )}
        {students.length === 0 ? (
          <p className="portal-text-muted">No students listed for this course in this term.</p>
        ) : (
          <div className="portal-table-wrap admin-table-wrap" style={{ marginTop: '0.75rem' }}>
            <table className="portal-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Student ID</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.student_external_id}>
                    <td>{s.full_name?.trim() ? s.full_name.trim() : '—'}</td>
                    <td>
                      <code className="admin-code">{s.student_external_id}</code>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="portal-btn portal-btn--secondary portal-btn--compact"
                        disabled={busyId != null}
                        onClick={() => void onRemove(s.student_external_id)}
                      >
                        {busyId === s.student_external_id ? 'Removing…' : 'Remove registration'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="admin-section-detail-modal__actions">
          <button
            type="button"
            className="portal-btn portal-btn--primary portal-btn--compact"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
