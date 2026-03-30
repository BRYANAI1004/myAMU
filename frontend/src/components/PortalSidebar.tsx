import { NavLink, Link } from 'react-router-dom'
import { INSTITUTION_NAME, PORTAL_SYSTEM_NAME } from '../branding'

function navClassName(isActive: boolean) {
  return ['portal-nav-link', isActive ? 'portal-nav-link--active' : ''].filter(Boolean).join(' ')
}

type PortalNavListProps = {
  onItemClick?: () => void
}

function PortalNavList({ onItemClick }: PortalNavListProps) {
  const handleClick = () => {
    onItemClick?.()
  }

  return (
    <ul className="portal-sidebar-nav-list">
      <li>
        <NavLink to="/overview" end className={({ isActive }) => navClassName(isActive)} onClick={handleClick}>
          Overview
        </NavLink>
      </li>
      <li>
        <NavLink to="/activity" className={({ isActive }) => navClassName(isActive)} onClick={handleClick}>
          Activity Details
        </NavLink>
      </li>
      <li>
        <NavLink to="/payment" className={({ isActive }) => navClassName(isActive)} onClick={handleClick}>
          Make a Payment
        </NavLink>
      </li>
      <li>
        <NavLink to="/plan" className={({ isActive }) => navClassName(isActive)} onClick={handleClick}>
          Payment Plan
        </NavLink>
      </li>
      <li>
        <NavLink to="/statements" className={({ isActive }) => navClassName(isActive)} onClick={handleClick}>
          Statements
        </NavLink>
      </li>
      <li>
        <span className="portal-nav-link portal-nav-link--disabled" aria-disabled="true">
          Help
        </span>
      </li>
      <li className="portal-sidebar-nav-divider" role="presentation" aria-hidden="true" />
      <li className="portal-sidebar-nav-signout">
        <Link to="/login" className="portal-nav-link portal-nav-link--signout" onClick={handleClick}>
          Sign Out
        </Link>
      </li>
    </ul>
  )
}

function PortalSidebarBrand() {
  return (
    <div className="portal-sidebar-brand">
      <span className="portal-sidebar-brand-name">{INSTITUTION_NAME}</span>
      <span className="portal-sidebar-brand-tagline">{PORTAL_SYSTEM_NAME}</span>
    </div>
  )
}

/** Fixed left sidebar — visible on desktop only (see `portal.css`). */
export function PortalSidebar() {
  return (
    <aside className="portal-sidebar portal-sidebar--desktop" aria-label="Main navigation">
      <PortalSidebarBrand />
      <nav className="portal-sidebar-nav" aria-label="Portal sections">
        <PortalNavList />
      </nav>
    </aside>
  )
}

type PortalMobileNavDrawerProps = {
  open: boolean
  onClose: () => void
}

export const PORTAL_MOBILE_NAV_DRAWER_ID = 'portal-mobile-nav-drawer'
export const PORTAL_MOBILE_DRAWER_CLOSE_ID = 'portal-mobile-drawer-close'

/** Slide-out navigation for narrow viewports; controlled by `PageLayout`. */
export function PortalMobileNavDrawer({ open, onClose }: PortalMobileNavDrawerProps) {
  const handleNav = () => {
    onClose()
  }

  return (
    <div
      className={['portal-nav-drawer', open ? 'portal-nav-drawer--open' : ''].filter(Boolean).join(' ')}
      id={PORTAL_MOBILE_NAV_DRAWER_ID}
      aria-hidden={!open}
    >
      <button
        type="button"
        className="portal-nav-drawer-backdrop"
        onClick={onClose}
        tabIndex={open ? 0 : -1}
        aria-label="Close navigation menu"
      />
      <aside
        className="portal-sidebar portal-sidebar--drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="portal-mobile-nav-title"
      >
        <div className="portal-sidebar-drawer-header">
          <h2 id="portal-mobile-nav-title" className="visually-hidden">
            Portal menu
          </h2>
          <button
            id={PORTAL_MOBILE_DRAWER_CLOSE_ID}
            type="button"
            className="portal-sidebar-drawer-close"
            onClick={onClose}
            aria-label="Close menu"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <PortalSidebarBrand />
        <nav className="portal-sidebar-nav" aria-label="Portal sections">
          <PortalNavList onItemClick={handleNav} />
        </nav>
      </aside>
    </div>
  )
}
