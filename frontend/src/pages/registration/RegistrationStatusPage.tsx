import { useStudentPortalT } from '@/LanguageContext'

export function RegistrationStatusPage() {
  const t = useStudentPortalT()
  return (
    <main className="portal-page">
      <p className="portal-page-lede">{t('registrationStatusLede')}</p>
      <ul className="portal-registration-status-list" aria-label={t('registrationStatusAria')}>
        <li className="portal-registration-status-item">
          <div>
            <p className="portal-registration-status-label">{t('regStatusWindowLabel')}</p>
            <p className="portal-registration-status-value">{t('regStatusWindowValue')}</p>
            <p className="portal-registration-status-note">{t('regStatusWindowNote')}</p>
          </div>
          <span className="portal-registration-status-badge">{t('regStatusOpenBadge')}</span>
        </li>
        <li className="portal-registration-status-item">
          <div>
            <p className="portal-registration-status-label">{t('regStatusHoldsLabel')}</p>
            <p className="portal-registration-status-value">{t('regStatusHoldsValue')}</p>
            <p className="portal-registration-status-note">{t('regStatusHoldsNote')}</p>
          </div>
          <span className="portal-registration-status-badge portal-registration-status-badge--neutral">
            {t('regStatusClearBadge')}
          </span>
        </li>
        <li className="portal-registration-status-item">
          <div>
            <p className="portal-registration-status-label">{t('regStatusAdvisorLabel')}</p>
            <p className="portal-registration-status-value">{t('regStatusAdvisorValue')}</p>
            <p className="portal-registration-status-note">{t('regStatusAdvisorNote')}</p>
          </div>
          <span className="portal-registration-status-badge portal-registration-status-badge--neutral">
            {t('regStatusNaBadge')}
          </span>
        </li>
        <li className="portal-registration-status-item">
          <div>
            <p className="portal-registration-status-label">{t('regStatusCreditsLabel')}</p>
            <p className="portal-registration-status-value">{t('regStatusCreditsValue')}</p>
            <p className="portal-registration-status-note">{t('regStatusCreditsNote')}</p>
          </div>
          <span className="portal-registration-status-badge">{t('regStatusCreditsBadge')}</span>
        </li>
      </ul>
    </main>
  )
}
