import type { FormEvent } from 'react'
import { Lock, ShieldCheck } from 'lucide-react'
import {
  CardNetworkDetectedNote,
  CardNetworkIcons,
  useDetectedCardNetwork,
} from '@/components/finance/CardNetworkDisplay'
import { useStudentPortalT } from '@/LanguageContext'

type PaymentCardFormProps = {
  amount: string
  cardholderName: string
  cardNumber: string
  expirationDate: string
  cvv: string
  billingZip: string
  allowPartialPayment: boolean
  lockedAmountNote?: string | null
  /** Shown under the form (e.g. card processing fee policy). */
  disclosureNote?: string | null
  submitLabel?: string
  busy: boolean
  scriptReady: boolean
  error: string | null
  onAmountChange: (next: string) => void
  onCardholderNameChange: (next: string) => void
  onCardNumberChange: (next: string) => void
  onExpirationDateChange: (next: string) => void
  onCvvChange: (next: string) => void
  onBillingZipChange: (next: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onCancel: () => void
}

export function PaymentCardForm({
  amount,
  cardholderName,
  cardNumber,
  expirationDate,
  cvv,
  billingZip,
  allowPartialPayment,
  lockedAmountNote,
  disclosureNote,
  submitLabel,
  busy,
  scriptReady,
  error,
  onAmountChange,
  onCardholderNameChange,
  onCardNumberChange,
  onExpirationDateChange,
  onCvvChange,
  onBillingZipChange,
  onSubmit,
  onCancel,
}: PaymentCardFormProps) {
  const t = useStudentPortalT()
  const detectedNetwork = useDetectedCardNetwork(cardNumber)

  return (
    <section className="portal-card portal-finance-checkout-card" aria-labelledby="payment-form-title">
      <header className="portal-finance-checkout-card__header portal-finance-checkout-card__header--form">
        <div>
          <h2 id="payment-form-title" className="portal-section-heading">
            {t('cardPaymentTitle')}
          </h2>
        </div>
      </header>

      <form className="portal-finance-checkout-form" onSubmit={onSubmit}>
        <label className="portal-finance-checkout-form__field">
          <span>{t('cardholderNameLabel')}</span>
          <input
            type="text"
            autoComplete="cc-name"
            placeholder={t('cardholderNamePlaceholder')}
            maxLength={64}
            value={cardholderName}
            onChange={(event) => onCardholderNameChange(event.target.value)}
            disabled={busy}
            required
          />
          <span className="portal-finance-checkout-form__helper">{t('cardholderNameHelper')}</span>
        </label>

        <label className="portal-finance-checkout-form__field">
          <span>{t('cardNumberLabel')}</span>
          <div className="portal-finance-checkout-form__input-wrap portal-finance-checkout-form__input-wrap--card-number card-input-wrapper">
            <input
              className={[
                'card-number-input',
                detectedNetwork != null ? 'card-number-input--network-detected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              type="text"
              inputMode="numeric"
              autoComplete="cc-number"
              maxLength={19}
              value={cardNumber}
              onChange={(event) => onCardNumberChange(event.target.value)}
              disabled={busy}
              required
            />
            <CardNetworkIcons cardNumber={cardNumber} />
          </div>
          <CardNetworkDetectedNote cardNumber={cardNumber} />
        </label>

        <div className="portal-finance-checkout-form__card-meta-row">
          <label className="portal-finance-checkout-form__field">
            <span>{t('expDateLabel')}</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder={t('expDatePlaceholder')}
              maxLength={5}
              value={expirationDate}
              onChange={(event) => onExpirationDateChange(event.target.value)}
              disabled={busy}
              required
            />
          </label>
          <label className="portal-finance-checkout-form__field">
            <span>CVV</span>
            <div className="portal-finance-checkout-form__input-wrap portal-finance-checkout-form__input-wrap--cvv card-input-wrapper">
              <input
                className="cvv-input"
                type="text"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="CVC"
                maxLength={4}
                value={cvv}
                onChange={(event) => onCvvChange(event.target.value)}
                disabled={busy}
                required
              />
              <div className="portal-finance-checkout-form__trailing-icon cvv-icon" aria-hidden="true">
                <img src="/CVC.png" alt="" />
              </div>
            </div>
          </label>
          <label className="portal-finance-checkout-form__field">
            <span>{t('billingZipLabel')}</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder={t('billingZipPlaceholder')}
              maxLength={10}
              value={billingZip}
              onChange={(event) => onBillingZipChange(event.target.value)}
              disabled={busy}
              required
            />
          </label>
        </div>
        <p className="portal-finance-checkout-form__helper portal-finance-checkout-form__helper--flush">
          {t('billingZipHelper')}
        </p>

        <label className="portal-finance-checkout-form__field">
          <span>{t('paymentSummaryAmountToPay')}</span>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(event) => onAmountChange(event.target.value)}
            disabled={busy || !allowPartialPayment}
            readOnly={!allowPartialPayment}
            required
          />
        </label>

        {!allowPartialPayment ? (
          <p className="portal-finance-checkout-form__helper">
            {lockedAmountNote ?? t('amountFixedForPayment')}
          </p>
        ) : null}

        {disclosureNote != null && disclosureNote.trim() !== '' ? (
          <p className="portal-finance-checkout-form__helper portal-finance-checkout-form__disclosure">{disclosureNote}</p>
        ) : null}

        <p className="portal-finance-checkout-form__trust">
          <Lock size={14} aria-hidden="true" />
          <span>{t('secureTransmissionNotice')}</span>
        </p>

        {!scriptReady ? (
          <p className="portal-inline-note portal-inline-note--flush" role="status">
            {t('secureFieldsLoading')}
          </p>
        ) : null}

        {error ? (
          <p className="portal-inline-note portal-inline-note--flush portal-finance-checkout-form__error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="portal-finance-checkout-form__actions">
          <button
            type="button"
            className="portal-btn portal-btn--secondary portal-finance-checkout-form__btn"
            onClick={onCancel}
            disabled={busy}
          >
            {t('back')}
          </button>
          <button
            type="submit"
            className="portal-btn portal-btn--primary portal-finance-checkout-form__btn"
            disabled={busy || !scriptReady}
          >
            {busy ? t('processing') : submitLabel ?? t('payNow')}
          </button>
        </div>

        <p className="portal-finance-checkout-form__secure-row">
          <ShieldCheck size={14} aria-hidden="true" />
          <span>{t('secureCheckout')}</span>
        </p>
      </form>
    </section>
  )
}
