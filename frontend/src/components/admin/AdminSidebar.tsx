import { NavLink, useLocation } from 'react-router-dom'

function navClassName(isActive: boolean) {
  return ['portal-nav-link', 'sidebar-item', isActive ? 'portal-nav-link--active' : '']
    .filter(Boolean)
    .join(' ')
}

type AdminNavItem = {
  path: string
  label: string
  end?: boolean
  /** Keep `term` / `course` / `q` when switching between Course Sections and Timetable. */
  schedulingContext?: boolean
}

const links: AdminNavItem[] = [
  { path: '/admin/students', label: 'Students' },
  { path: '/admin/clinical', label: 'Clinical' },
  { path: '/admin/courses', label: 'Courses' },
  { path: '/admin/academic-terms', label: 'Academic Terms' },
  /** `end` avoids highlighting Course Sections when viewing the timetable sub-route. */
  {
    path: '/admin/course-sections',
    label: 'Course Sections',
    end: true,
    schedulingContext: true,
  },
  {
    path: '/admin/course-sections/timetable',
    label: 'Scheduling Timetable',
    schedulingContext: true,
  },
  { path: '/admin/finance', label: 'Finance' },
]

export function AdminSidebar() {
  const location = useLocation()
  const schedulingSearch = location.pathname.startsWith('/admin/course-sections')
    ? location.search
    : ''

  return (
    <aside className="admin-sidebar" aria-label="Administration">
      <nav className="portal-sidebar-nav" aria-label="Primary">
        <ul className="portal-sidebar-nav-list portal-sidebar-nav-list--text-only">
          {links.map(({ path, label, end, schedulingContext }) => (
            <li key={path}>
              <NavLink
                to={
                  schedulingContext
                    ? { pathname: path, search: schedulingSearch }
                    : path
                }
                end={end ?? false}
                className={({ isActive }) => navClassName(isActive)}
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
