import { Link } from 'react-router-dom'
import { useStudentPortalT } from '@/LanguageContext'
import { PageLayout } from '../components/PageLayout'
import { useAccount } from '../context/AccountContext'
import { installmentPlanDisplayLabel, portalTermLabel } from '../lib/accountDisplay'
import { formatMoney } from '../lib/formatMoney'

export function PaymentPlanPage() {
  const t = useStudentPortalT()
  const { account } = useAccount()
  const { installmentPlan, installmentPolicy, program } = account
  const planLabel = installmentPlanDisplayLabel(installmentPlan)
  const termLabel = portalTermLabel(account)

  return (
    <PageLayout>
      <main className="portal-page">
        <p className="portal-page-lede">
          {termLabel}
          {t('paymentPlanPart1')}
          {program.trim() ? program : t('yourProgram')}
          {t('paymentPlanPart2')}
          {planLabel}
          {t('paymentPlanPart3')}
        </p>

        <div className="portal-table-wrap">
          <table className="portal-table portal-table--plan">
            <caption className="visually-hidden">{t('installmentPaymentScheduleCaption')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('installment')}</th>
                <th scope="col">{t('dueDate')}</th>
                <th scope="col">{t('amount')}</th>
                <th scope="col">{t('status')}</th>
              </tr>
            </thead>
            <tbody>
              {installmentPlan.schedule.map((row, i) => (
                <tr key={row.dueDate}>
                  <td>{i + 1}</td>
                  <td>{row.dueDate}</td>
                  <td>{formatMoney(row.amount)}</td>
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="portal-plan-terms" aria-labelledby="plan-terms-heading">
          <h2 id="plan-terms-heading" className="portal-section-heading">
            {t('planTerms')}
          </h2>
          <ul className="portal-plan-terms-list">
            {installmentPolicy.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>

        <nav className="portal-actions portal-actions--spaced" aria-label={t('pageActionsAria')}>
          <Link className="portal-btn portal-btn--primary" to="/finances/overview">
            {t('backToFinances')}
          </Link>
        </nav>
      </main>
    </PageLayout>
  )
}
