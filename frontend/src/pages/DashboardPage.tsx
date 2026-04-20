import { useAccount } from '../context/AccountContext'
import { useLanguage, useStudentPortalT } from '@/LanguageContext'
import { DashboardCoursesWidget } from './dashboard/DashboardCoursesWidget'
import { DashboardCurrentPostedTerm } from './dashboard/DashboardCurrentPostedTerm'
import { DashboardServiceLauncher } from './dashboard/DashboardServiceLauncher'
import { PwaInstallCard } from '../components/PwaInstallCard'

/** Prefer given name when legacy uses "Last, First"; otherwise first token of the display name. */
function welcomeNameFromDisplay(name: string): string {
  const t = name.trim()
  if (!t) return ''
  const comma = t.indexOf(',')
  if (comma !== -1) {
    const rest = t.slice(comma + 1).trim()
    return rest || t
  }
  const first = t.split(/\s+/)[0]
  return first ?? t
}

export function DashboardPage() {
  const { locale } = useLanguage()
  const t = useStudentPortalT()
  const { account, loading, isAuthenticated } = useAccount()
  const displayName = account.student.name?.trim() ?? ''
  const welcome =
    loading && isAuthenticated
      ? t('welcomeLoading')
      : welcomeNameFromDisplay(displayName) || t('studentFallback')
  const today = new Date()
  const dateIso = today.toISOString().slice(0, 10)
  const dateLabel = today.toLocaleDateString(locale === 'zh' ? 'zh-TW' : 'en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <main className="portal-page portal-dashboard">
      <header className="portal-dashboard-hero">
        <div className="portal-dashboard-hero__title-row">
          <h1 className="portal-dashboard-hero-title">
            <span className="portal-dashboard-hero-welcome">{t('welcomePrefix')}</span>{' '}
            <span className="portal-dashboard-hero-name">{welcome}</span>
          </h1>
        </div>
        <time className="portal-dashboard-hero-date" dateTime={dateIso}>
          {dateLabel}
        </time>
        <PwaInstallCard />
      </header>

      <div className="portal-dashboard-current-term-slot">
        <DashboardCurrentPostedTerm />
      </div>

      <div className="portal-dashboard-home-grid">
        <div className="portal-dashboard-home-primary">
          <DashboardServiceLauncher />
        </div>
        <div className="portal-dashboard-home-aside">
          <DashboardCoursesWidget />
        </div>
      </div>
    </main>
  )
}
