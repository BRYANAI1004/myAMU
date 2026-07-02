import { useEffect, useMemo } from 'react'
import { Outlet, useSearchParams } from 'react-router-dom'
import { useStudentPortalT } from '@/LanguageContext'
import { BackToDashboardLink } from '../../components/BackToDashboardLink'
import { CourseBinProvider } from './CourseBinContext'
import { RegistrationNav } from './RegistrationNav'
import { RegistrationWindowBanner } from './RegistrationWindowBanner'
import { RegistrationWindowProvider } from './RegistrationWindowContext'
import { useAccount } from '../../context/AccountContext'
import { useStudentPortalTerm } from '../../context/StudentPortalTermContext'
import { readRegistrationTermIdFromSearch } from './registrationTermSearch'

function registrationTermDisplayLabel(
  term: { term_label?: string | null; term_name: string; year: number } | null,
): string {
  if (term == null) return ''
  const label = term.term_label?.trim() ?? ''
  if (label !== '') return label
  return `${term.term_name} ${term.year}`.trim()
}

export function RegistrationLayout() {
  const t = useStudentPortalT()
  const { currentStudentId } = useAccount()
  const { portalDefaultTerm, defaultTermId, loading: portalTermLoading } =
    useStudentPortalTerm()
  const [searchParams, setSearchParams] = useSearchParams()

  const selectedTermId = defaultTermId.trim()
  const termDisplay = useMemo(
    () => registrationTermDisplayLabel(portalDefaultTerm),
    [portalDefaultTerm],
  )

  const loadState = portalTermLoading
    ? 'loading'
    : selectedTermId !== ''
      ? 'ready'
      : 'error'

  useEffect(() => {
    if (portalTermLoading) return

    if (selectedTermId === '') {
      if (searchParams.has('term') || searchParams.has('section')) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev)
            next.delete('term')
            next.delete('section')
            return next
          },
          { replace: true },
        )
      }
      return
    }

    const urlTrim = readRegistrationTermIdFromSearch(searchParams)?.trim() ?? ''
    const needsTermSync = urlTrim !== selectedTermId
    const needsSectionCleanup = searchParams.has('section')
    if (!needsTermSync && !needsSectionCleanup) return

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('term', selectedTermId)
        next.delete('section')
        return next
      },
      { replace: true },
    )
  }, [portalTermLoading, selectedTermId, searchParams, setSearchParams])

  const termLinkSearch =
    selectedTermId !== '' ? `?term=${encodeURIComponent(selectedTermId)}` : ''

  const courseBinKey = selectedTermId !== '' ? selectedTermId : 'none'
  const courseBinStudentKey = currentStudentId?.trim() ?? ''

  return (
    <RegistrationWindowProvider registrationTermId={selectedTermId}>
      <CourseBinProvider
        key={`${courseBinKey}:${courseBinStudentKey}`}
        registrationTermId={selectedTermId}
        studentId={courseBinStudentKey}
      >
        <div className="portal-registration-module">
          <header className="portal-module-header portal-module-header--registration">
            <BackToDashboardLink />
            <div className="portal-module-header__title-row">
              <h1 className="portal-page-title">{t('registrationModule')}</h1>
              <div
                className="portal-registration-layout-term portal-registration-layout-term--inline"
                aria-labelledby="registration-layout-term-label"
              >
                {loadState === 'loading' ? (
                  <p
                    className="portal-text-muted portal-registration-layout-term__status"
                    role="status"
                  >
                    {t('loadingTerms')}
                  </p>
                ) : null}
                {loadState === 'error' ? (
                  <p
                    className="portal-text-muted portal-registration-layout-term__status"
                    role="alert"
                  >
                    {t('noAcademicTermsAvailable')}
                  </p>
                ) : null}
                {loadState === 'ready' ? (
                  <>
                    <span
                      id="registration-layout-term-label"
                      className="portal-registration-layout-term__title"
                    >
                      {t('registrationCurrentTermLabel')}
                    </span>
                    <span
                      id="registration-layout-term-value"
                      className="portal-registration-layout-term__value"
                    >
                      {termDisplay}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </header>

          <RegistrationNav termLinkSearch={termLinkSearch} />
          <RegistrationWindowBanner />
          <div className="portal-registration-outlet">
            <Outlet />
          </div>
        </div>
      </CourseBinProvider>
    </RegistrationWindowProvider>
  )
}
