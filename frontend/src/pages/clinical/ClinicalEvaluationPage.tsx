import { useStudentPortalT } from '../../LanguageContext'

const PENDING = [
  {
    id: 'ev-104',
    rotation: 'Ambulatory Medicine — East Clinic',
    evaluator: 'Dr. Jordan Ellis, MD',
    due: 'Apr 12, 2026',
  },
  {
    id: 'ev-105',
    rotation: 'Clinical Skills — Procedure lab',
    evaluator: 'Dr. Samira Okonkwo, MD',
    due: 'Apr 20, 2026',
  },
] as const

const COMPLETED = [
  {
    id: 'ev-098',
    rotation: 'Foundations pre-clinical immersion',
    submitted: 'Mar 4, 2026',
  },
  {
    id: 'ev-101',
    rotation: 'Primary care longitudinal clinic',
    submitted: 'Feb 19, 2026',
  },
] as const

export function ClinicalEvaluationPage() {
  const t = useStudentPortalT()

  return (
    <main className="portal-page">
      <h2 className="portal-section-heading">{t('submitEvaluation')}</h2>
      <p className="portal-page-lede">
        {t('clinicalEvalLede')}
      </p>
      <section className="portal-module-panel portal-stack" aria-labelledby="pending-eval-heading">
        <h3 id="pending-eval-heading" className="portal-module-panel-heading">
          {t('clinicalEvalPending')}
        </h3>
        <ul className="portal-registration-status-list">
          {PENDING.map((row) => (
            <li key={row.id} className="portal-registration-status-item">
              <div>
                <p className="portal-registration-status-label">{t('rotation')}</p>
                <p className="portal-registration-status-value">{row.rotation}</p>
                <p className="portal-clinical-meta-line">
                  {t('clinicalEvalEvaluatorDue').replace('{evaluator}', row.evaluator).replace('{due}', row.due)}
                </p>
              </div>
              <div className="portal-actions portal-clinical-inline-actions">
                <button type="button" className="portal-btn portal-btn--primary portal-btn--compact">
                  {t('continue')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="portal-module-panel portal-stack" aria-labelledby="completed-eval-heading">
        <h3 id="completed-eval-heading" className="portal-module-panel-heading">
          {t('clinicalEvalCompleted')}
        </h3>
        <div className="portal-table-wrap">
          <table className="portal-table">
            <thead>
              <tr>
                <th scope="col">{t('rotation')}</th>
                <th scope="col">{t('clinicalEvalSubmittedCol')}</th>
                <th scope="col">{t('status')}</th>
              </tr>
            </thead>
            <tbody>
              {COMPLETED.map((row) => (
                <tr key={row.id}>
                  <td>{row.rotation}</td>
                  <td>{row.submitted}</td>
                  <td>
                    <span className="portal-status portal-status--paid">{t('clinicalEvalReleasedToStudent')}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="portal-note" role="note">
        <strong>{t('clinicalEvalNewNoteLead')}</strong>{' '}
        {t('clinicalEvalNewNoteMid')}
        <em>{t('clinicalEvalStartNewEm')}</em>
        {t('clinicalEvalNewNoteAfterEm')}
      </section>
      <div className="portal-actions">
        <button type="button" className="portal-btn portal-btn--secondary">
          {t('clinicalEvalStartNewButton')}
        </button>
      </div>
    </main>
  )
}
