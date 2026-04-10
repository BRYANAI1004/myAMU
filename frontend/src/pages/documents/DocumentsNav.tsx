import { NavLink } from 'react-router-dom'
import { useStudentPortalT } from '../../LanguageContext'

function linkClass(isActive: boolean) {
  return ['portal-tab', isActive ? 'portal-tab--active' : ''].filter(Boolean).join(' ')
}

export function DocumentsNav() {
  const t = useStudentPortalT()
  const ITEMS = [
    { to: 'policies', labelKey: 'policies' as const },
    { to: 'forms', labelKey: 'forms' as const },
    { to: 'handbook', labelKey: 'handbook' as const },
    { to: 'uploads', labelKey: 'uploads' as const },
  ]

  return (
    <nav className="portal-documents-nav" aria-label={t('documentsNavAria')}>
      <ul className="portal-tab-group">
        <li>
          <NavLink to="/documents" end className={({ isActive }) => linkClass(isActive)}>
            {t('navOverview')}
          </NavLink>
        </li>
        {ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink to={item.to} className={({ isActive }) => linkClass(isActive)}>
              {t(item.labelKey)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
