import { useStudentPortalT } from '../../LanguageContext'

export function EnrollmentVerificationPage() {
  const t = useStudentPortalT()

  return (
    <main className="portal-page">
      <h2 className="portal-section-heading">{t('enrollmentVerificationHeading')}</h2>
      <p className="portal-page-lede">
        {t('enrollmentVerificationLede')}
      </p>

      <div className="portal-actions portal-academics-enrollment-actions">
        <button type="button" className="portal-btn portal-btn--primary">
          {t('requestVerificationLetter')}
        </button>
        <button type="button" className="portal-btn portal-btn--secondary">
          {t('downloadEnrollmentConfirmation')}
        </button>
      </div>

      <section className="portal-module-panel" aria-labelledby="status-heading">
        <h3 id="status-heading" className="portal-module-panel-heading">
          {t('currentStatusSample')}
        </h3>
        <ul className="portal-module-list">
          <li className="portal-module-list-item">
            <span className="portal-module-list-label">{t('term')}</span>
            <span>Spring 2026</span>
          </li>
          <li className="portal-module-list-item">
            <span className="portal-module-list-label">{t('enrollment')}</span>
            <span className="portal-status portal-status--paid">{t('enrollmentFullTime')}</span>
          </li>
          <li className="portal-module-list-item">
            <span className="portal-module-list-label">{t('program')}</span>
            <span>Doctor of Medicine</span>
          </li>
          <li className="portal-module-list-item">
            <span className="portal-module-list-label">{t('expectedGraduation')}</span>
            <span>May 2028</span>
          </li>
        </ul>
      </section>

      <p className="portal-inline-note">
        {t('enrollmentVerificationFootnote')}
      </p>
    </main>
  )
}
