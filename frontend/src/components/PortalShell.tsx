import { useEffect, useRef, useState, type ReactNode } from 'react'
import { PORTAL_MOBILE_DRAWER_CLOSE_ID, PortalMobileNavDrawer } from './PortalSidebar'
import { Sidebar, SidebarNavList, type SidebarNavVariant } from './Sidebar'
import { TopBar } from './TopBar'
import { PortalStudentInfoBar } from './PortalStudentInfoBar'

type PortalShellProps = {
  children: ReactNode
  /** When true, shows the account summary strip used by billing pages. */
  showStudentBar?: boolean
  /** When false, hides the desktop sidebar (e.g. portal homepage at /dashboard). */
  showSidebar?: boolean
  /** When true, shows the white myAMU banner under the branding bar. */
  showPortalBanner?: boolean
  /** Homepage: content-height layout (no viewport filling / excess bottom gap). */
  dashboardHome?: boolean
  /** Module sidebar / mobile drawer: `internal` text-only vs `dashboard` icon+label. */
  sidebarNavVariant?: SidebarNavVariant
}

export function PortalShell({
  children,
  showStudentBar = false,
  showSidebar = true,
  showPortalBanner = false,
  dashboardHome = false,
  sidebarNavVariant = 'internal',
}: PortalShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null)
  const wasDrawerOpenRef = useRef(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 769px)')
    const closeOnDesktop = () => {
      if (mq.matches) setMobileNavOpen(false)
    }
    mq.addEventListener('change', closeOnDesktop)
    return () => mq.removeEventListener('change', closeOnDesktop)
  }, [])

  useEffect(() => {
    if (!mobileNavOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [mobileNavOpen])

  useEffect(() => {
    if (mobileNavOpen) {
      wasDrawerOpenRef.current = true
      const closeBtn = document.getElementById(PORTAL_MOBILE_DRAWER_CLOSE_ID) as HTMLButtonElement | null
      closeBtn?.focus()
    } else if (wasDrawerOpenRef.current) {
      wasDrawerOpenRef.current = false
      if (window.matchMedia('(max-width: 768px)').matches) {
        mobileMenuButtonRef.current?.focus()
      }
    }
  }, [mobileNavOpen])

  const closeMobileNav = () => setMobileNavOpen(false)
  const toggleMobileNav = () => setMobileNavOpen((open) => !open)

  const shellClass = ['portal-shell', 'portal-shell--authenticated']
  if (!showSidebar) shellClass.push('portal-shell--no-sidebar')
  if (showPortalBanner) shellClass.push('portal-shell--with-banner')
  else shellClass.push('portal-shell--without-banner')
  if (dashboardHome) shellClass.push('portal-shell--dashboard-home')

  return (
    <div className={shellClass.join(' ')}>
      <TopBar
        ref={mobileMenuButtonRef}
        mobileMenuOpen={mobileNavOpen}
        onMobileMenuToggle={toggleMobileNav}
        showPortalBanner={showPortalBanner}
      />
      {showSidebar ? <Sidebar variant={sidebarNavVariant} /> : null}
      <PortalMobileNavDrawer open={mobileNavOpen} onClose={closeMobileNav}>
        <SidebarNavList variant={sidebarNavVariant} onItemClick={closeMobileNav} />
      </PortalMobileNavDrawer>
      <div className="portal-main">
        {showStudentBar ? <PortalStudentInfoBar /> : null}
        <div className="portal-main-body">{children}</div>
      </div>
    </div>
  )
}
