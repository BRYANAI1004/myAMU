import { useMemo } from 'react'
import { useStudentPortalT } from '../../LanguageContext'

const MILESTONE_KEYS = [
  { labelKey: 'milestonePreClinicalCore' as const, statusKey: 'milestoneStatusInProgress' as const },
  { labelKey: 'milestoneUsmleStep1' as const, statusKey: 'milestoneStatusUpcoming' as const },
  { labelKey: 'milestoneClinicalRotationsCore' as const, statusKey: 'milestoneStatusNotStarted' as const },
]

export function AcademicProgressPage() {
  const t = useStudentPortalT()
  const completed = 48
  const required = 180
  const pct = Math.round((completed / required) * 100)

  const caption = useMemo(
    () =>
      t('programCompletionPercentCaption')
        .replace('{pct}', String(pct))
        .replace('{completed}', String(completed))
        .replace('{required}', String(required)),
    [t, pct, completed, required],
  )

  return (
    <main className="portal-page">
      <h2 className="portal-section-heading">{t('academicProgressHeading')}</h2>
      <p className="portal-page-lede">
        {t('academicProgressLede')}
      </p>

      <div className="portal-card portal-academics-progress-card">
        <p className="portal-card-label">{t('programCompletionSample')}</p>
        <div
          className="portal-academics-progress-track"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('programCompletionAriaLabel')}
        >
          <div className="portal-academics-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="portal-card-note portal-academics-progress-caption">
          {caption}
        </p>
      </div>

      <div className="portal-grid-2">
        <div className="portal-card">
          <p className="portal-card-label">{t('completedCredits')}</p>
          <p className="portal-card-value">{completed}</p>
        </div>
        <div className="portal-card">
          <p className="portal-card-label">{t('remainingCreditsEst')}</p>
          <p className="portal-card-value">{required - completed}</p>
        </div>
      </div>

      <section className="portal-module-panel" aria-labelledby="milestones-heading">
        <h3 id="milestones-heading" className="portal-module-panel-heading">
          {t('requiredMilestones')}
        </h3>
        <ul className="portal-module-list">
          {MILESTONE_KEYS.map((m) => (
            <li key={m.labelKey} className="portal-module-list-item">
              <span className="portal-module-list-label">{t(m.labelKey)}</span>
              <span className="portal-module-list-badge">{t(m.statusKey)}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="portal-note">
        <strong>{t('progressComingLaterLabel')}</strong>{' '}
        {t('progressComingLaterDetail')}
      </p>
    </main>
  )
}
