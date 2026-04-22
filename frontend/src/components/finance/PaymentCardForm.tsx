import type { FormEvent } from 'react'
import { CreditCard, Lock, ShieldCheck } from 'lucide-react'

type PaymentCardFormProps = {
  amount: string
  cardNumber: string
  expMonth: string
  expYear: string
  cvv: string
  allowPartialPayment: boolean
  busy: boolean
  scriptReady: boolean
  error: string | null
  onAmountChange: (next: string) => void
  onCardNumberChange: (next: string) => void
  onExpMonthChange: (next: string) => void
  onExpYearChange: (next: string) => void
  onCvvChange: (next: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onCancel: () => void
}

export function PaymentCardForm({
  amount,
  cardNumber,
  expMonth,
  expYear,
  cvv,
  allowPartialPayment,
  busy,
  scriptReady,
  error,
  onAmountChange,
  onCardNumberChange,
  onExpMonthChange,
  onExpYearChange,
  onCvvChange,
  onSubmit,
  onCancel,
}: PaymentCardFormProps) {
  return (
    <section className="portal-card portal-finance-checkout-card" aria-labelledby="payment-form-title">
      <header className="portal-finance-checkout-card__header portal-finance-checkout-card__header--form">
        <div>
          <h2 id="payment-form-title" className="portal-section-heading">
            Card Payment
          </h2>
          <p className="portal-finance-checkout-form__subhead">Use a credit or debit card to complete payment.</p>
        </div>
        <div className="portal-finance-checkout-form__brands" aria-label="Accepted card networks">
          <span>VISA</span>
          <span>Mastercard</span>
          <span>AmEx</span>
          <span>Discover</span>
        </div>
      </header>

      <form className="portal-finance-checkout-form" onSubmit={onSubmit}>
        <label className="portal-finance-checkout-form__field">
          <span>Card number</span>
          <div className="portal-finance-checkout-form__input-wrap">
            <CreditCard size={16} aria-hidden="true" />
            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-number"
              maxLength={19}
              value={cardNumber}
              onChange={(event) => onCardNumberChange(event.target.value)}
              disabled={busy}
              required
            />
          </div>
        </label>

        <div className="portal-finance-checkout-form__triple">
          <label className="portal-finance-checkout-form__field">
            <span>Exp. month</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-exp-month"
              placeholder="MM"
              maxLength={2}
              value={expMonth}
              onChange={(event) => onExpMonthChange(event.target.value)}
              disabled={busy}
              required
            />
          </label>
          <label className="portal-finance-checkout-form__field">
            <span>Exp. year</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-exp-year"
              placeholder="YYYY"
              maxLength={4}
              value={expYear}
              onChange={(event) => onExpYearChange(event.target.value)}
              disabled={busy}
              required
            />
          </label>
          <label className="portal-finance-checkout-form__field">
            <span>CVV</span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="cc-csc"
              maxLength={4}
              value={cvv}
              onChange={(event) => onCvvChange(event.target.value)}
              disabled={busy}
              required
            />
          </label>
        </div>

        <label className="portal-finance-checkout-form__field">
          <span>Amount to pay</span>
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
            This term requires full-balance payment. Amount is read-only.
          </p>
        ) : (
          <p className="portal-finance-checkout-form__helper">
            Partial payments are allowed up to your current balance.
          </p>
        )}

        <p className="portal-finance-checkout-form__trust">
          <Lock size={14} aria-hidden="true" />
          <span>Your payment information is securely transmitted to Authorize.net.</span>
        </p>

        {!scriptReady ? (
          <p className="portal-inline-note portal-inline-note--flush" role="status">
            Secure payment fields are loading...
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
            Back
          </button>
          <button
            type="submit"
            className="portal-btn portal-btn--primary portal-finance-checkout-form__btn"
            disabled={busy || !scriptReady}
          >
            {busy ? 'Processing...' : 'Pay Now'}
          </button>
        </div>

        <p className="portal-finance-checkout-form__secure-row">
          <ShieldCheck size={14} aria-hidden="true" />
          <span>Secure checkout</span>
        </p>
      </form>
    </section>
  )
}
