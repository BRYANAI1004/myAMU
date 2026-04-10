import { Link } from 'react-router-dom'
import { useStudentPortalT } from '../../LanguageContext'
import { DASHBOARD_ACCOUNT_SUMMARY_MOCK } from './dashboardMockData'

export function DashboardAccountSummary() {
  const t = useStudentPortalT()
  const { currentBalance, nextPaymentDue, holds } = DASHBOARD_ACCOUNT_SUMMARY_MOCK

  return (
    <section className="portal-dashboard-secondary-card" aria-labelledby="portal-dashboard-account-heading">
      <header className="portal-dashboard-secondary-card-head">
        <h2 id="portal-dashboard-account-heading" className="portal-dashboard-card-panel-title">
          {t('accountSummary')}
        </h2>
      </header>
      <dl className="portal-dashboard-account-dl">
        <div className="portal-dashboard-account-row">
          <dt>{t('currentBalance')}</dt>
          <dd>{currentBalance}</dd>
        </div>
        <div className="portal-dashboard-account-row">
          <dt>{t('nextPaymentDue')}</dt>
          <dd>{nextPaymentDue}</dd>
        </div>
        <div className="portal-dashboard-account-row">
          <dt>{t('holds')}</dt>
          <dd>{holds}</dd>
        </div>
      </dl>
      <div className="portal-dashboard-account-footer">
        <Link to="/finances" className="portal-text-link portal-dashboard-account-link">
          {t('viewFinances')}
        </Link>
      </div>
    </section>
  )
}
