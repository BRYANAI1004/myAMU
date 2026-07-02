import { useMemo } from 'react'
import { Outlet } from 'react-router-dom'
import { useStudentPortalT } from '@/LanguageContext'
import { BackToDashboardLink } from '../../components/BackToDashboardLink'
import { useStudentPortalTerm } from '../../context/StudentPortalTermContext'

function myCoursesTermDisplayLabel(
  term: { term_label?: string | null; term_name: string; year: number } | null,
): string {
  if (term == null) return ''
  const label = term.term_label?.trim() ?? ''
  if (label !== '') return label
  return `${term.term_name} ${term.year}`.trim()
}

export function MyCoursesLayout() {
  const t = useStudentPortalT()
  const { portalDefaultTerm, defaultTermId, loading: portalTermLoading } =
    useStudentPortalTerm()

  const termDisplay = useMemo(
    () => myCoursesTermDisplayLabel(portalDefaultTerm),
    [portalDefaultTerm],
  )

  const loadState = portalTermLoading
    ? 'loading'
    : defaultTermId.trim() !== ''
      ? 'ready'
      : 'error'

  return (
    <div className="portal-my-courses-module">
      <header className="portal-module-header portal-module-header--my-courses">
        <BackToDashboardLink />
        <div className="portal-module-header__title-row">
          <h1 className="portal-page-title">{t('myCoursesModule')}</h1>
          <div
            className="portal-registration-layout-term portal-registration-layout-term--inline portal-my-courses-module__current-term"
            aria-labelledby="my-courses-current-term-label"
          >
            {loadState === 'loading' ? (
              <p className="portal-text-muted portal-registration-layout-term__status" role="status">
                {t('loadingTerms')}
              </p>
            ) : null}
            {loadState === 'error' ? (
              <p className="portal-text-muted portal-registration-layout-term__status" role="alert">
                {t('noAcademicTermsAvailable')}
              </p>
            ) : null}
            {loadState === 'ready' ? (
              <>
                <span
                  id="my-courses-current-term-label"
                  className="portal-registration-layout-term__title"
                >
                  {t('registrationCurrentTermLabel')}
                </span>
                <span className="portal-registration-layout-term__value">{termDisplay}</span>
              </>
            ) : null}
          </div>
        </div>
      </header>
      <div className="portal-my-courses-outlet">
        <Outlet />
      </div>
    </div>
  )
}
