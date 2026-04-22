import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAccount } from '@/context/AccountContext'
import { PaymentCardForm } from '@/components/finance/PaymentCardForm'
import { PaymentSummaryCard } from '@/components/finance/PaymentSummaryCard'
import { portalTermLabel } from '@/lib/accountDisplay'
import { dispatchAcceptData, loadAcceptJs } from '@/lib/authorizeNet'
import { fetchAccountingLedger, fetchAccountingQuarters, postAuthorizeNetCharge } from '@/lib/api'
import { formatMoney } from '@/lib/formatMoney'

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

function normalizeAmountInput(v: string): string {
  const trimmed = v.trim()
  if (trimmed === '') return ''
  const normalized = trimmed.replace(/[^0-9.]/g, '')
  const parts = normalized.split('.')
  if (parts.length <= 1) return normalized
  return `${parts[0]}.${parts.slice(1).join('').slice(0, 2)}`
}

function termCodeFromQuarter(term: string, year: number): string {
  const upper = term.trim().toUpperCase()
  const suffix =
    upper.startsWith('SPR') ? 'SPR'
    : upper.startsWith('SUM') ? 'SUM'
    : upper.startsWith('FAL') ? 'FAL'
    : upper.startsWith('WIN') ? 'WIN'
    : upper.slice(0, 3) || 'TRM'
  return `${year}-${suffix}`
}

