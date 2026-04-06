import { NavLink } from 'react-router-dom'

function linkClass(isActive: boolean) {
  return ['portal-tab', isActive ? 'portal-tab--active' : ''].filter(Boolean).join(' ')
}

const ITEMS = [
  { to: 'search', label: 'Course Search' },
  { to: 'course-bin', label: 'My CourseBin' },
  { to: 'schedule', label: 'My Timetable' },
] as const

export function RegistrationNav({ termLinkSearch }: { termLinkSearch: string }) {
  return (
    <nav className="portal-registration-nav" aria-label="Registration">
      <ul className="portal-tab-group">
        {ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={`${item.to}${termLinkSearch}`}
              className={({ isActive }) => linkClass(isActive)}
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
