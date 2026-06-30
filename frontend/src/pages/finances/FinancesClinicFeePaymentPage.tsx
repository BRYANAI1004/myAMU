import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useStudentPortalT } from '@/LanguageContext'
import { useAccount } from '@/context/AccountContext'
import { PaymentCardForm } from '@/components/finance/PaymentCardForm'
import { PaymentSummaryCard } from '@/components/finance/PaymentSummaryCard'
import { portalTermLabel } from '@/lib/accountDisplay'
import { dispatchAcceptData, loadAcceptJs } from '@/lib/authorizeNet'
import {
  fetchAccountingQuarters,
  fetchAuthorizeClinicFeeSummary,
  postAuthorizeNetClinicFeeCharge,
  type ClinicFeeBillingSummaryResponse,
} from '@/lib/api'
import type { StudentPortalKey } from '@/lib/i18n'
import { formatMoney } from '@/lib/formatMoney'
import { cardBinPrefixFromPan, inferCardFundingFromPan } from '@/lib/cardFundingFromBin'
import {
  computeCreditCardProcessingFee,
  roundMoney,
  totalWithProcessingFee,
} from '@/lib/creditCardProcessingFee'
import {
  formatBillingZipInput,
  isValidCardholderName,
  normalizeBillingZip,
  normalizeCardholderName,
} from '@/lib/paymentBillingFields'
import type { PaymentBreakdownLine } from '@/components/finance/PaymentSummaryCard'

function normalizeAmountInput(v: string): string {
  const trimmed = v.trim()
  if (trimmed === '') return ''
  const normalized = trimmed.replace(/[^0-9.]/g, '')
  const parts = normalized.split('.')
  if (parts.length <= 1) return normalized
  return `${parts[0]}.${parts.slice(1).join('').slice(0, 2)}`
}

