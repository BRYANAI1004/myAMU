import { Outlet } from 'react-router-dom'
import { BackToDashboardLink } from '../../components/BackToDashboardLink'
import { useStudentPortalT } from '../../LanguageContext'

export function ClinicalLayout() {
  const t = useStudentPortalT()
  return (
    <div className="portal-clinical-module">
      <header className="portal-module-header">
        <BackToDashboardLink />
        <h1 className="portal-page-title">{t('clinicalModule')}</h1>
      </header>
      <div className="portal-clinical-outlet">
        <Outlet />
      </div>
    </div>
  )
}
