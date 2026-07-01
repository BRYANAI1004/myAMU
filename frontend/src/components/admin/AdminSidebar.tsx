import { NavLink, useLocation } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { useAdminAuth } from '../../context/AdminAuthContext'
import {
  ADMIN_FOOTER_MODULES,
  ADMIN_MAIN_MODULES,
  type AdminModuleDefinition,
  hasAdminModuleAccess,
} from '../../lib/adminAccess'
import { ADMIN_MODULE_ICONS } from '../../lib/adminNavIcons'

function navClassName(isActive: boolean) {
  return ['portal-nav-link', 'sidebar-item', isActive ? 'portal-nav-link--active' : '']
    .filter(Boolean)
    .join(' ')
}

type AdminNavLinkProps = {
  module: AdminModuleDefinition
  schedulingSearch: string
  Icon: LucideIcon
  disabled?: boolean
}

function AdminNavLinkItem({
  module,
  schedulingSearch,
  Icon,
  disabled = false,
}: AdminNavLinkProps) {
  const { label, path, end, schedulingContext } = module

  if (disabled) {
    return (
      <span
        className="portal-nav-link sidebar-item portal-nav-link--disabled"
        aria-disabled="true"
        title={`${label} is unavailable for this account`}
      >
        <span className="portal-nav-link-icon" aria-hidden>
          <Icon size={20} strokeWidth={2} />
        </span>
        <span className="portal-nav-link-label">{label}</span>
      </span>
    )
  }

  return (
    <NavLink
      to={schedulingContext ? { pathname: path, search: schedulingSearch } : path}
      end={end ?? false}
      className={({ isActive }) => navClassName(isActive)}
    >
      <span className="portal-nav-link-icon" aria-hidden>
        <Icon size={20} strokeWidth={2} />
      </span>
      <span className="portal-nav-link-label">{label}</span>
    </NavLink>
  )
}

function AdminNavItems({
  modules,
  role,
  schedulingSearch,
  clinicalAdminOnly,
}: {
  modules: readonly AdminModuleDefinition[]
  role: ReturnType<typeof useAdminAuth>['role']
  schedulingSearch: string
  clinicalAdminOnly: boolean
}) {
  return (
    <>
      {modules.map((module) => {
        const isAllowed = role == null ? true : hasAdminModuleAccess(role, module.key)
        if (clinicalAdminOnly && !isAllowed) {
          return null
        }
        const Icon = ADMIN_MODULE_ICONS[module.key]
        return (
          <li key={module.path}>
            <AdminNavLinkItem
              module={module}
              schedulingSearch={schedulingSearch}
              Icon={Icon}
              disabled={!isAllowed}
            />
          </li>
        )
      })}
    </>
  )
}

export function AdminSidebar() {
  const location = useLocation()
  const { role } = useAdminAuth()
  const schedulingSearch = location.pathname.startsWith('/admin/course-sections')
    ? location.search
    : ''
  const clinicalAdminOnly = role === 'clinical_admin'
  const footerModules = ADMIN_FOOTER_MODULES.filter(
    (module) => role == null || hasAdminModuleAccess(role, module.key),
  )
  const showFooter = !clinicalAdminOnly && footerModules.length > 0

  return (
    <aside className="admin-sidebar" aria-label="Administration">
      <nav className="portal-sidebar-nav" aria-label="Primary">
        <div className="portal-sidebar-nav-groups">
          <div className="portal-sidebar-nav-group">
            <ul className="portal-sidebar-nav-list">
              <AdminNavItems
                modules={ADMIN_MAIN_MODULES}
                role={role}
                schedulingSearch={schedulingSearch}
                clinicalAdminOnly={clinicalAdminOnly}
              />
            </ul>
          </div>
          {showFooter ? (
            <div className="portal-sidebar-nav-group portal-sidebar-nav-group--account">
              <ul className="portal-sidebar-nav-list">
                <AdminNavItems
                  modules={footerModules}
                  role={role}
                  schedulingSearch={schedulingSearch}
                  clinicalAdminOnly={false}
                />
              </ul>
            </div>
          ) : null}
        </div>
      </nav>
    </aside>
  )
}
