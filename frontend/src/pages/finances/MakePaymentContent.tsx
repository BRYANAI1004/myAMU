import { useMemo, useState } from 'react'
import { useAccount } from '../../context/AccountContext'
import { useStudentPortalT } from '../../LanguageContext'
import { CARD_CONVENIENCE_RATE } from '../../lib/api'
import {
  lateFeeFromLineItems,
  nextInstallmentRow,
  portalTermLabel,
  toInstallmentRows,
} from '../../lib/accountDisplay'
import { formatMoney } from '../../lib/formatMoney'

function roundMoney(n: number) {
  return Math.round(n * 100) / 100
}

/** Make a payment UI shared by Finances payment route and legacy `/payment`. */
export function MakePaymentContent() {
  const t = useStudentPortalT()
  const { account } = useAccount()
  const [paymentOption, setPaymentOption] = useState<'full-balance' | 'installment'>('full-balance')
  const [paymentMethod, setPaymentMethod] = useState<'ach' | 'credit-card'>('ach')

  const isFullBalance = paymentOption === 'full-balance'
  const isCreditCard = paymentMethod === 'credit-card'

  const { summary, lineItems, installmentPlan } = account
  const installmentRows = toInstallmentRows(installmentPlan.schedule)
  const lateFee = lateFeeFromLineItems(lineItems)
  const nextDue = nextInstallmentRow(installmentRows)

  const fullSelected = summary.outstandingBalance
  const installmentSelected = nextDue?.amount ?? 0
  const basePayToday = isFullBalance ? fullSelected : installmentSelected
  const convenienceFee = isCreditCard ? roundMoney(basePayToday * CARD_CONVENIENCE_RATE) : 0
  const totalDueToday = roundMoney(basePayToday + convenienceFee)

  const termLabel = portalTermLabel(account)
  const pctStr = (CARD_CONVENIENCE_RATE * 100).toFixed(2)
  const convenienceNote = useMemo(
    () => t('convenienceFeePercentNote').replace('{pct}', pctStr),
    [t, pctStr],
  )
  const lede = useMemo(
    () => t('makePaymentLede').replace('{termLabel}', termLabel),
    [t, termLabel],
  )

  return (
    <>
      <p className="portal-page-lede">
        {lede}
      </p>

      <section className="portal-card portal-stack" aria-labelledby="payment-option-heading">
        <h2 id="payment-option-heading" className="portal-section-heading">
          {t('paymentOptionHeading')}
        </h2>
        <div className="portal-actions">
          <button
            type="button"
            className={`portal-btn ${isFullBalance ? 'portal-btn--primary' : 'portal-btn--secondary'}`}
            onClick={() => setPaymentOption('full-balance')}
            aria-pressed={isFullBalance}
          >
            {t('payFullBalance')}
          </button>
          <button
            type="button"
            className={`portal-btn ${!isFullBalance ? 'portal-btn--primary' : 'portal-btn--secondary'}`}
            onClick={() => setPaymentOption('installment')}
            aria-pressed={!isFullBalance}
            disabled={!installmentPlan.enabled}
          >
            {t('useInstallmentPlan')}
          </button>
        </div>
        {!installmentPlan.enabled ? (
          <p className="portal-inline-note">
            {t('notOnInstallmentPlanNote')}
          </p>
        ) : null}
      </section>

      <section className="portal-card portal-stack" aria-labelledby="payment-summary-heading">
        <h2 id="payment-summary-heading" className="portal-section-heading">
          {t('paymentSummaryHeading')}
        </h2>
        <dl>
          {isFullBalance ? (
            <>
              <div className="portal-row">
                <dt>{t('totalChargesTerm')}</dt>
                <dd>{formatMoney(summary.totalCharges)}</dd>
              </div>
              <div className="portal-row">
                <dt>{t('paymentsAndCredits')}</dt>
                <dd>{formatMoney(summary.payments)}</dd>
              </div>
              {lateFee > 0 ? (
                <div className="portal-row portal-row--fee-warning">
                  <dt>{t('lateFee')}</dt>
                  <dd>{formatMoney(lateFee)}</dd>
                </div>
              ) : null}
              <div className="portal-row">
                <dt>{t('currentOutstandingBalance')}</dt>
                <dd>{formatMoney(summary.outstandingBalance)}</dd>
              </div>
              <div className="portal-row">
                <dt>{t('selectedPaymentAmount')}</dt>
                <dd>{formatMoney(fullSelected)}</dd>
              </div>
              <div className="portal-row">
                <dt>{t('paymentMethodLabel')}</dt>
                <dd>{isCreditCard ? t('creditCardVisaDemo') : t('achBankTransfer')}</dd>
              </div>
              {isCreditCard ? (
                <div className="portal-row">
                  <dt>{t('convenienceFee')}</dt>
                  <dd>
                    {formatMoney(convenienceFee)} {convenienceNote}
                  </dd>
                </div>
              ) : null}
              <div className="portal-row portal-payment-total">
                <dt>{t('totalDueToday')}</dt>
                <dd>{formatMoney(totalDueToday)}</dd>
              </div>
            </>
          ) : (
            <>
              <div className="portal-row">
                <dt>{t('currentInstallmentDue')}</dt>
                <dd>{nextDue ? formatMoney(nextDue.amount) : formatMoney(0)}</dd>
              </div>
              <div className="portal-row">
                <dt>{t('selectedPaymentAmount')}</dt>
                <dd>{formatMoney(installmentSelected)}</dd>
              </div>
              <div className="portal-row">
                <dt>{t('paymentMethodLabel')}</dt>
                <dd>{isCreditCard ? t('creditCardVisaDemo') : t('achBankTransfer')}</dd>
              </div>
              {isCreditCard ? (
                <div className="portal-row">
                  <dt>{t('convenienceFee')}</dt>
                  <dd>
                    {formatMoney(convenienceFee)} {convenienceNote}
                  </dd>
                </div>
              ) : null}
              <div className="portal-row portal-payment-total">
                <dt>{t('totalDueToday')}</dt>
                <dd>{formatMoney(totalDueToday)}</dd>
              </div>
            </>
          )}
        </dl>
      </section>

      <section className="portal-card portal-stack" aria-labelledby="payment-method-heading">
        <h2 id="payment-method-heading" className="portal-section-heading">
          {t('paymentMethodHeading')}
        </h2>
        <div className="portal-actions">
          <button
            type="button"
            className={`portal-btn ${!isCreditCard ? 'portal-btn--primary' : 'portal-btn--secondary'}`}
            onClick={() => setPaymentMethod('ach')}
            aria-pressed={!isCreditCard}
          >
            {t('achBankTransfer')}
          </button>
          <button
            type="button"
            className={`portal-btn ${isCreditCard ? 'portal-btn--primary' : 'portal-btn--secondary'}`}
            onClick={() => setPaymentMethod('credit-card')}
            aria-pressed={isCreditCard}
          >
            {t('creditCard')}
          </button>
        </div>
      </section>

      <p className="portal-inline-note">
        {t('achFeeNote')}
      </p>
    </>
  )
}
