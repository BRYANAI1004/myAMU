import { NavLink } from 'react-router-dom'
import { useStudentPortalT } from '../../LanguageContext'
import { portalPillTabClass } from '../../lib/portalPillTabClass'

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
          <NavLink
            end
            to="/documents"
            className={({ isActive }) => portalPillTabClass(isActive)}
          >
            {t('navOverview')}
          </NavLink>
        </li>
        {ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              end
              to={item.to}
              className={({ isActive }) => portalPillTabClass(isActive)}
            >
              {t(item.labelKey)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
