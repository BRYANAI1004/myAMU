import { useStudentPortalT } from '@/LanguageContext'
import { AccountingLedgerSection } from './AccountingLedgerSection'

export function FinancesOverviewPage() {
  const t = useStudentPortalT()
  return (
    <main className="portal-page portal-stack portal-finances-overview">
      <h2 className="portal-page-title portal-finances-overview__title">{t('overview')}</h2>
      <AccountingLedgerSection />
    </main>
  )
}