export function FinancesPaymentPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { account, currentStudentId, authToken, isAuthenticated } = useAccount()
  const [term, setTerm] = useState(() => searchParams.get('term')?.trim() ?? '')
  const [year, setYear] = useState(() => Number(searchParams.get('year') ?? NaN))
  const [termLabel, setTermLabel] = useState(() => searchParams.get('label')?.trim() ?? '')
  const [balanceDue, setBalanceDue] = useState(0)
  const [amount, setAmount] = useState('0.00')
  const [cardNumber, setCardNumber] = useState('')
  const [expMonth, setExpMonth] = useState('')
  const [expYear, setExpYear] = useState('')
  const [cvv, setCvv] = useState('')
  const [scriptReady, setScriptReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const studentId = currentStudentId?.trim() ?? ''
  const allowPartialPayment = true

  const amountNum = useMemo(() => {
    const n = Number(amount)
    return Number.isFinite(n) ? roundMoney(n) : Number.NaN
  }, [amount])

  const studentName = account.student.name?.trim() || 'Student'
  const displayStudentId = account.student.studentId?.trim() || studentId || '—'
  const displayTerm = termLabel || portalTermLabel(account) || 'Selected term'
  const termCode = termCodeFromQuarter(term, year)

  useEffect(() => {
    if (!isAuthenticated || studentId === '') {
      navigate('/finances/overview', { replace: true })
      return
    }

    const ac = new AbortController()
    setLoading(true)
    setError(null)

    ;(async () => {
      try {
        let nextTerm = term
        let nextYear = year
        let nextLabel = termLabel
        if (nextTerm === '' || !Number.isFinite(nextYear) || nextYear <= 0) {
          const quartersRes = await fetchAccountingQuarters(studentId, { signal: ac.signal })
          if (ac.signal.aborted) return
          const newest = quartersRes.quarters[0]
          if (newest == null) {
            throw new Error('No payable term found for this account.')
          }
          nextTerm = newest.term
          nextYear = newest.year
          nextLabel = newest.label
          setTerm(nextTerm)
          setYear(nextYear)
          setTermLabel(nextLabel)
        }

        const ledger = await fetchAccountingLedger(studentId, nextTerm, nextYear, { signal: ac.signal })
        if (ac.signal.aborted) return
        const nextBalance = roundMoney(Math.max(0, ledger.summary.balance))
        setBalanceDue(nextBalance)
        setAmount(nextBalance.toFixed(2))
        if (nextLabel.trim() === '') {
          setTermLabel(`${ledger.term} ${ledger.year}`.trim())
        }
      } catch (e) {
        if (ac.signal.aborted) return
        setError(e instanceof Error ? e.message : 'Unable to load payment details.')
      } finally {
        if (!ac.signal.aborted) setLoading(false)
      }
    })()

    return () => ac.abort()
  }, [isAuthenticated, navigate, studentId])

  useEffect(() => {
    let mounted = true
    setScriptReady(false)
    void loadAcceptJs()
      .then(() => {
        if (!mounted) return
        setScriptReady(true)
      })
      .catch((e) => {
        if (!mounted) return
        setError(e instanceof Error ? e.message : 'Unable to load payment script.')
      })
    return () => {
      mounted = false
    }
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting || loading) return

    const apiLoginId = String(import.meta.env.VITE_AUTHORIZE_API_LOGIN_ID ?? '').trim()
    const clientKey = String(import.meta.env.VITE_AUTHORIZE_CLIENT_KEY ?? '').trim()

    if (apiLoginId === '' || clientKey === '') {
      setError('Payment configuration is unavailable. Please contact support.')
      setCvv('')
      return
    }
    if (!scriptReady) {
      setError('Secure payment form is still loading. Please wait a moment and try again.')
      setCvv('')
      return
    }
    if (term.trim() === '' || !Number.isFinite(year)) {
      setError('Billing term is unavailable. Please return to Finances and try again.')
      setCvv('')
      return
    }
    if (balanceDue <= 0) {
      setError('There is no outstanding balance for the selected term.')
      setCvv('')
      return
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError('Enter a valid payment amount greater than 0.')
      setCvv('')
      return
    }
    if (amountNum > roundMoney(balanceDue)) {
      setError('Payment amount cannot exceed your current balance due.')
      setCvv('')
      return
    }
    if (!/^\d{13,19}$/.test(cardNumber)) {
      setError('Card number must be 13 to 19 digits.')
      setCvv('')
      return
    }
    if (!/^\d{2}$/.test(expMonth) || Number(expMonth) < 1 || Number(expMonth) > 12) {
      setError('Expiration month must be a valid MM value.')
      setCvv('')
      return
    }
    if (!/^\d{4}$/.test(expYear)) {
      setError('Expiration year must be in YYYY format.')
      setCvv('')
      return
    }
    if (!/^\d{3,4}$/.test(cvv)) {
      setError('CVV must be 3 or 4 digits.')
      setCvv('')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const opaqueData = await dispatchAcceptData({
        authData: { apiLoginID: apiLoginId, clientKey },
        cardData: { cardNumber, month: expMonth, year: expYear, cardCode: cvv },
      })
      const result = await postAuthorizeNetCharge(
        {
          term: termCode,
          amount: amountNum.toFixed(2),
          opaqueData,
        },
        { authToken: authToken?.trim() || undefined },
      )
      setCvv('')
      const successText = `Payment of ${formatMoney(Number(result.amount))} posted successfully. Ref ${result.providerTransactionId}.`
      setSuccessMessage(successText)
      window.setTimeout(() => {
        navigate('/finances/overview', {
          replace: true,
          state: {
            financePaymentToast: successText,
            financePaymentRefresh: true,
          },
        })
      }, 900)
    } catch (e) {
      setCvv('')
      setError(e instanceof Error ? e.message : 'Payment could not be processed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="portal-page portal-finance-checkout-page">
      <header className="portal-finance-checkout-page__header">
        <Link to="/finances/overview" className="portal-finance-checkout-page__back-link">
          <ChevronLeft size={16} aria-hidden="true" />
          <span>Back to Finances</span>
        </Link>
        <h2 className="portal-page-title portal-finance-checkout-page__title">Payment</h2>
        <p className="portal-page-lede portal-finance-checkout-page__subtitle">
          Complete your tuition payment securely.
        </p>
      </header>

      {loading ? (
        <p className="portal-inline-note portal-inline-note--flush" role="status">
          Loading payment details...
        </p>
      ) : null}

      {successMessage ? (
        <p className="portal-inline-note portal-inline-note--flush portal-finance-checkout-page__success" role="status">
          {successMessage}
        </p>
      ) : null}

      {!loading ? (
        <div className="portal-finance-checkout-grid">
          <PaymentSummaryCard
            studentName={studentName}
            studentId={displayStudentId}
            termLabel={displayTerm}
            balanceDue={balanceDue}
            amountToPay={Number.isFinite(amountNum) ? amountNum : 0}
          />
          <PaymentCardForm
            amount={amount}
            cardNumber={cardNumber}
            expMonth={expMonth}
            expYear={expYear}
            cvv={cvv}
            allowPartialPayment={allowPartialPayment}
            busy={submitting}
            scriptReady={scriptReady}
            error={error}
            onAmountChange={(next) => setAmount(normalizeAmountInput(next))}
            onCardNumberChange={(next) => setCardNumber(next.replace(/\D/g, ''))}
            onExpMonthChange={(next) => setExpMonth(next.replace(/\D/g, ''))}
            onExpYearChange={(next) => setExpYear(next.replace(/\D/g, ''))}
            onCvvChange={(next) => setCvv(next.replace(/\D/g, ''))}
            onSubmit={(event) => void handleSubmit(event)}
            onCancel={() => navigate('/finances/overview')}
          />
        </div>
      ) : null}
    </main>
  )
}
