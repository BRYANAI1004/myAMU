import { Link } from 'react-router-dom'
import { useStudentPortalT } from '@/LanguageContext'

export function BackToDashboardLink() {
  const t = useStudentPortalT()
  return (
    <Link to="/dashboard" className="portal-back-to-dashboard-link">
      {t('backToDashboard')}
    </Link>
  )
}
