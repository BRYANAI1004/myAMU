import type { ReactNode } from 'react'
import { useStudentPortalT } from '@/LanguageContext'

export const PORTAL_MOBILE_NAV_DRAWER_ID = 'portal-mobile-nav-drawer'
export const PORTAL_MOBILE_DRAWER_CLOSE_ID = 'portal-mobile-drawer-close'

type PortalMobileNavDrawerProps = {
  open: boolean
  onClose: () => void
  children: ReactNode
}

/** Slide-out navigation for narrow viewports; controlled by `PortalShell`. */
export function PortalMobileNavDrawer({ open, onClose, children }: PortalMobileNavDrawerProps) {
  const t = useStudentPortalT()
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
        aria-label={t('closeNavigationMenu')}
      />
      <aside
        className="portal-sidebar portal-sidebar--drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="portal-mobile-nav-title"
      >
        <div className="portal-sidebar-drawer-header">
          <h2 id="portal-mobile-nav-title" className="visually-hidden">
            {t('portalMenuTitle')}
          </h2>
          <button
            id={PORTAL_MOBILE_DRAWER_CLOSE_ID}
            type="button"
            className="portal-sidebar-drawer-close"
            onClick={onClose}
            aria-label={t('closeMenu')}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <nav className="portal-sidebar-nav" aria-label={t('portalModulesAria')}>
          {children}
        </nav>
      </aside>
    </div>
  )
}
