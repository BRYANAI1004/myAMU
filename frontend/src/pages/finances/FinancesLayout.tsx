import { Outlet } from 'react-router-dom'
import { useStudentPortalT } from '@/LanguageContext'
import { BackToDashboardLink } from '../../components/BackToDashboardLink'
import { FinancesNav } from './FinancesNav'

export function FinancesLayout() {
  const t = useStudentPortalT()
  return (
    <div className="portal-finances-module">
      <header className="portal-module-header">
        <BackToDashboardLink />
        <h1 className="portal-page-title">{t('financesModuleTitle')}</h1>
      </header>
      <FinancesNav />
      <div className="portal-finances-outlet">
        <Outlet />
      </div>
    </div>
  )
}
