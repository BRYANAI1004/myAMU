import { Outlet, useLocation } from 'react-router-dom'
import { AIAssistantLauncher } from './ai/AIAssistantLauncher'
import { AIAssistantProvider } from './ai/AIAssistantProvider'
import { StudentPortalTermProvider } from '../context/StudentPortalTermContext'
import { deriveAIAssistantPageContext } from '../data/aiMockReplies'
import { PortalShell } from './PortalShell'

function isDashboardRoute(pathname: string) {
  return pathname === '/dashboard' || pathname === '/dashboard/'
}

/** Layout route wrapper for authenticated portal modules. Internal modules omit the student account strip and myAMU banner. */
export function PortalLayout() {
  const { pathname } = useLocation()
  const isDashboard = isDashboardRoute(pathname)
  const showStudentBar = false
  const showSidebar = !isDashboard
  /** myAMU strip only on the dashboard; internal module pages use the gold bar only (+ compact header height). */
  const showPortalBanner = isDashboard

  const assistantPageContext = deriveAIAssistantPageContext(pathname)

  return (
    <StudentPortalTermProvider>
      <AIAssistantProvider pageContext={assistantPageContext}>
        <PortalShell
          showStudentBar={showStudentBar}
          showSidebar={showSidebar}
          showPortalBanner={showPortalBanner}
          dashboardHome={isDashboard}
          internalModuleLayout={!isDashboard}
          sidebarNavVariant="internal"
        >
          <Outlet />
        </PortalShell>
        <AIAssistantLauncher />
      </AIAssistantProvider>
    </StudentPortalTermProvider>
  )
}
