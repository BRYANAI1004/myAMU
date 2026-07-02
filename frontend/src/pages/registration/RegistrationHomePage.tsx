import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { useStudentPortalT } from '@/LanguageContext'
import { useStudentPortalTerm } from '../../context/StudentPortalTermContext'

function registrationTermDisplayLabel(
  term: { term_label?: string | null; term_name: string; year: number } | null,
): string {
  if (term == null) return ''
  const label = term.term_label?.trim() ?? ''
  if (label !== '') return label
  return `${term.term_name} ${term.year}`.trim()
}

export function RegistrationHomePage() {
  const t = useStudentPortalT()
  const { portalDefaultTerm, defaultTermId, loading: portalTermLoading } =
    useStudentPortalTerm()

  const actions = useMemo(
    () =>
      [
        {
          to: 'offered-timetable' as const,
          titleKey: 'registrationPlanHomeTitle' as const,
          descKey: 'registrationPlanHomeDesc' as const,
          appendTermQuery: true as const,
        },
        {
          to: 'course-search' as const,
          titleKey: 'regActionCourseSearchTitle' as const,
          descKey: 'regActionCourseSearchDesc' as const,
          appendTermQuery: true as const,
        },
        {
          to: '/my-courses' as const,
          titleKey: 'regActionMyTimetableTitle' as const,
          descKey: 'regActionMyTimetableDesc' as const,
          appendTermQuery: false as const,
        },
        {
          to: 'form' as const,
          titleKey: 'regActionRegistrationFormTitle' as const,
          descKey: 'regActionRegistrationFormDesc' as const,
          appendTermQuery: true as const,
        },
        {
          to: 'status' as const,
          titleKey: 'regActionRegistrationStatusTitle' as const,
          descKey: 'regActionRegistrationStatusDesc' as const,
          appendTermQuery: true as const,
        },
      ] as const,
    [],
  )

  const selectedId = defaultTermId.trim()
  const termDisplay = useMemo(
    () => registrationTermDisplayLabel(portalDefaultTerm),
    [portalDefaultTerm],
  )

  const loadState = portalTermLoading
    ? 'loading'
    : selectedId !== ''
      ? 'ready'
      : 'error'

  const termQuery =
    selectedId !== '' ? `?term=${encodeURIComponent(selectedId)}` : ''

  return (
    <main className="portal-page portal-stack">
      <section
        className="portal-module-panel portal-registration-term-panel"
        aria-labelledby="registration-term-heading"
      >
        <h2 id="registration-term-heading" className="portal-module-panel-heading">
          {t('registrationCurrentTermLabel')}
        </h2>
        {loadState === 'loading' ? (
          <p className="portal-text-muted portal-registration-term-status" role="status">
            {t('registrationLoadingTermsShort')}
          </p>
        ) : null}
        {loadState === 'error' ? (
          <p className="portal-text-muted portal-registration-term-status" role="alert">
            {t('registrationNoTermsAvailable')}
          </p>
        ) : null}
        {loadState === 'ready' ? (
          <p className="portal-registration-term-display">{termDisplay}</p>
        ) : null}
      </section>

      <section className="portal-module-panel" aria-labelledby="registration-actions-heading">
        <h2 id="registration-actions-heading" className="portal-module-panel-heading">
          {t('registrationServicesHeading')}
        </h2>
        <ul className="portal-registration-action-grid">
          {actions.map((action) => (
            <li key={action.to}>
              <NavLink
                to={
                  action.to.startsWith('/')
                    ? action.to
                    : `${action.to}${action.appendTermQuery ? termQuery : ''}`
                }
                className="portal-registration-action-card"
              >
                <span className="portal-registration-action-arrow" aria-hidden="true">
                  →
                </span>
                <h3 className="portal-registration-action-title">{t(action.titleKey)}</h3>
                <p className="portal-registration-action-desc">{t(action.descKey)}</p>
              </NavLink>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
