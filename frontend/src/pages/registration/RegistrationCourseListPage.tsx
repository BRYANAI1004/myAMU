import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudentPortalT } from '@/LanguageContext'
import { useCourseBin } from './CourseBinContext'
import { RegistrationCourseListPanel } from './RegistrationCourseListPanel'
import { navigateToRegistrationBin } from './registrationBinNavigation'
import { useRegistrationOfferings } from './useRegistrationOfferings'

export function RegistrationCourseListPage() {
  const t = useStudentPortalT()
  const navigate = useNavigate()
  const { items: binItems, addToCourseBin } = useCourseBin()
  const {
    registrationTermId,
    termMissing,
    catalogByCode,
    sectionsByCourseCode,
    offeredCourses,
    enrolledKeys,
    loading,
    error,
  } = useRegistrationOfferings()
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast(message)
    toastTimerRef.current = setTimeout(() => {
      setToast(null)
      toastTimerRef.current = null
    }, 2800)
  }, [])

  const afterAddToCourseBin = useCallback(() => {
    showToast(t('registrationAddedToBinToast'))
    navigateToRegistrationBin(navigate, registrationTermId)
  }, [navigate, registrationTermId, showToast, t])

  return (
    <main
      className="portal-page portal-registration-course-list-page"
      data-registration-term={registrationTermId ?? undefined}
    >
      {toast != null ? (
        <div className="portal-offered-timetable__toast" role="status" aria-live="polite">
          {toast}
        </div>
      ) : null}

      <section className="portal-card portal-stack" aria-labelledby="registration-course-list-heading">
        <h2 id="registration-course-list-heading" className="portal-section-heading">
          {t('registrationTabCourseList')}
        </h2>

        {termMissing ? (
          <p className="portal-text-muted" role="status">
            {t('selectAcademicTermInRegistrationBar')}
          </p>
        ) : null}

        {!termMissing && loading ? (
          <p className="portal-text-muted" role="status">
            {t('loading')}
          </p>
        ) : null}

        {!termMissing && !loading && error != null ? (
          <p className="portal-login-error" role="alert">
            {error}
          </p>
        ) : null}

        {!termMissing && !loading && error == null ? (
          <RegistrationCourseListPanel
            courses={offeredCourses}
            sectionsByCourseCode={sectionsByCourseCode}
            catalogByCode={catalogByCode}
            binItems={binItems}
            enrolledKeys={enrolledKeys}
            addToCourseBin={addToCourseBin}
            afterAddToCourseBin={afterAddToCourseBin}
          />
        ) : null}
      </section>
    </main>
  )
}
