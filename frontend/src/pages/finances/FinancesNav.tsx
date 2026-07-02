import { NavLink } from 'react-router-dom'
import { useStudentPortalT } from '@/LanguageContext'
import type { StudentPortalKey } from '@/lib/i18n'
import { portalPillTabClass } from '@/lib/portalPillTabClass'

const ITEMS: { to: string; labelKey: StudentPortalKey }[] = [
  { to: 'overview', labelKey: 'overview' },
  { to: 'store', labelKey: 'feesAndServices' },
]

export function FinancesNav() {
  const t = useStudentPortalT()
  return (
    <nav className="portal-finances-nav" aria-label={t('financesNavAria')}>
      <ul className="portal-tab-group">
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
