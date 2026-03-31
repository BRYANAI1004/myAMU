import type { DashboardService } from './dashboardMockData'

const SERVICE_ICON_SRC: Record<DashboardService['icon'], string> = {
  registration: '/registration.svg',
  finances: '/finance.svg',
  academics: '/academics.svg',
  clinical: '/clinical.svg',
  documents: '/document.svg',
  account: '/myaccount.svg',
}

type Props = {
  name: DashboardService['icon']
  className?: string
}

/** Official AMU service icons from `/public` — decorative only. */
export function DashboardServiceIcon({ name, className }: Props) {
  const src = SERVICE_ICON_SRC[name]
  if (!src) return null
  return (
    <img
      src={src}
      alt=""
      width={24}
      height={24}
      decoding="async"
      className={['portal-dashboard-service-icon-img', className].filter(Boolean).join(' ')}
    />
  )
}
