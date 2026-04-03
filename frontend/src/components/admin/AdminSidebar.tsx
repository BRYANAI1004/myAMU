import { NavLink } from 'react-router-dom'

const links = [
  { to: '/admin/students', label: 'Students' },
  { to: '/admin/courses', label: 'Courses' },
  { to: '/admin/finance', label: 'Finance' },
] as const

export function AdminSidebar() {
  return (
    <aside className="admin-sidebar" aria-label="Administration">
      <div className="admin-sidebar__brand">
        <span className="admin-sidebar__brand-title">Admin</span>
        <span className="admin-sidebar__brand-sub">Navigation</span>
      </div>
      <nav className="admin-sidebar__nav" aria-label="Primary">
        <ul className="admin-sidebar__list">
          {links.map(({ to, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `admin-sidebar__link${isActive ? ' admin-sidebar__link--active' : ''}`
                }
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
