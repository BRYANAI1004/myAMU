import { NavLink } from 'react-router-dom'
import { useStudentPortalT } from '../../LanguageContext'
import type { StudentPortalKey } from '../../lib/i18n'

const ACTIONS: { to: string; titleKey: StudentPortalKey; descKey: StudentPortalKey }[] = [
  { to: 'grades', titleKey: 'academicsActionGradesTitle', descKey: 'academicsActionGradesDesc' },
  { to: 'transcript', titleKey: 'academicsActionTranscriptTitle', descKey: 'academicsActionTranscriptDesc' },
  { to: 'gpa', titleKey: 'academicsActionGpaTitle', descKey: 'academicsActionGpaDesc' },
  { to: 'progress', titleKey: 'academicsActionProgressTitle', descKey: 'academicsActionProgressDesc' },
  { to: 'enrollment-verification', titleKey: 'academicsActionEnrollmentTitle', descKey: 'academicsActionEnrollmentDesc' },
]

export function AcademicsHomePage() {
  const t = useStudentPortalT()

  return (
    <main className="portal-page">
      <section className="portal-module-panel" aria-labelledby="academics-actions-heading">
        <h3 id="academics-actions-heading" className="portal-module-panel-heading">
          {t('academicServicesHeading')}
        </h3>
        <ul className="portal-registration-action-grid">
          {ACTIONS.map((action) => (
            <li key={action.to}>
              <NavLink to={action.to} className="portal-registration-action-card">
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
