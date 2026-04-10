import { useStudentPortalT } from '../../LanguageContext'

export function ClinicalExamPracticePage() {
  const t = useStudentPortalT()

  return (
    <main className="portal-page">
      <h2 className="portal-section-heading">{t('clinicalExamPracticeHeading')}</h2>
      <p className="portal-page-lede">
        {t('clinicalExamPracticeLede')}
      </p>
      <section className="portal-module-panel portal-clinical-exam-readiness" aria-labelledby="exam-readiness-heading">
        <h3 id="exam-readiness-heading" className="portal-module-panel-heading">
          {t('clinicalExamReadinessOverview')}
        </h3>
        <div className="portal-grid-2">
          <div className="portal-card">
            <p className="portal-card-label">{t('clinicalExamNextWindowLabel')}</p>
            <p className="portal-card-value">Apr 18 – Apr 22, 2026</p>
            <p className="portal-card-note">{t('clinicalExamOfficialAttemptNote')}</p>
          </div>
          <div className="portal-card">
            <p className="portal-card-label">{t('clinicalExamPracticeAttemptsLabel')}</p>
            <p className="portal-card-value">{t('clinicalExamPracticeAttemptsSample')}</p>
            <p className="portal-card-note">{t('clinicalExamUnscoredRunsNote')}</p>
          </div>
        </div>
      </section>
      <section className="portal-module-panel" aria-labelledby="exam-actions-heading">
        <h3 id="exam-actions-heading" className="portal-module-panel-heading">
          {t('moduleActionsHeading')}
        </h3>
        <ul className="portal-module-list">
          <li className="portal-module-list-item portal-clinical-action-row">
            <div>
              <span className="portal-module-list-label">{t('clinicalExamStartPractice')}</span>
              <p className="portal-clinical-meta-line portal-clinical-meta-line--flush">
                {t('clinicalExamStartPracticeDesc')}
              </p>
            </div>
            <button type="button" className="portal-btn portal-btn--primary portal-btn--compact">
              {t('start')}
            </button>
          </li>
          <li className="portal-module-list-item portal-clinical-action-row">
            <div>
              <span className="portal-module-list-label">{t('clinicalExamReviewMaterials')}</span>
              <p className="portal-clinical-meta-line portal-clinical-meta-line--flush">
                {t('clinicalExamReviewMaterialsDesc')}
              </p>
            </div>
            <button type="button" className="portal-btn portal-btn--secondary portal-btn--compact">
              {t('open')}
            </button>
          </li>
          <li className="portal-module-list-item portal-clinical-action-row">
            <div>
              <span className="portal-module-list-label">{t('clinicalExamViewAttempts')}</span>
              <p className="portal-clinical-meta-line portal-clinical-meta-line--flush">
                {t('clinicalExamViewAttemptsDesc')}
              </p>
            </div>
            <button type="button" className="portal-btn portal-btn--secondary portal-btn--compact">
              {t('history')}
            </button>
          </li>
        </ul>
      </section>
    </main>
  )
}
