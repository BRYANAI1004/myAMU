import { AIAssistantLauncher } from '../../components/ai/AIAssistantLauncher'
import { AccountingLedgerSection } from './AccountingLedgerSection'
import { AccountSummaryContent } from './AccountSummaryContent'

export function FinancesOverviewPage() {
  return (
    <main className="portal-page portal-stack">
      <AccountSummaryContent />
      <AccountingLedgerSection />
      <AIAssistantLauncher pageContext="finances" />
    </main>
  )
}
