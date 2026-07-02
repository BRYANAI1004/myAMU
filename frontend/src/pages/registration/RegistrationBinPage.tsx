import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStudentPortalT } from '@/LanguageContext'
import { useAccount } from '../../context/AccountContext'
import { PORTAL_STUDENT_ENROLLMENT_CHANGED } from '../../lib/portalStudentEnrollmentEvents'
import { ClassPlanPanel } from './ClassPlanPanel'
import { useCourseBin } from './CourseBinContext'
import { registerFromCourseBinItems } from './registerFromCourseBinItems'
import { useRegistrationTermSearchParam } from './registrationTermSearch'
import { useRegistrationOfferings } from './useRegistrationOfferings'
import { useRegistrationWindow } from './RegistrationWindowContext'

export function RegistrationBinPage() {
  const t = useStudentPortalT()
  const registrationTermId = useRegistrationTermSearchParam()
  const { currentStudentId, isAuthenticated, reload: reloadStudentAccount } = useAccount()
  const { items, clearCourseBin, removeFromCourseBin } = useCourseBin()
  const { enrolledKeys } = useRegistrationOfferings()
  const { isOpen: registrationWindowOpen } = useRegistrationWindow()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const termMissing = registrationTermId == null || registrationTermId.trim() === ''

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2800)
  }, [])

  const onCheckout = useCallback(async () => {
    setError(null)
    setSuccess(null)
    if (termMissing || !currentStudentId) {
      setError(termMissing ? t('checkoutErrorSelectTerm') : t('checkoutErrorSignIn'))
      return
    }
    if (!registrationWindowOpen) {
      setError(t('registrationWindowClosedCheckout'))
      return
    }

    setBusy(true)
    try {
      const res = await registerFromCourseBinItems({
        studentId: currentStudentId,
        academicTermId: registrationTermId.trim(),
        items,
        t,
      })
      if (!res.ok) {
        setError(res.message)
        return
      }
      const msg =
        res.insertedCount === 0
          ? t('checkoutSuccessAlreadyEnrolled')
          : t('registrationCheckoutSuccess').replace('{n}', String(res.insertedCount))
      setSuccess(msg)
      await clearCourseBin()
      reloadStudentAccount()
      window.dispatchEvent(new Event(PORTAL_STUDENT_ENROLLMENT_CHANGED))
    } finally {
      setBusy(false)
    }
  }, [
    clearCourseBin,
    currentStudentId,
    items,
    registrationTermId,
    registrationWindowOpen,
    reloadStudentAccount,
    termMissing,
    t,
  ])

  return (
    <main
      className="portal-page portal-registration-bin-page"
      data-registration-term={registrationTermId ?? undefined}
    >
      {toast != null ? (
        <div className="portal-offered-timetable__toast" role="status" aria-live="polite">
          {toast}
        </div>
      ) : null}

      <section className="portal-card portal-stack" aria-labelledby="registration-bin-heading">
        <h2 id="registration-bin-heading" className="portal-section-heading">
          {t('registrationTabBin')}
        </h2>
        <p className="portal-page-lede">{t('registrationBinLede')}</p>

        {termMissing ? (
          <p className="portal-text-muted" role="status">
            {t('selectAcademicTermInRegistrationBar')}
          </p>
        ) : null}

        {!isAuthenticated ? (
          <p className="portal-text-muted" role="status">
            <Link to="/login">{t('signIn')}</Link> {t('checkoutRegisterAfterSignIn')}
          </p>
        ) : null}

        {error != null ? (
          <p className="portal-login-error" role="alert" style={{ whiteSpace: 'pre-line' }}>
            {error}
          </p>
        ) : null}

        {success != null ? (
          <p className="portal-text-muted" role="status">
            {success}
          </p>
        ) : null}

        <ClassPlanPanel
          items={items}
          enrolledKeys={enrolledKeys}
          removeFromCourseBin={removeFromCourseBin}
          showToast={showToast}
          checkoutMode
        />

        {items.length > 0 ? (
          <div className="portal-registration-bin-checkout">
            <p className="portal-text-muted">
              {t('courseBinSectionsCount')} <strong>{items.length}</strong>
            </p>
            <div className="portal-course-bin-card-header-actions">
              <button
                type="button"
                className="portal-btn portal-btn--primary"
                disabled={
                  busy ||
                  termMissing ||
                  !isAuthenticated ||
                  !currentStudentId ||
                  items.length === 0 ||
                  !registrationWindowOpen
                }
                onClick={() => void onCheckout()}
              >
                {busy ? t('registeringEllipsis') : t('registrationCheckoutButton')}
              </button>
            </div>
            <p className="portal-text-muted portal-registration-bin-checkout__note">
              {t('registrationBinCheckoutNote')}
            </p>
          </div>
        ) : null}
      </section>
    </main>
  )
}

/** @deprecated Use RegistrationBinPage */
export const CourseBinCheckoutPage = RegistrationBinPage
