import { useStudentPortalT } from '../../LanguageContext'

export function GpaPage() {
  const t = useStudentPortalT()

  return (
    <main className="portal-page">
      <h2 className="portal-section-heading">{t('gpaHeading')}</h2>
      <p className="portal-page-lede">
        {t('gpaPageLede')}
      </p>

      <div className="portal-grid-4">
        <div className="portal-card">
          <p className="portal-card-label">{t('cumulativeGpa')}</p>
          <p className="portal-card-value">3.72</p>
          <p className="portal-card-note">{t('allTermsGradedOnly')}</p>
        </div>
        <div className="portal-card">
          <p className="portal-card-label">{t('termGpaSample')}</p>
          <p className="portal-card-value">3.81</p>
          <p className="portal-card-note">{t('mostRecentTerm')}</p>
        </div>
        <div className="portal-card">
          <p className="portal-card-label">{t('completedCreditsLabel')}</p>
          <p className="portal-card-value">48</p>
          <p className="portal-card-note">{t('completedTowardDegree')}</p>
        </div>
        <div className="portal-card">
          <p className="portal-card-label">{t('attemptedCredits')}</p>
          <p className="portal-card-value">51</p>
          <p className="portal-card-note">{t('includesInProgress')}</p>
        </div>
      </div>

      <p className="portal-inline-note">
        {t('gpaCalculationFootnote')}
      </p>
    </main>
  )
}
