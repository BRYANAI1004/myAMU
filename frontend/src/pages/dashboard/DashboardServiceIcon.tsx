import type { ComponentType, SVGProps } from 'react'
import type { DashboardService } from './dashboardMockData'
import {
  IconAcademics,
  IconDocument,
  IconFeesStore,
  IconFinance,
  IconMyAccount,
  IconMyCourses,
  IconRegistration,
} from '../../components/icons/PortalModuleIcons'

const SERVICE_ICON: Record<DashboardService['icon'], ComponentType<SVGProps<SVGSVGElement>>> = {
  registration: IconRegistration,
  myCourses: IconMyCourses,
  finances: IconFinance,
  feesStore: IconFeesStore,
  academics: IconAcademics,
  documents: IconDocument,
  account: IconMyAccount,
}

type Props = {
  name: DashboardService['icon']
  className?: string
}

/** Module icons — `currentColor` inherits from the service tile row. */
export function DashboardServiceIcon({ name, className }: Props) {
  const Cmp = SERVICE_ICON[name]
  if (!Cmp) return null
  return (
    <span
      className={['portal-dashboard-service-icon-root', className].filter(Boolean).join(' ')}
      aria-hidden
    >
      <Cmp width={24} height={24} />
    </span>
  )
}
