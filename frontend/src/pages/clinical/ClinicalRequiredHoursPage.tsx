import { useStudentPortalT } from '../../LanguageContext'

const CATEGORY_KEYS = [
  'clinicalCategoryAmbulatory',
  'clinicalCategoryInpatient',
  'clinicalCategoryProceduresLab',
] as const

const COMPLETED = [112, 96, 24] as const
const REQUIRED = [160, 192, 32] as const

const TOTAL_REQUIRED = 480
const TOTAL_COMPLETED = 312

export function ClinicalRequiredHoursPage() {
  const t = useStudentPortalT()
  const pct = Math.round((TOTAL_COMPLETED / TOTAL_REQUIRED) * 100)
  const remaining = TOTAL_REQUIRED - TOTAL_COMPLETED

  return (
    <main className="portal-page">
      <h2 className="portal-section-heading">{t('requiredHours')}</h2>
      <p className="portal-page-lede">
        {t('clinicalHoursLede')}
      </p>
      <section className="portal-card portal-academics-progress-card" aria-labelledby="hours-progress-heading">
        <h3 id="hours-progress-heading" className="portal-section-heading">
          {t('clinicalHoursOverallProgress')}
        </h3>
        <div className="portal-grid-4">
          <div>
            <p className="portal-card-label">{t('clinicalHoursTotalRequired')}</p>
            <p className="portal-card-value">{TOTAL_REQUIRED} hrs</p>
          </div>
          <div>
            <p className="portal-card-label">{t('clinicalHoursLoggedVerified')}</p>
            <p className="portal-card-value">{TOTAL_COMPLETED} hrs</p>
          </div>
          <div>
            <p className="portal-card-label">{t('clinicalHoursRemainingLabel')}</p>
            <p className="portal-card-value">{remaining} hrs</p>
          </div>
          <div>
            <p className="portal-card-label">{t('clinicalHoursProgressPercent')}</p>
            <p className="portal-card-value">{pct}%</p>
          </div>
        </div>
        <div className="portal-academics-progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="portal-academics-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="portal-academics-progress-caption portal-inline-note portal-inline-note--flush">
          {t('clinicalHoursTargetCaption')}
        </p>
      </section>
      <section className="portal-module-panel" aria-labelledby="hours-by-category-heading">
        <h3 id="hours-by-category-heading" className="portal-module-panel-heading">
          {t('clinicalHoursByCategory')}
        </h3>
        <ul className="portal-module-list">
          {CATEGORY_KEYS.map((ck, i) => {
            const cat = { label: t(ck), completed: COMPLETED[i], required: REQUIRED[i] }
            const c = Math.min(100, Math.round((cat.completed / cat.required) * 100))
            return (
              <li key={ck} className="portal-module-list-item portal-clinical-hours-row">
                <div className="portal-clinical-hours-info">
                  <span className="portal-module-list-label">{cat.label}</span>
                  <span className="portal-clinical-meta-line portal-clinical-meta-line--flush">
                    {t('clinicalHoursOfTotal')
                      .replace('{completed}', String(cat.completed))
                      .replace('{required}', String(cat.required))}
                  </span>
                  <div className="portal-academics-progress-track portal-clinical-hours-bar">
                    <div className="portal-academics-progress-fill" style={{ width: `${c}%` }} />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    </main>
  )
}
