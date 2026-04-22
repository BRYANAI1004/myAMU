import { formatMoney } from '@/lib/formatMoney'

type PaymentSummaryCardProps = {
  studentName: string
  studentId: string
  termLabel: string
  balanceDue: number
  amountToPay: number
}

export function PaymentSummaryCard({
  studentName,
  studentId,
  termLabel,
  balanceDue,
  amountToPay,
}: PaymentSummaryCardProps) {
  return (
    <section className="portal-card portal-finance-checkout-card" aria-labelledby="payment-summary-title">
      <header className="portal-finance-checkout-card__header">
        <h2 id="payment-summary-title" className="portal-section-heading">
          Payment Summary
        </h2>
      </header>
      <dl className="portal-finance-checkout-summary">
        <div className="portal-finance-checkout-summary__row">
          <dt>Student</dt>
          <dd>{studentName}</dd>
        </div>
        <div className="portal-finance-checkout-summary__row">
          <dt>Student ID</dt>
          <dd>{studentId}</dd>
        </div>
        <div className="portal-finance-checkout-summary__row">
          <dt>Term</dt>
          <dd>{termLabel}</dd>
        </div>
        <div className="portal-finance-checkout-summary__row">
          <dt>Balance due</dt>
          <dd>{formatMoney(balanceDue)}</dd>
        </div>
        <div className="portal-finance-checkout-summary__row portal-finance-checkout-summary__row--strong">
          <dt>Amount to pay</dt>
          <dd>{formatMoney(amountToPay)}</dd>
        </div>
      </dl>
    </section>
  )
}
