import { Link, useLocation } from 'react-router-dom'
import type { ComponentType, SVGProps } from 'react'
import { useStudentPortalT } from '@/LanguageContext'
import type { StudentPortalKey } from '@/lib/i18n'
import {
  IconAcademics,
  IconDocument,
  IconFeesStore,
  IconFinance,
  IconMyAccount,
  IconRegistration,
} from './icons/PortalModuleIcons'

function navClassName(isActive: boolean) {
  return ['portal-nav-link', 'sidebar-item', isActive ? 'portal-nav-link--active' : '']
    .filter(Boolean)
    .join(' ')
}

function isMainNavActive(pathname: string, to: string): boolean {
  if (to === '/finances/store') {
    return pathname.startsWith('/finances/store')
  }
  if (to === '/finances') {
    return pathname.startsWith('/finances') && !pathname.startsWith('/finances/store')
  }
  return pathname === to || pathname.startsWith(`${to}/`)
}

type NavItem = {
  to: string
  labelKey: StudentPortalKey
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

const SERVICE_NAV_ITEMS: readonly NavItem[] = [
  { to: '/registration', labelKey: 'registrationModule', icon: IconRegistration },
  { to: '/finances', labelKey: 'finances', icon: IconFinance },
  { to: '/academics', labelKey: 'academics', icon: IconAcademics },
  { to: '/documents', labelKey: 'documents', icon: IconDocument },
  { to: '/finances/store', labelKey: 'feesAndServices', icon: IconFeesStore },
]

const ACCOUNT_NAV_ITEMS: readonly NavItem[] = [
  { to: '/profile', labelKey: 'myAccount', icon: IconMyAccount },
]

const MAIN_NAV_ITEMS: readonly NavItem[] = [...SERVICE_NAV_ITEMS, ...ACCOUNT_NAV_ITEMS]

/** `dashboard` = module icons (e.g. entry nav). `internal` = branded red sidebar with grouped nav. */
export type SidebarNavVariant = 'dashboard' | 'internal'

type SidebarNavListProps = {
  onItemClick?: () => void
  variant?: SidebarNavVariant
}

type SidebarNavLinkProps = {
  item: NavItem
  active: boolean
  onClick?: () => void
}

function SidebarNavLink({ item, active, onClick }: SidebarNavLinkProps) {
  const t = useStudentPortalT()
  const Icon = item.icon
  const label = t(item.labelKey)

  return (
    <Link
      to={item.to}
      className={navClassName(active)}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      <span className="portal-nav-link-icon" aria-hidden>
        <Icon width={18} height={18} />
      </span>
      <span className="portal-nav-link-label">{label}</span>
    </Link>
  )
}

function SidebarNavItems({
  items,
  pathname,
  onItemClick,
}: {
  items: readonly NavItem[]
  pathname: string
  onItemClick?: () => void
}) {
  return (
    <>
      {items.map((item) => (
        <li key={item.to}>
          <SidebarNavLink
            item={item}
            active={isMainNavActive(pathname, item.to)}
            onClick={onItemClick}
          />
        </li>
      ))}
    </>
  )
}

export function SidebarNavList({ onItemClick, variant = 'internal' }: SidebarNavListProps) {
  const t = useStudentPortalT()
  const { pathname } = useLocation()
  const handleClick = () => {
    onItemClick?.()
  }

  if (variant === 'internal') {
    return (
      <div className="portal-sidebar-nav-groups">
        <div className="portal-sidebar-nav-group">
          <p className="portal-sidebar-nav-group-label">{t('services')}</p>
          <ul className="portal-sidebar-nav-list">
            <SidebarNavItems items={SERVICE_NAV_ITEMS} pathname={pathname} onItemClick={handleClick} />
          </ul>
        </div>
        <div className="portal-sidebar-nav-group portal-sidebar-nav-group--account">
          <ul className="portal-sidebar-nav-list">
            <SidebarNavItems items={ACCOUNT_NAV_ITEMS} pathname={pathname} onItemClick={handleClick} />
          </ul>
        </div>
      </div>
    )
  }

  return (
    <ul className="portal-sidebar-nav-list">
      <SidebarNavItems items={MAIN_NAV_ITEMS} pathname={pathname} onItemClick={handleClick} />
    </ul>
  )
}

type SidebarProps = {
  variant?: SidebarNavVariant
}

/** Fixed left sidebar — visible on desktop only (see `portal.css`). */
export function Sidebar({ variant = 'internal' }: SidebarProps) {
  const t = useStudentPortalT()
  return (
    <aside
      className={['portal-sidebar', 'portal-sidebar--desktop', `portal-sidebar--nav-${variant}`].join(' ')}
      aria-label={t('mainNavigationAria')}
    >
      <nav className="portal-sidebar-nav" aria-label={t('portalModulesAria')}>
        <SidebarNavList variant={variant} />
      </nav>
    </aside>
  )
}
