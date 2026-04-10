import { Outlet } from 'react-router-dom'
import { BackToDashboardLink } from '../../components/BackToDashboardLink'
import { useStudentPortalT } from '../../LanguageContext'

export function DocumentsLayout() {
  const t = useStudentPortalT()
  return (
    <div className="portal-documents-module">
      <div className="portal-documents-content">
        <header className="portal-module-header">
          <BackToDashboardLink />
          <h1 className="portal-page-title">{t('documentsFormsTitle')}</h1>
        </header>
        <Outlet />
      </div>
    </div>
  )
}
