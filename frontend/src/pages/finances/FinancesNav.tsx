import { NavLink } from 'react-router-dom'
import { useStudentPortalT } from '@/LanguageContext'
import type { StudentPortalKey } from '@/lib/i18n'

function tabClass(isActive: boolean) {
  return ['portal-tab', isActive ? 'portal-tab--active' : ''].filter(Boolean).join(' ')
}

const ITEMS: { to: string; labelKey: StudentPortalKey }[] = [
  { to: 'overview', labelKey: 'overview' },
]

export function FinancesNav() {
  const t = useStudentPortalT()
  return (
    <nav className="portal-finances-nav" aria-label={t('financesNavAria')}>
      <ul className="portal-tab-group">
        {ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink to={item.to} className={({ isActive }) => tabClass(isActive)}>
              {t(item.labelKey)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
