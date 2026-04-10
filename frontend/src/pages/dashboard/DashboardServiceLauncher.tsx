import { NavLink } from 'react-router-dom'
import { useStudentPortalT } from '@/LanguageContext'
import type { StudentPortalKey } from '@/lib/i18n'
import type { DashboardService } from './dashboardMockData'
import { DASHBOARD_SERVICES } from './dashboardMockData'
import { DashboardServiceIcon } from './DashboardServiceIcon'

const SERVICE_TITLE_KEY: Record<DashboardService['icon'], StudentPortalKey> = {
  registration: 'registrationModule',
  finances: 'finances',
  academics: 'academics',
  clinical: 'clinicalModule',
  documents: 'documents',
  account: 'myAccount',
}

function ServiceTile({ service }: { service: DashboardService }) {
  const t = useStudentPortalT()
  return (
    <li>
      <NavLink to={service.to} className="portal-dashboard-service-tile">
        <span className="portal-dashboard-service-tile-leading">
          <span className="portal-dashboard-service-tile-icon" aria-hidden>
            <DashboardServiceIcon name={service.icon} />
          </span>
          <span className="portal-dashboard-service-tile-body">
            <span className="portal-dashboard-service-tile-title">
              {t(SERVICE_TITLE_KEY[service.icon])}
            </span>
          </span>
        </span>
        <span className="portal-dashboard-service-tile-arrow" aria-hidden>
          &#8250;
        </span>
      </NavLink>
    </li>
  )
}

export function DashboardServiceLauncher() {
  const t = useStudentPortalT()
  return (
    <section className="portal-dashboard-services" aria-labelledby="portal-dashboard-services-heading">
      <header className="portal-dashboard-services-head portal-dashboard-card-panel-head">
        <h2 id="portal-dashboard-services-heading" className="portal-dashboard-card-panel-title">
          {t('services')}
        </h2>
      </header>
      <div className="portal-dashboard-card-panel-divider" aria-hidden />
      <ul className="portal-dashboard-service-list">
        {DASHBOARD_SERVICES.map((service) => (
          <ServiceTile key={service.to} service={service} />
        ))}
      </ul>
    </section>
  )
}
