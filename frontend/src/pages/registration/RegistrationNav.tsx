import { NavLink } from 'react-router-dom'
import { useStudentPortalT } from '@/LanguageContext'
import type { StudentPortalKey } from '@/lib/i18n'
import { portalPillTabClass } from '@/lib/portalPillTabClass'

const ITEMS: { to: string; labelKey: StudentPortalKey }[] = [
  { to: 'offered-timetable', labelKey: 'registrationPlanNavLabel' },
  { to: 'course-search', labelKey: 'courseSearchHeading' },
]

function navTo(path: string, termLinkSearch: string) {
  const search = termLinkSearch.startsWith('?')
    ? termLinkSearch.slice(1)
    : termLinkSearch
  return search !== '' ? { pathname: path, search } : path
}

export function RegistrationNav({ termLinkSearch }: { termLinkSearch: string }) {
  const t = useStudentPortalT()
  return (
    <nav className="portal-registration-nav" aria-label={t('registrationNavAria')}>
      <ul className="portal-tab-group portal-tab-group--registration-sub">
        {ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              end
              to={navTo(item.to, termLinkSearch)}
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
