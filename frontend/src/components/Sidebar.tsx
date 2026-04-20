import { NavLink } from 'react-router-dom'
import type { ComponentType, SVGProps } from 'react'
import { useStudentPortalT } from '@/LanguageContext'
import type { StudentPortalKey } from '@/lib/i18n'
import {
  IconAcademics,
  IconDocument,
  IconFinance,
  IconMyAccount,
  IconRegistration,
} from './icons/PortalModuleIcons'

function navClassName(isActive: boolean) {
  return ['portal-nav-link', 'sidebar-item', isActive ? 'portal-nav-link--active' : '']
    .filter(Boolean)
    .join(' ')
}

const MAIN_NAV_ITEMS: readonly {
  to: string
  labelKey: StudentPortalKey
  icon: ComponentType<SVGProps<SVGSVGElement>>
}[] = [
  { to: '/registration', labelKey: 'registrationModule', icon: IconRegistration },
  { to: '/finances', labelKey: 'finances', icon: IconFinance },
  { to: '/academics', labelKey: 'academics', icon: IconAcademics },
  { to: '/documents', labelKey: 'documents', icon: IconDocument },
  { to: '/profile', labelKey: 'myAccount', icon: IconMyAccount },
]

/** `dashboard` = module icons (e.g. entry nav). `internal` = text-only sidebar / drawer. */
export type SidebarNavVariant = 'dashboard' | 'internal'

type SidebarNavListProps = {
  onItemClick?: () => void
  variant?: SidebarNavVariant
}

export function SidebarNavList({ onItemClick, variant = 'internal' }: SidebarNavListProps) {
  const t = useStudentPortalT()
  const handleClick = () => {
    onItemClick?.()
  }

  const listClass = [
    'portal-sidebar-nav-list',
    variant === 'internal' ? 'portal-sidebar-nav-list--text-only' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <ul className={listClass}>
      {MAIN_NAV_ITEMS.map((item) => {
        const Icon = item.icon
        const label = t(item.labelKey)
        return (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) => navClassName(isActive)}
              onClick={handleClick}
            >
              {variant === 'dashboard' ? (
                <span className="portal-nav-link-icon">
                  <Icon width={20} height={20} />
                </span>
              ) : null}
              {label}
            </NavLink>
          </li>
        )
      })}
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
