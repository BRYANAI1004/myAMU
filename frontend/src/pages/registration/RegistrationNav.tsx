import { NavLink } from 'react-router-dom'
import { useStudentPortalT } from '@/LanguageContext'
import type { StudentPortalKey } from '@/lib/i18n'
import { portalPillTabClass } from '@/lib/portalPillTabClass'
import { useCourseBin } from './CourseBinContext'

const ITEMS: { to: string; labelKey: StudentPortalKey }[] = [
  { to: 'course-list', labelKey: 'registrationTabCourseList' },
  { to: 'timetable', labelKey: 'registrationTabTimetable' },
  { to: 'bin', labelKey: 'registrationTabBin' },
]

function navTo(path: string, termLinkSearch: string) {
  const search = termLinkSearch.startsWith('?')
    ? termLinkSearch.slice(1)
    : termLinkSearch
  return search !== '' ? { pathname: path, search } : path
}

export function RegistrationNav({ termLinkSearch }: { termLinkSearch: string }) {
  const t = useStudentPortalT()
  const { items } = useCourseBin()
  const binCount = items.length
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
              {item.to === 'bin' && binCount > 0 ? (
                <span className="portal-registration-nav-bin-count" aria-label={t('registrationBinCountAria').replace('{n}', String(binCount))}>
                  {binCount}
                </span>
              ) : null}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
