import { useStudentPortalT } from '../../LanguageContext'
import { DASHBOARD_IMPORTANT_DATES_MOCK } from './dashboardMockData'

export function DashboardImportantDates() {
  const t = useStudentPortalT()

  return (
    <section className="portal-dashboard-secondary-card" aria-labelledby="portal-dashboard-dates-heading">
      <header className="portal-dashboard-secondary-card-head">
        <h2 id="portal-dashboard-dates-heading" className="portal-dashboard-card-panel-title">
          {t('importantDates')}
        </h2>
      </header>
      <ul className="portal-dashboard-dates-list">
        {DASHBOARD_IMPORTANT_DATES_MOCK.map((item) => (
          <li key={`${item.dayMonth}-${item.label}`} className="portal-dashboard-dates-item">
            <span className="portal-dashboard-dates-when">{item.dayMonth}</span>
            <span className="portal-dashboard-dates-label">{item.label}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