function normalizeExpirationInput(v: string): string {
  const digits = v.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

function splitExpirationDate(expirationDate: string): { month: string; year: string } | null {
  const match = expirationDate.match(/^(\d{2})\/(\d{2})$/)
  if (match == null) return null
  const [, month, shortYear] = match
  const monthNumber = Number(month)
  if (!Number.isFinite(monthNumber) || monthNumber < 1 || monthNumber > 12) return null
  return {
    month,
    year: `20${shortYear}`,
  }
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

function clinicStatusMessage(
  summary: ClinicFeeBillingSummaryResponse | null,
  t: (key: StudentPortalKey) => string,
): string {
  if (summary == null) return ''
  if (summary.clinicFeeStatus === 'paid') return t('clinicFeeStatusPaid')
  if (summary.clinicFeeStatus === 'registration_cancelled') {
    return t('clinicFeeStatusRegistrationCancelled')
  }
  if (summary.clinicFeeStatus === 'expired') {
    return t('clinicFeeStatusExpired')
  }
  return t('clinicFeeStatusPending')
}

function clinicFeeStatusLabel(
  status: ClinicFeeBillingSummaryResponse['clinicFeeStatus'],
  t: (key: StudentPortalKey) => string,
): string {
  if (status === 'paid') return t('paid')
  if (status === 'registration_cancelled') return t('registrationCancelled')
  if (status === 'expired') return t('expired')
  return t('pending')
}

export function FinancesClinicFeePaymentPage() {
  const t = useStudentPortalT()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const ledgerSelection = searchParams.get('selection') === 'ledger'
  const ledgerSelectedAmount = useMemo(() => {
    const raw = searchParams.get('amount')?.trim() ?? ''
    const n = roundMoney(Number(raw))
    return Number.isFinite(n) && n > 0 ? n : null
  }, [searchParams])
  const { account, currentStudentId, authToken, isAuthenticated } = useAccount()
  const [term, setTerm] = useState(() => searchParams.get('term')?.trim() ?? '')
  const [year, setYear] = useState(() => Number(searchParams.get('year') ?? NaN))
  const [termLabel, setTermLabel] = useState(() => searchParams.get('label')?.trim() ?? '')
  const [billingSummary, setBillingSummary] = useState<ClinicFeeBillingSummaryResponse | null>(null)
  const [amount, setAmount] = useState('0.00')
  const [cardholderName, setCardholderName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expirationDate, setExpirationDate] = useState('')
  const [cvv, setCvv] = useState('')
  const [billingZip, setBillingZip] = useState('')
  const [scriptReady, setScriptReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const studentId = currentStudentId?.trim() ?? ''
  const summaryClinicDue = Math.max(0, billingSummary?.clinicFeeCharge.amountDue ?? 0)
  const clinicDue =
    ledgerSelection && ledgerSelectedAmount != null ? ledgerSelectedAmount : summaryClinicDue

  const amountNum = useMemo(() => {
    const n = Number(amount)
    return Number.isFinite(n) ? roundMoney(n) : Number.NaN
  }, [amount])

  const cardFunding = useMemo(() => inferCardFundingFromPan(cardNumber), [cardNumber])
  const processingFee = useMemo(
    () => (Number.isFinite(amountNum) ? computeCreditCardProcessingFee(amountNum, cardFunding) : 0),
    [amountNum, cardFunding],
  )
  const totalCharged = useMemo(
    () => (Number.isFinite(amountNum) ? totalWithProcessingFee(amountNum, cardFunding) : 0),
    [amountNum, cardFunding],
  )

  const clinicBreakdownLines = useMemo((): PaymentBreakdownLine[] => {
    if (!Number.isFinite(amountNum)) return []
    return [
      { key: 'tuition', label: t('paymentBreakdownTuition'), amount: 0 },
      { key: 'clinic', label: t('paymentBreakdownClinicFee'), amount: amountNum },
    ]
  }, [amountNum, t])

  const cardFundingNote = useMemo(() => {
    const digits = cardNumber.replace(/\D/g, '')
    if (digits.length < 6) return null
    if (cardFunding === 'debit') return t('cardFundingDebitDetected')
    if (cardFunding === 'credit') return t('cardFundingCreditDetected')
    return t('cardFundingUnknown')
  }, [cardFunding, cardNumber, t])

  const studentName = account.student.name?.trim() || t('studentFallback')
  const displayStudentId = account.student.studentId?.trim() || studentId || '—'

  useEffect(() => {
    setCardholderName((prev) => {
      if (prev.trim() !== '') return prev
      return account.student.name?.trim() ?? ''
    })
  }, [account.student.name])
  const displayTerm = termLabel || portalTermLabel(account) || t('selectedTerm')
  const termCode = termCodeFromQuarter(term, year)
  const statusMessage = clinicStatusMessage(billingSummary, t)
  const canPay = ledgerSelection
    ? ledgerSelectedAmount != null && ledgerSelectedAmount > 0
    : billingSummary?.clinicFeeStatus === 'pending' && clinicDue > 0
  const lockedAmountNote = ledgerSelection
    ? t('amountMatchesLedgerSelection')
    : t('clinicFeeMustBeFullPayment')

  useEffect(() => {
    if (ledgerSelection && ledgerSelectedAmount != null) {
      setAmount(ledgerSelectedAmount.toFixed(2))
      return
    }
    setAmount(clinicDue.toFixed(2))
  }, [clinicDue, ledgerSelection, ledgerSelectedAmount])

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
            throw new Error(t('noPayableTermFound'))
          }
          nextTerm = newest.term
          nextYear = newest.year
          nextLabel = newest.label
          setTerm(nextTerm)
          setYear(nextYear)
          setTermLabel(nextLabel)
        }

        if (ledgerSelection) {
          if (nextLabel.trim() === '') {
            setTermLabel(`${nextTerm} ${nextYear}`.trim())
          }
        } else {
          const summary = await fetchAuthorizeClinicFeeSummary(nextTerm, nextYear, {
            signal: ac.signal,
            authToken: authToken?.trim() || undefined,
          })
          if (ac.signal.aborted) return
          setBillingSummary(summary)
          if (nextLabel.trim() === '') {
            setTermLabel(`${summary.term} ${summary.year}`.trim())
          }
        }
      } catch (e) {
        if (ac.signal.aborted) return
        setError(e instanceof Error ? e.message : t('unableToLoadClinicFeeDetails'))
      } finally {
        if (!ac.signal.aborted) setLoading(false)
      }
    })()

    return () => ac.abort()
  }, [authToken, isAuthenticated, ledgerSelection, navigate, studentId, term, termLabel, year, t])

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
        setError(e instanceof Error ? e.message : t('unableToLoadPaymentScript'))
      })
    return () => {
      mounted = false
    }
  }, [t])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting || loading) return

    const apiLoginId = String(import.meta.env.VITE_AUTHORIZE_API_LOGIN_ID ?? '').trim()
    const clientKey = String(import.meta.env.VITE_AUTHORIZE_CLIENT_KEY ?? '').trim()

    if (apiLoginId === '' || clientKey === '') {
      setError(t('paymentConfigurationUnavailable'))
      setCvv('')
      return
    }
    if (!scriptReady) {
      setError(t('securePaymentFormStillLoading'))
      setCvv('')
      return
    }
    if (term.trim() === '' || !Number.isFinite(year)) {
      setError(t('billingTermUnavailable'))
      setCvv('')
      return
    }
    if (!canPay) {
      setError(t('clinicFeeNotPayableFromPage'))
      setCvv('')
      return
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError(t('enterValidPaymentAmount'))
      setCvv('')
      return
    }
    if (!ledgerSelection && amountNum !== clinicDue) {
      setError(t('clinicFeeAmountMustMatchFull'))
      setCvv('')
      return
    }
    if (!/^\d{13,19}$/.test(cardNumber)) {
      setError(t('cardNumberDigitsError'))
      setCvv('')
      return
    }
    const cardBinPrefix = cardBinPrefixFromPan(cardNumber)
    if (cardBinPrefix == null) {
      setError(t('cardBinPrefixInvalid'))
      setCvv('')
      return
    }
    const expirationParts = splitExpirationDate(expirationDate)
    if (expirationParts == null) {
      setError(t('expirationFormatError'))
      setCvv('')
      return
    }
    if (!/^\d{3,4}$/.test(cvv)) {
      setError(t('cvvDigitsError'))
      setCvv('')
      return
    }
    if (!isValidCardholderName(cardholderName)) {
      setError(t('cardholderNameInvalid'))
      setCvv('')
      return
    }
    const normalizedZip = normalizeBillingZip(billingZip)
    if (normalizedZip == null) {
      setError(t('billingZipInvalid'))
      setCvv('')
      return
    }
    const normalizedCardholderName = normalizeCardholderName(cardholderName)

    setSubmitting(true)
    setError(null)
    try {
      const opaqueData = await dispatchAcceptData({
        authData: { apiLoginID: apiLoginId, clientKey },
        cardData: {
          cardNumber,
          month: expirationParts.month,
          year: expirationParts.year,
          cardCode: cvv,
          fullName: normalizedCardholderName,
          zip: normalizedZip,
        },
      })
      const result = await postAuthorizeNetClinicFeeCharge(
        {
          term: termCode,
          amount: amountNum.toFixed(2),
          chargeType: 'clinic_fee',
          paymentPlan: 'full',
          installmentCount: 1,
          opaqueData,
          cardBinPrefix,
          cardholderName: normalizedCardholderName,
          billingZip: normalizedZip,
        },
        { authToken: authToken?.trim() || undefined },
      )
      setCvv('')
      const successText = t('clinicFeePaymentSuccess')
        .replace('{amount}', formatMoney(Number(result.amount)))
        .replace('{reference}', result.providerTransactionId)
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
      setError(e instanceof Error ? e.message : t('paymentCouldNotBeProcessed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="portal-page portal-finance-checkout-page">
      <header className="portal-finance-checkout-page__header">
        <Link to="/finances/overview" className="portal-finance-checkout-page__back-link">
          <ChevronLeft size={16} aria-hidden="true" />
          <span>{t('backToFinances')}</span>
        </Link>
        <h2 className="portal-page-title portal-finance-checkout-page__title">
          {t('payClinicFee')}
        </h2>
      </header>

      {loading ? (
        <p className="portal-inline-note portal-inline-note--flush" role="status">
          {t('loadingClinicFeeDetails')}
        </p>
      ) : null}

      {successMessage ? (
        <p className="portal-inline-note portal-inline-note--flush portal-finance-checkout-page__success" role="status">
          {successMessage}
        </p>
      ) : null}

      {!loading ? (
        <>
          {billingSummary != null && !ledgerSelection ? (
            <section className="portal-card portal-finance-payment-option" aria-labelledby="clinic-fee-heading">
              <header className="portal-finance-payment-option__header">
                <h2 id="clinic-fee-heading" className="portal-section-heading">
                  {t('clinicFee')}
                </h2>
              </header>
              <dl className="portal-finance-checkout-summary">
                <div className="portal-finance-checkout-summary__row">
                  <dt>{t('clinicFeeAmount')}</dt>
                  <dd>{formatMoney(billingSummary.clinicFeeCharge.amount)}</dd>
                </div>
                <div className="portal-finance-checkout-summary__row">
                  <dt>{t('clinicFeeDueNow')}</dt>
                  <dd>{formatMoney(clinicDue)}</dd>
                </div>
                <div className="portal-finance-checkout-summary__row">
                  <dt>{t('status')}</dt>
                  <dd>{clinicFeeStatusLabel(billingSummary.clinicFeeStatus, t)}</dd>
                </div>
                <div className="portal-finance-checkout-summary__row">
                  <dt>{t('requiredDeadline')}</dt>
                  <dd>{billingSummary.paymentDeadline ?? t('notSet')}</dd>
                </div>
              </dl>
              <p className="portal-finance-payment-option__note">{statusMessage}</p>
              <p className="portal-finance-payment-option__note">
                {t('clinicFeeSinglePaymentOnly')}
              </p>
            </section>
          ) : null}
          {!canPay && !ledgerSelection ? (
            <p className="portal-inline-note portal-inline-note--flush" role="status">
              {t('clinicFeeNotCurrentlyDue')}
            </p>
          ) : null}
          <div className="portal-finance-checkout-layout">
            <div className="portal-finance-checkout-layout__col">
              <PaymentSummaryCard
                studentName={studentName}
                studentId={displayStudentId}
                termLabel={displayTerm}
                balanceDue={clinicDue}
                breakdownLines={clinicBreakdownLines}
                creditCardFee={processingFee}
                totalCharged={totalCharged}
                cardFundingNote={cardFundingNote}
              />
            </div>
            {canPay ? (
              <div className="portal-finance-checkout-layout__col">
                <PaymentCardForm
                  amount={amount}
                  cardholderName={cardholderName}
                  cardNumber={cardNumber}
                  expirationDate={expirationDate}
                  cvv={cvv}
                  billingZip={billingZip}
                  allowPartialPayment={false}
                  lockedAmountNote={lockedAmountNote}
                  disclosureNote={t('creditCardProcessingFeeDisclosure')}
                  submitLabel={t('payClinicFee')}
                  busy={submitting}
                  scriptReady={scriptReady}
                  error={error}
                  onAmountChange={(next) => setAmount(normalizeAmountInput(next))}
                  onCardholderNameChange={setCardholderName}
                  onCardNumberChange={(next) => setCardNumber(next.replace(/\D/g, ''))}
                  onExpirationDateChange={(next) => setExpirationDate(normalizeExpirationInput(next))}
                  onCvvChange={(next) => setCvv(next.replace(/\D/g, ''))}
                  onBillingZipChange={(next) => setBillingZip(formatBillingZipInput(next))}
                  onSubmit={(event) => void handleSubmit(event)}
                  onCancel={() => navigate('/finances/overview')}
                />
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </main>
  )
}
