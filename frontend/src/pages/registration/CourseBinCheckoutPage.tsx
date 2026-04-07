import { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAccount } from '../../context/AccountContext'
import { postStudentEnroll } from '../../lib/api'
import { useCourseBin } from './CourseBinContext'
import { useRegistrationTermSearchParam } from './registrationTermSearch'

export function CourseBinCheckoutPage() {
  const registrationTermId = useRegistrationTermSearchParam()
  const { currentStudentId, isAuthenticated } = useAccount()
  const { items, clearCourseBin } = useCourseBin()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const termMissing =
    registrationTermId == null || registrationTermId.trim() === ''

  const onRegister = useCallback(async () => {
    setError(null)
    setSuccess(null)
    if (termMissing || !currentStudentId) {
      setError(
        termMissing
          ? 'Select an academic term before registering.'
          : 'You must be signed in to register.',
      )
      return
    }
    const sections = items.map((i) => {
      const schedule_track: 'EN' | 'CN' =
        i.schedule_track === 'CN' ? 'CN' : 'EN'
      return {
        course_code: i.course_code.trim(),
        section_code: i.section.trim(),
        schedule_track,
      }
    })
      .filter(
        (s) =>
          s.course_code !== '' &&
          s.section_code !== '' &&
          s.section_code !== '—',
      )
    if (sections.length === 0) {
      setError('Add at least one section with a valid section code to your CourseBin.')
      return
    }
    setBusy(true)
    try {
      const res = await postStudentEnroll({
        studentId: currentStudentId,
        academic_term_id: registrationTermId.trim(),
        sections,
      })
      clearCourseBin()
      const msg =
        res.insertedCount === 0
          ? 'You were already enrolled in the selected course(s) for this term. Your CourseBin has been cleared.'
          : `Registration saved (${res.insertedCount} course(s) added). Your CourseBin has been cleared.`
      setSuccess(msg)
      window.setTimeout(() => {
        navigate({
          pathname: '/registration/schedule',
          search: registrationTermId
            ? `?term=${encodeURIComponent(registrationTermId.trim())}`
            : '',
        })
      }, 1800)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed.')
    } finally {
      setBusy(false)
    }
  }, [
    clearCourseBin,
    currentStudentId,
    items,
    navigate,
    registrationTermId,
    termMissing,
  ])

  return (
    <main
      className="portal-page"
      data-registration-term={registrationTermId ?? undefined}
    >
      <section className="portal-card portal-stack" aria-labelledby="course-bin-checkout-heading">
        <h2 id="course-bin-checkout-heading" className="portal-section-heading">
          Register
        </h2>
        <p className="portal-page-lede">
          Confirm sections from your CourseBin and save them to your schedule for this term. This
          writes to your official enrollment record for billing and registration.
        </p>

        {termMissing && (
          <p className="portal-text-muted" role="status">
            Select an academic term in the registration bar above.
          </p>
        )}

        {!isAuthenticated && (
          <p className="portal-text-muted" role="status">
            <Link to="/login">Sign in</Link> to register for classes.
          </p>
        )}

        {error != null && (
          <p className="portal-login-error" role="alert" style={{ margin: '0 0 0.75rem' }}>
            {error}
          </p>
        )}
        {success != null && (
          <p className="portal-text-muted" role="status" style={{ margin: '0 0 0.75rem' }}>
            {success}
          </p>
        )}

        <p className="portal-text-muted" style={{ marginTop: 0 }}>
          Sections in CourseBin: <strong>{items.length}</strong>
        </p>

        <div
          className="portal-course-bin-card-header-actions"
          style={{ marginTop: '0.5rem' }}
        >
          <button
            type="button"
            className="portal-btn portal-btn--primary"
            disabled={
              busy ||
              termMissing ||
              !isAuthenticated ||
              !currentStudentId ||
              items.length === 0
            }
            onClick={() => void onRegister()}
          >
            {busy ? 'Registering…' : 'Register'}
          </button>
          <Link
            to={{
              pathname: '/registration/course-bin',
              search: registrationTermId
                ? `?term=${encodeURIComponent(registrationTermId.trim())}`
                : '',
            }}
            className="portal-btn portal-btn--secondary"
          >
            Back to CourseBin
          </Link>
        </div>
      </section>
    </main>
  )
}
