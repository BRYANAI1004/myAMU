import { useEffect, useState } from 'react'
import {
  fetchAdminFinanceLedger,
  fetchAdminFinanceQuarters,
  postAdminFinanceCharge,
  postAdminFinancePayment,
  type AccountingLedgerResponse,
  type AccountingQuarterOption,
} from '../../lib/api'
import { formatMoney } from '../../lib/formatMoney'

type Props = {
  studentId: string
  onRosterRefresh: () => void
}

function moneyColumn(n: number): string {
  if (!Number.isFinite(n) || n === 0) return '—'
  return formatMoney(n)
}

function textOrDash(s: string): string {
  const t = s.trim()
  return t === '' ? '—' : t
}

type ChargeCategory = 'fees' | 'other' | 'tuition' | 'clinical'

export function AdminFinanceLedgerPanel({
  studentId,
  onRosterRefresh,
}: Props) {
  const [quarters, setQuarters] = useState<AccountingQuarterOption[]>([])
  const [qi, setQi] = useState(0)
  const [qBusy, setQBusy] = useState(true)
  const [qErr, setQErr] = useState<string | null>(null)

  const [ledger, setLedger] = useState<AccountingLedgerResponse | null>(null)
  const [lBusy, setLBusy] = useState(false)
  const [lErr, setLErr] = useState<string | null>(null)

  const [chargeOpen, setChargeOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)

  const [chargeDesc, setChargeDesc] = useState('')
  const [chargeAmount, setChargeAmount] = useState('')
  const [chargeCategory, setChargeCategory] = useState<ChargeCategory>('fees')
  const [chargeErr, setChargeErr] = useState<string | null>(null)
  const [chargeSubmitting, setChargeSubmitting] = useState(false)

  const [payAmount, setPayAmount] = useState('')
  const [payPaidAt, setPayPaidAt] = useState(() =>
    new Date().toISOString().slice(0, 10),
  )
  const [payMethod, setPayMethod] = useState('admin')
  const [payDescription, setPayDescription] = useState(
    'Admin recorded payment',
  )
  const [payErr, setPayErr] = useState<string | null>(null)
  const [paySubmitting, setPaySubmitting] = useState(false)

  const safeQi = Math.min(qi, Math.max(0, quarters.length - 1))
  const selectedQuarter = quarters[safeQi] ?? null

  useEffect(() => {
    const ac = new AbortController()
    setQBusy(true)
    setQErr(null)
    setQuarters([])
    setQi(0)
    setLedger(null)
    setLErr(null)
    ;(async () => {
      try {
        const res = await fetchAdminFinanceQuarters(studentId, {
          signal: ac.signal,
        })
        if (ac.signal.aborted) return
        setQuarters(res.quarters)
      } catch (e) {
        if (!ac.signal.aborted) {
          setQuarters([])
          setQErr(
            e instanceof Error
              ? e.message
              : 'Could not load quarters for this student.',
          )
        }
      } finally {
        if (!ac.signal.aborted) setQBusy(false)
      }
    })()
    return () => ac.abort()
  }, [studentId])

  useEffect(() => {
    if (quarters.length === 0) {
      setLedger(null)
      return
    }
    const q = quarters[safeQi]!
    let cancelled = false
    setLBusy(true)
    setLErr(null)
    ;(async () => {
      try {
        const led = await fetchAdminFinanceLedger(studentId, q.term, q.year)
        if (cancelled) return
        setLedger(led)
      } catch (e) {
        if (cancelled) return
        setLedger(null)
        setLErr(
          e instanceof Error
            ? e.message
            : 'Could not load ledger for this quarter.',
        )
      } finally {
        if (!cancelled) setLBusy(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [studentId, safeQi, quarters])

  async function reloadLedgerForSelection() {
    const q = quarters[safeQi]
    if (q == null) return
    setLBusy(true)
    setLErr(null)
    try {
      const led = await fetchAdminFinanceLedger(studentId, q.term, q.year)
      setLedger(led)
    } catch (e) {
      setLedger(null)
      setLErr(
        e instanceof Error ? e.message : 'Could not load ledger for this quarter.',
      )
    } finally {
      setLBusy(false)
    }
  }

  function openChargeModal() {
    setChargeErr(null)
    setChargeDesc('')
    setChargeAmount('')
    setChargeCategory('fees')
    setChargeOpen(true)
  }

  function openPaymentModal() {
    setPayErr(null)
    setPayAmount('')
    setPayPaidAt(new Date().toISOString().slice(0, 10))
    setPayMethod('admin')
    setPayDescription('Admin recorded payment')
    setPaymentOpen(true)
  }

  async function submitCharge() {
    if (selectedQuarter == null) return
    setChargeErr(null)
    const desc = chargeDesc.trim()
    const amt = Number(chargeAmount)
    if (desc === '') {
      setChargeErr('Description is required.')
      return
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      setChargeErr('Amount must be a number greater than zero.')
      return
    }
    setChargeSubmitting(true)
    try {
      await postAdminFinanceCharge({
        studentId,
        term: selectedQuarter.term,
        year: selectedQuarter.year,
        description: desc,
        amount: amt,
        category: chargeCategory,
      })
      setChargeOpen(false)
      onRosterRefresh()
      await reloadLedgerForSelection()
    } catch (e) {
      setChargeErr(
        e instanceof Error ? e.message : 'Could not post charge.',
      )
    } finally {
      setChargeSubmitting(false)
    }
  }

  async function submitPayment() {
    if (selectedQuarter == null) return
    setPayErr(null)
    const amt = Number(payAmount)
    if (!Number.isFinite(amt) || amt <= 0) {
      setPayErr('Amount must be a number greater than zero.')
      return
    }
    const paid = payPaidAt.trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paid)) {
      setPayErr('Paid date must be YYYY-MM-DD.')
      return
    }
    const method = payMethod.trim()
    if (method === '') {
      setPayErr('Method is required.')
      return
    }
    setPaySubmitting(true)
    try {
      await postAdminFinancePayment({
        studentId,
        term: selectedQuarter.term,
        year: selectedQuarter.year,
        amount: amt,
        paidAt: paid,
        method,
        description: payDescription.trim() || 'Admin recorded payment',
      })
      setPaymentOpen(false)
      onRosterRefresh()
      await reloadLedgerForSelection()
    } catch (e) {
      setPayErr(
        e instanceof Error ? e.message : 'Could not record payment.',
      )
    } finally {
      setPaySubmitting(false)
    }
  }

  const panelBusy = qBusy || lBusy
  const noQuarters = !qBusy && quarters.length === 0

  return (
    <div className="admin-finance-expand">
      <div className="admin-finance-expand__toolbar">
        <label className="admin-finance-expand__quarter">
          <span className="portal-text-muted admin-form-hint">Quarter</span>
          <select
            className="admin-input"
            value={quarters.length === 0 ? '' : String(safeQi)}
            disabled={qBusy || quarters.length === 0}
            onChange={(e) => setQi(Number(e.target.value))}
            aria-label="Select quarter"
          >
            {quarters.map((opt, i) => (
              <option key={`${opt.term}-${opt.year}`} value={String(i)}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="portal-btn portal-btn--secondary portal-btn--compact"
          disabled={noQuarters || panelBusy}
          onClick={openChargeModal}
        >
          Post Charge
        </button>
        <button
          type="button"
          className="portal-btn portal-btn--primary portal-btn--compact"
          disabled={noQuarters || panelBusy}
          onClick={openPaymentModal}
        >
          Record Payment
        </button>
      </div>

      {qErr != null ? (
        <p className="admin-form-message" role="alert">
          {qErr}
        </p>
      ) : null}

      {noQuarters && qErr == null ? (
        <p className="portal-text-muted">
          No ledger quarters on file for this student (no legacy accounting or
          portal enrollments yet).
        </p>
      ) : null}

      {lErr != null ? (
        <p className="admin-form-message" role="alert">
          {lErr}
        </p>
      ) : null}

      {panelBusy && !qErr ? (
        <p className="portal-text-muted" aria-live="polite">
          Loading ledger…
        </p>
      ) : null}

      {!panelBusy && ledger != null ? (
        <div className="portal-table-wrap admin-table-wrap">
          <table className="portal-table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Type</th>
                <th scope="col">Code</th>
                <th scope="col">Description</th>
                <th scope="col" className="admin-table-numeric">
                  Charge
                </th>
                <th scope="col" className="admin-table-numeric">
                  Payment
                </th>
              </tr>
            </thead>
            <tbody>
              {ledger.rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="portal-text-muted">
                    No rows for this quarter.
                  </td>
                </tr>
              ) : (
                ledger.rows.map((r, idx) => (
                  <tr key={`${r.date}-${r.type}-${r.code}-${idx}`}>
                    <td>{textOrDash(r.date)}</td>
                    <td>{textOrDash(r.type)}</td>
                    <td>
                      <code className="admin-code">{textOrDash(r.code)}</code>
                    </td>
                    <td>{textOrDash(r.memo)}</td>
                    <td className="admin-table-numeric">{moneyColumn(r.debit)}</td>
                    <td className="admin-table-numeric">
                      {moneyColumn(r.credit)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="admin-finance-totals__label">
                  <strong>Total Charges</strong>
                </td>
                <td className="admin-table-numeric">
                  <strong>{formatMoney(ledger.summary.totalCharges)}</strong>
                </td>
                <td className="admin-table-numeric">—</td>
              </tr>
              <tr>
                <td colSpan={4} className="admin-finance-totals__label">
                  <strong>Total Payments</strong>
                </td>
                <td className="admin-table-numeric">—</td>
                <td className="admin-table-numeric">
                  <strong>{formatMoney(ledger.summary.totalPayments)}</strong>
                </td>
              </tr>
              <tr>
                <td colSpan={4} className="admin-finance-totals__label">
                  <strong>Balance</strong>
                </td>
                <td className="admin-table-numeric" colSpan={2}>
                  <strong>{formatMoney(ledger.summary.balance)}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : null}

      {chargeOpen ? (
        <div
          className="admin-section-detail-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setChargeOpen(false)
          }}
        >
          <div
            className="admin-section-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-finance-charge-title"
          >
            <h2
              id="admin-finance-charge-title"
              className="admin-section-detail-modal__title"
            >
              Post charge
            </h2>
            <p className="portal-text-muted admin-form-hint" style={{ marginTop: 0 }}>
              Posts to <code className="admin-code">portal_billing_adjustments</code>{' '}
              for {selectedQuarter?.label ?? '—'}.
            </p>
            {chargeErr != null ? (
              <p className="admin-form-message" role="alert">
                {chargeErr}
              </p>
            ) : null}
            <div className="portal-course-feedback-modal__field">
              <label htmlFor="admin-finance-charge-desc">Description</label>
              <input
                id="admin-finance-charge-desc"
                className="admin-input"
                value={chargeDesc}
                onChange={(e) => setChargeDesc(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="portal-course-feedback-modal__field">
              <label htmlFor="admin-finance-charge-amt">Amount (USD)</label>
              <input
                id="admin-finance-charge-amt"
                className="admin-input"
                type="number"
                min={0}
                step="0.01"
                value={chargeAmount}
                onChange={(e) => setChargeAmount(e.target.value)}
              />
            </div>
            <div className="portal-course-feedback-modal__field">
              <label htmlFor="admin-finance-charge-cat">Category</label>
              <select
                id="admin-finance-charge-cat"
                className="admin-input"
                value={chargeCategory}
                onChange={(e) =>
                  setChargeCategory(e.target.value as ChargeCategory)
                }
              >
                <option value="fees">fees</option>
                <option value="tuition">tuition</option>
                <option value="clinical">clinical</option>
                <option value="other">other</option>
              </select>
            </div>
            <div className="admin-section-detail-modal__actions">
              <button
                type="button"
                className="portal-btn portal-btn--secondary portal-btn--compact"
                disabled={chargeSubmitting}
                onClick={() => setChargeOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="portal-btn portal-btn--primary portal-btn--compact"
                disabled={chargeSubmitting}
                onClick={() => void submitCharge()}
              >
                {chargeSubmitting ? 'Saving…' : 'Post charge'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {paymentOpen ? (
        <div
          className="admin-section-detail-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPaymentOpen(false)
          }}
        >
          <div
            className="admin-section-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-finance-pay-title"
          >
            <h2
              id="admin-finance-pay-title"
              className="admin-section-detail-modal__title"
            >
              Record payment
            </h2>
            <p className="portal-text-muted admin-form-hint" style={{ marginTop: 0 }}>
              Inserts into <code className="admin-code">portal_payments</code> for{' '}
              {selectedQuarter?.label ?? '—'}.
            </p>
            {payErr != null ? (
              <p className="admin-form-message" role="alert">
                {payErr}
              </p>
            ) : null}
            <div className="portal-course-feedback-modal__field">
              <label htmlFor="admin-finance-pay-amt">Amount (USD)</label>
              <input
                id="admin-finance-pay-amt"
                className="admin-input"
                type="number"
                min={0}
                step="0.01"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </div>
            <div className="portal-course-feedback-modal__field">
              <label htmlFor="admin-finance-pay-date">Paid date</label>
              <input
                id="admin-finance-pay-date"
                className="admin-input"
                type="date"
                value={payPaidAt}
                onChange={(e) => setPayPaidAt(e.target.value)}
              />
            </div>
            <div className="portal-course-feedback-modal__field">
              <label htmlFor="admin-finance-pay-method">Method</label>
              <input
                id="admin-finance-pay-method"
                className="admin-input"
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="portal-course-feedback-modal__field">
              <label htmlFor="admin-finance-pay-desc">Description</label>
              <input
                id="admin-finance-pay-desc"
                className="admin-input"
                value={payDescription}
                onChange={(e) => setPayDescription(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="admin-section-detail-modal__actions">
              <button
                type="button"
                className="portal-btn portal-btn--secondary portal-btn--compact"
                disabled={paySubmitting}
                onClick={() => setPaymentOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="portal-btn portal-btn--primary portal-btn--compact"
                disabled={paySubmitting}
                onClick={() => void submitPayment()}
              >
                {paySubmitting ? 'Saving…' : 'Record payment'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
