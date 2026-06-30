import { Outlet, useLocation } from 'react-router-dom'
import { BackToDashboardLink } from '@/components/BackToDashboardLink'
import { useStudentPortalT } from '@/LanguageContext'
import { FinancesNav } from './FinancesNav'

function isStoreCatalogPath(pathname: string): boolean {
  return pathname === '/finances/store' || pathname.endsWith('/finances/store')
}

function isOverviewPath(pathname: string): boolean {
  return (
    pathname === '/finances' ||
    pathname === '/finances/overview' ||
    pathname.endsWith('/finances/overview')
  )
}

function hideFinancesModuleChrome(pathname: string): boolean {
  return isStoreCatalogPath(pathname) || isOverviewPath(pathname)
}

export function FinancesLayout() {
  const t = useStudentPortalT()
  const { pathname } = useLocation()
  const overview = isOverviewPath(pathname)
  const minimalChrome = hideFinancesModuleChrome(pathname)

  return (
    <div className="portal-finances-module">
      <div className="portal-finances-content">
        <header
          className={[
            'portal-module-header',
            overview ? 'portal-module-header--compact' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <BackToDashboardLink />
          {overview ? (
            <h1 className="portal-page-title portal-finances-overview__title">{t('makePayment')}</h1>
          ) : !minimalChrome ? (
            <h1 className="portal-page-title">{t('financesModuleTitle')}</h1>
          ) : null}
        </header>
        {!minimalChrome ? <FinancesNav /> : null}
        <div className="portal-finances-outlet">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
