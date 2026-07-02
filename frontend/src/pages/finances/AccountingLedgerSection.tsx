import { useEffect, useMemo, useState, type ReactElement } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useLanguage, useStudentPortalT } from '@/LanguageContext'
import { useAccount } from '../../context/AccountContext'
import { useStudentPortalTerm } from '../../context/StudentPortalTermContext'
import {
  fetchAccountingLedger,
  fetchAccountingQuarters,
  type AccountingLedgerResponse,
  type AccountingLedgerRow,
  type AccountingQuarterOption,
  type ClinicalBookingPaymentHoldLedger,
} from '../../lib/api'
import type { StudentPortalKey } from '../../lib/i18n'
import { portalPillTabClass } from '../../lib/portalPillTabClass'
import { formatMoney } from '../../lib/formatMoney'
import { useIsNarrowMobile } from '../../hooks/useMatchMedia'
import {
  isLedgerRowPaySelectable,
  ledgerRowKey,
  ledgerRowsForBucket,
  ledgerTabDisplayBalance,
  ledgerTabPaymentsTotal,
  selectableLedgerRowKeys,
  sumSelectedLedgerDebits,
  type LedgerPayBucket,
  type LedgerRowRef,
} from '../../lib/ledgerPaySelection'

function dashText(value: string): string {
  return value.trim() !== '' ? value : '—'
}

function ledgerChargeCell(debit: number): string {
  if (debit === 0) return '—'
  return formatMoney(debit)
}

function ledgerPaymentCell(credit: number): string {
  if (credit === 0) return '—'
  return formatMoney(credit)
}

function formatLedgerDate(iso: string, locale: string): string {
  if (!iso || iso.trim() === '') return '—'
  const d = new Date(`${iso.trim()}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso.trim()
  return d.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function quarterKey(q: AccountingQuarterOption): string {
  return `${q.year}:${q.term}`
}

function allLedgerRowRefs(rows: AccountingLedgerRow[]): LedgerRowRef[] {
  return rows.map((row, index) => ({ row, index }))
}

type LedgerViewTab = LedgerPayBucket | 'history'

function formatRemainingHms(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function ClinicalBookingPaymentHoldCountdown({
  hold,
  t,
  className,
}: {
  hold: ClinicalBookingPaymentHoldLedger
  t: (key: StudentPortalKey) => string
  className?: string
}): ReactElement | null {
  const expiresMs = useMemo(() => {
    const ms = new Date(hold.holdExpiresAt.trim()).getTime()
    return Number.isFinite(ms) ? ms : Number.NaN
  }, [hold.holdExpiresAt])

  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    if (!Number.isFinite(expiresMs)) return undefined
    const id = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [expiresMs])

  if (!Number.isFinite(expiresMs) || hold.holdStatus !== 'active') {
    return null
  }

  const remainingSec = Math.max(0, Math.floor((expiresMs - nowMs) / 1000))
  if (remainingSec <= 0) {
    return null
  }

  return (
    <p className={`portal-inline-note portal-inline-note--flush ${className ?? ''}`.trim()} aria-live="polite">
      {t('clinicalBookingPaymentDueIn').replace('{time}', formatRemainingHms(remainingSec))}
    </p>
  )
}

function AccountingLedgerMobileCards({
  visibleRows,
  payTab,
  dateLocale,
  t,
  selectedKeys,
  onToggleRow,
  selectedTotal,
  totalPayments,
  readOnly = false,
}: {
  visibleRows: LedgerRowRef[]
  payTab: LedgerPayBucket
  dateLocale: string
  t: (key: StudentPortalKey) => string
  selectedKeys: ReadonlySet<string>
  onToggleRow: (key: string) => void
  selectedTotal: number
  totalPayments: number
  readOnly?: boolean
}) {
  return (
    <div className="portal-account-ledger-cards" aria-label={t('accountingLedgerByQuarter')}>
      <ul className="portal-account-ledger-cards__list">
        {visibleRows.map(({ row, index }) => {
          const rowKey = ledgerRowKey(row, index)
          const selectable = isLedgerRowPaySelectable(row, payTab)
          return (
            <li key={`${row.date}-${index}-${row.memo}`} className="portal-account-ledger-card">
              {!readOnly && selectable ? (
                <label className="portal-account-ledger-card__select">
                  <input
                    type="checkbox"
                    checked={selectedKeys.has(rowKey)}
                    onChange={() => onToggleRow(rowKey)}
                  />
                  <span>{t('ledgerSelectRowAria')}</span>
                </label>
              ) : null}
              <dl className="portal-account-ledger-card__dl">
                <div className="portal-account-ledger-card__row">
                  <dt>{t('date')}</dt>
                  <dd>{formatLedgerDate(row.date, dateLocale)}</dd>
                </div>
                <div className="portal-account-ledger-card__row">
                  <dt>{t('type')}</dt>
                  <dd className="portal-table-cell-capitalize">{dashText(row.type)}</dd>
                </div>
                <div className="portal-account-ledger-card__row">
                  <dt>{t('code')}</dt>
                  <dd>{dashText(row.code)}</dd>
                </div>
                <div className="portal-account-ledger-card__row portal-account-ledger-card__row--block">
                  <dt>{t('description')}</dt>
                  <dd>
                    <div>{dashText(row.memo)}</div>
                    {row.clinicalBookingPaymentHold != null ? (
                      <ClinicalBookingPaymentHoldCountdown hold={row.clinicalBookingPaymentHold} t={t} />
                    ) : null}
                  </dd>
                </div>
                <div className="portal-account-ledger-card__row portal-account-ledger-card__row--money">
                  <dt>{t('charge')}</dt>
                  <dd>{ledgerChargeCell(row.debit)}</dd>
                </div>
                <div className="portal-account-ledger-card__row portal-account-ledger-card__row--money">
                  <dt>{t('payment')}</dt>
                  <dd>{ledgerPaymentCell(row.credit)}</dd>
                </div>
              </dl>
            </li>
          )
        })}
      </ul>
      <div className="portal-account-ledger-cards__footer">
        <div className="portal-account-ledger-cards__footer-row">
          <span>{t('totalCharges')}</span>
          <span>{formatMoney(selectedTotal)}</span>
        </div>
        <div className="portal-account-ledger-cards__footer-row">
          <span>{t('totalPayments')}</span>
          <span>{formatMoney(totalPayments)}</span>
        </div>
      </div>
    </div>
  )
}

function AccountingLedgerCheckoutBar({
  displayBalance,
  onCheckout,
  t,
}: {
  displayBalance: number
  onCheckout: () => void
  t: (key: StudentPortalKey) => string
}) {
  return (
    <div className="portal-account-ledger__summary-bar">
      <div className="portal-account-ledger__summary-bar-balance">
        <span className="portal-account-ledger__summary-bar-label">{t('balance')}</span>
        <span className="portal-account-ledger__summary-bar-amount">{formatMoney(displayBalance)}</span>
      </div>
      <button
        type="button"
        className="portal-account-ledger__checkout-btn"
        disabled={displayBalance <= 0}
        onClick={onCheckout}
      >
        {t('checkoutButton')}
      </button>
    </div>
  )
}

type SelectedByTab = Record<LedgerPayBucket, ReadonlySet<string>>

const EMPTY_SELECTION: SelectedByTab = {
  tuition_fees: new Set(),
  clinic: new Set(),
}

export function AccountingLedgerSection() {
  const { locale } = useLanguage()
  const { resolveAccountingQuarter, loading: portalTermLoading } =
    useStudentPortalTerm()
  const t = useStudentPortalT()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const narrowMobile = useIsNarrowMobile()
  const dateLocale = locale === 'zh' ? 'zh-TW' : 'en-US'
  const { currentStudentId, isAuthenticated } = useAccount()
  const [quarters, setQuarters] = useState<AccountingQuarterOption[]>([])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [ledger, setLedger] = useState<AccountingLedgerResponse | null>(null)
  const [loadingQuarters, setLoadingQuarters] = useState(false)
  const [loadingLedger, setLoadingLedger] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ledgerReloadSeq, setLedgerReloadSeq] = useState(0)
  const [paymentToast, setPaymentToast] = useState<string | null>(null)
  const [viewTab, setViewTab] = useState<LedgerViewTab>('tuition_fees')
  const [selectedByTab, setSelectedByTab] = useState<SelectedByTab>(EMPTY_SELECTION)

  const isHistoryView = viewTab === 'history'
  const payTab: LedgerPayBucket = isHistoryView ? 'tuition_fees' : viewTab

  const studentId = currentStudentId?.trim() ?? ''

  useEffect(() => {
    if (!isAuthenticated || studentId === '') {
      setQuarters([])
      setSelectedKey(null)
      setLedger(null)
      setError(null)
      return
    }
    if (portalTermLoading) return

    const ac = new AbortController()
    setLoadingQuarters(true)
    setError(null)

    ;(async () => {
      try {
        const res = await fetchAccountingQuarters(studentId, { signal: ac.signal })
        if (ac.signal.aborted) return
        setQuarters(res.quarters)
        const portalQuarter = resolveAccountingQuarter(res.quarters)
        const termParam = searchParams.get('term')?.trim() ?? ''
        const yearParam = Number(searchParams.get('year') ?? NaN)
        const fromQuery =
          termParam !== '' && Number.isFinite(yearParam)
            ? res.quarters.find((q) => q.term === termParam && q.year === yearParam)
            : null
        const selected = portalQuarter ?? fromQuery ?? res.quarters[0] ?? null
        setSelectedKey(selected ? quarterKey(selected) : null)
        setLedger(null)
      } catch (e) {
        if (ac.signal.aborted) return
        setQuarters([])
        setSelectedKey(null)
        setLedger(null)
        setError(e instanceof Error ? e.message : t('couldNotLoadAccountingQuartersFallback'))
      } finally {
        if (!ac.signal.aborted) setLoadingQuarters(false)
      }
    })()

    return () => ac.abort()
  }, [isAuthenticated, studentId, searchParams, portalTermLoading, resolveAccountingQuarter])

  const selectedQuarter = useMemo(() => {
    if (selectedKey == null) return null
    return quarters.find((q) => quarterKey(q) === selectedKey) ?? null
  }, [quarters, selectedKey])

  const portalQuarter = useMemo(
    () => resolveAccountingQuarter(quarters),
    [quarters, resolveAccountingQuarter],
  )

  const onViewTabChange = (tab: LedgerViewTab) => {
    setViewTab(tab)
    if (tab !== 'history' && portalQuarter) {
      setSelectedKey(quarterKey(portalQuarter))
    }
  }

  useEffect(() => {
    if (!paymentToast) return undefined
    const id = window.setTimeout(() => setPaymentToast(null), 5000)
    return () => window.clearTimeout(id)
  }, [paymentToast])

  useEffect(() => {
    const state = location.state as
      | { financePaymentToast?: string; financePaymentRefresh?: boolean }
      | null
      | undefined
    const nextToast = state?.financePaymentToast?.trim() ?? ''
    if (state?.financePaymentRefresh) {
      setLedgerReloadSeq((value) => value + 1)
    }
    if (nextToast === '') {
      if (state?.financePaymentRefresh) {
        navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
      }
      return
    }
    setPaymentToast(nextToast)
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [location.pathname, location.search, location.state, navigate])

  useEffect(() => {
    if (selectedQuarter == null || studentId === '') {
      setLedger(null)
      return
    }
    const ac = new AbortController()
    setLoadingLedger(true)
    setError(null)
    ;(async () => {
      try {
        const res = await fetchAccountingLedger(
          studentId,
          selectedQuarter.term,
          selectedQuarter.year,
          { signal: ac.signal },
        )
        if (!ac.signal.aborted) setLedger(res)
      } catch (e) {
        if (!ac.signal.aborted) {
          setLedger(null)
          setError(e instanceof Error ? e.message : t('couldNotLoadAccountingQuartersFallback'))
        }
      } finally {
        if (!ac.signal.aborted) setLoadingLedger(false)
      }
    })()
    return () => ac.abort()
  }, [selectedQuarter, studentId, ledgerReloadSeq])

  useEffect(() => {
    if (ledger == null) {
      setSelectedByTab(EMPTY_SELECTION)
      return
    }
    setSelectedByTab({
      tuition_fees: new Set(selectableLedgerRowKeys(ledger.rows, 'tuition_fees')),
      clinic: new Set(selectableLedgerRowKeys(ledger.rows, 'clinic')),
    })
  }, [ledger])

  const visibleRows = useMemo(() => {
    if (!ledger) return []
    if (isHistoryView) return allLedgerRowRefs(ledger.rows)
    return ledgerRowsForBucket(ledger.rows, viewTab)
  }, [ledger, viewTab, isHistoryView])

  const selectedKeys = selectedByTab[payTab]

  const historyChargesTotal = useMemo(
    () =>
      Math.round(visibleRows.reduce((sum, { row }) => sum + row.debit, 0) * 100) / 100,
    [visibleRows],
  )

  const historyPaymentsTotal = useMemo(
    () =>
      Math.round(visibleRows.reduce((sum, { row }) => sum + row.credit, 0) * 100) / 100,
    [visibleRows],
  )

  const historyBalance = useMemo(
    () => Math.max(0, Math.round((historyChargesTotal - historyPaymentsTotal) * 100) / 100),
    [historyChargesTotal, historyPaymentsTotal],
  )

  const selectableKeys = useMemo(
    () => (ledger ? selectableLedgerRowKeys(ledger.rows, payTab) : []),
    [ledger, payTab],
  )

  const selectedTotal = useMemo(
    () => (ledger ? sumSelectedLedgerDebits(ledger.rows, selectedKeys, payTab) : 0),
    [ledger, selectedKeys, payTab],
  )

  const totalPayments = useMemo(() => ledgerTabPaymentsTotal(visibleRows), [visibleRows])

  const displayBalance = useMemo(
    () => ledgerTabDisplayBalance(visibleRows, selectedTotal, payTab),
    [visibleRows, selectedTotal, payTab],
  )

  const allChargesSelected =
    selectableKeys.length > 0 && selectableKeys.every((key) => selectedKeys.has(key))

  const toggleRowSelection = (key: string) => {
    setSelectedByTab((prev) => {
      const tabSet = new Set(prev[payTab])
      if (tabSet.has(key)) tabSet.delete(key)
      else tabSet.add(key)
      return { ...prev, [payTab]: tabSet }
    })
  }

  const toggleAllCharges = () => {
    setSelectedByTab((prev) => ({
      ...prev,
      [payTab]: allChargesSelected ? new Set() : new Set(selectableKeys),
    }))
  }

  const proceedToCheckout = () => {
    if (selectedQuarter == null || displayBalance <= 0) return
    const params = new URLSearchParams()
    params.set('term', selectedQuarter.term)
    params.set('year', String(selectedQuarter.year))
    if (selectedQuarter.label.trim() !== '') params.set('label', selectedQuarter.label)
    params.set('amount', displayBalance.toFixed(2))
    params.set('selection', 'ledger')
    const selectedAdjIds = visibleRows.flatMap(({ row, index }) => {
      const key = ledgerRowKey(row, index)
      if (!selectedKeys.has(key)) return []
      const sourceId = row.sourceId
      const id = typeof sourceId === 'number' ? sourceId : Number(sourceId)
      if (!Number.isFinite(id) || id <= 0) return []
      if (row.billingAdjustmentSource === 'store_cart_pending') return [Math.trunc(id)]
      return []
    })
    if (selectedAdjIds.length > 0) {
      params.set('adjIds', selectedAdjIds.join(','))
    }
    const path =
      payTab === 'clinic' ? '/finances/payment/clinic-fee' : '/finances/payment/tuition'
    navigate(`${path}?${params.toString()}`)
  }

  if (!isAuthenticated || studentId === '') {
    return null
  }

  if (loadingQuarters && quarters.length === 0) {
    return (
      <section className="portal-stack" aria-busy="true" aria-live="polite">
        <p className="portal-inline-note portal-inline-note--flush">{t('loadingAccountingQuarters')}</p>
      </section>
    )
  }

  if (!loadingQuarters && quarters.length === 0) {
    if (error) {
      return (
        <section className="portal-stack" aria-live="polite">
          <p className="portal-inline-note portal-inline-note--flush" role="alert">
            {t('couldNotLoadAccountingQuarters')} {error}
          </p>
        </section>
      )
    }
    return null
  }

  const showMakePaymentControl = selectedQuarter != null && quarters.length > 0

  return (
    <section className="portal-account-ledger" aria-label={t('accountingLedgerByQuarter')}>
      {showMakePaymentControl ? (
        <>
          <div className="portal-account-ledger__control-bar">
            <div
              className="portal-account-ledger__pay-segment portal-tab-group"
              role="tablist"
              aria-label={t('pageActionsAria')}
            >
              <button
                type="button"
                role="tab"
                aria-selected={viewTab === 'tuition_fees'}
                className={portalPillTabClass(viewTab === 'tuition_fees')}
                onClick={() => onViewTabChange('tuition_fees')}
              >
                {t('payTuitionAndFees')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewTab === 'clinic'}
                className={portalPillTabClass(viewTab === 'clinic')}
                onClick={() => onViewTabChange('clinic')}
              >
                {t('payClinicFee')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewTab === 'history'}
                className={portalPillTabClass(viewTab === 'history')}
                onClick={() => onViewTabChange('history')}
              >
                {t('paymentHistoryTab')}
              </button>
            </div>
            {!isHistoryView && selectedQuarter ? (
              <div
                className="portal-registration-layout-term portal-registration-layout-term--inline portal-account-ledger__current-term"
                aria-labelledby="accounting-current-term-label"
              >
                <span
                  id="accounting-current-term-label"
                  className="portal-registration-layout-term__title"
                >
                  {t('registrationCurrentTermLabel')}
                </span>
                <span className="portal-registration-layout-term__value">
                  {selectedQuarter.label}
                </span>
              </div>
            ) : null}
            {isHistoryView ? (
              <div className="portal-account-ledger__term-control portal-account-ledger__term-control--inline">
                <select
                  id="accounting-quarter-select"
                  className="portal-account-ledger__term-select"
                  value={selectedKey ?? ''}
                  aria-label={t('documentsTerm')}
                  onChange={(e) => {
                    const v = e.target.value
                    setSelectedKey(v === '' ? null : v)
                  }}
                  disabled={loadingQuarters}
                >
                  {quarters.map((q) => (
                    <option key={quarterKey(q)} value={quarterKey(q)}>
                      {q.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
      {paymentToast ? (
        <p className="portal-finance-payment-toast" role="status" aria-live="polite">
          {paymentToast}
        </p>
      ) : null}

      {error ? (
        <p className="portal-inline-note portal-inline-note--flush" role="alert">
          {t('ledgerCouldNotLoad')} {error}
        </p>
      ) : null}

      {loadingLedger && ledger == null ? (
        <p className="portal-inline-note portal-inline-note--flush" aria-busy="true">
          {t('loadingLedger')}
        </p>
      ) : ledger ? (
        <div className="portal-account-ledger__ledger-panel">
          {narrowMobile ? (
            <AccountingLedgerMobileCards
              visibleRows={visibleRows}
              payTab={payTab}
              dateLocale={dateLocale}
              t={t}
              selectedKeys={selectedKeys}
              onToggleRow={toggleRowSelection}
              selectedTotal={isHistoryView ? historyChargesTotal : selectedTotal}
              totalPayments={isHistoryView ? historyPaymentsTotal : totalPayments}
              readOnly={isHistoryView}
            />
          ) : (
            <div className="portal-table-wrap portal-account-ledger__table-wrap">
              <table className="portal-table portal-table--courses portal-table--ledger">
                <caption className="visually-hidden">
                  {t('ledgerCaptionPrefix')} {ledger.term} {ledger.year}
                </caption>
                <colgroup>
                  {!isHistoryView ? <col className="portal-table--ledger-col-select" /> : null}
                  <col className="portal-table--ledger-col-date" />
                  <col className="portal-table--ledger-col-type" />
                  <col className="portal-table--ledger-col-code" />
                  <col className="portal-table--ledger-col-description" />
                  <col className="portal-table--ledger-col-charge" />
                  <col className="portal-table--ledger-col-payment" />
                </colgroup>
                <thead>
                  <tr>
                    {!isHistoryView ? (
                      <th scope="col" className="portal-table--ledger-col-select">
                        <label className="portal-account-ledger__select-all">
                          <input
                            type="checkbox"
                            checked={allChargesSelected}
                            onChange={toggleAllCharges}
                            disabled={selectableKeys.length === 0}
                            aria-label={t('ledgerSelectAll')}
                          />
                        </label>
                      </th>
                    ) : null}
                    <th scope="col" className="portal-table--ledger-col-center">{t('date')}</th>
                    <th scope="col" className="portal-table--ledger-col-center">{t('type')}</th>
                    <th scope="col" className="portal-table--ledger-col-center">{t('code')}</th>
                    <th scope="col" className="portal-table--ledger-col-description">{t('description')}</th>
                    <th scope="col" className="portal-table--ledger-col-money">{t('charge')}</th>
                    <th scope="col" className="portal-table--ledger-col-money">{t('payment')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map(({ row, index }) => {
                    const rowKey = ledgerRowKey(row, index)
                    const selectable = !isHistoryView && isLedgerRowPaySelectable(row, payTab)
                    return (
                      <tr key={`${row.date}-${index}-${row.memo}`}>
                        {!isHistoryView ? (
                          <td className="portal-table--ledger-col-select">
                            {selectable ? (
                              <input
                                type="checkbox"
                                checked={selectedKeys.has(rowKey)}
                                onChange={() => toggleRowSelection(rowKey)}
                                aria-label={`${t('ledgerSelectRowAria')}: ${row.memo}`}
                              />
                            ) : null}
                          </td>
                        ) : null}
                        <td className="portal-table--ledger-col-center">{formatLedgerDate(row.date, dateLocale)}</td>
                        <td className="portal-table-cell-capitalize portal-table--ledger-col-center">{dashText(row.type)}</td>
                        <td className="portal-table--ledger-col-center">{dashText(row.code)}</td>
                        <td className="portal-table--ledger-col-description">
                          <div className="portal-table--ledger-description-main">{dashText(row.memo)}</div>
                          {row.clinicalBookingPaymentHold != null ? (
                            <ClinicalBookingPaymentHoldCountdown
                              hold={row.clinicalBookingPaymentHold}
                              t={t}
                              className="portal-table--ledger-description-subline"
                            />
                          ) : null}
                        </td>
                        <td className="portal-table--ledger-col-money">{ledgerChargeCell(row.debit)}</td>
                        <td className="portal-table--ledger-col-money">{ledgerPaymentCell(row.credit)}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="portal-table--ledger-summary-row">
                    <th
                      scope="row"
                      colSpan={isHistoryView ? 4 : 5}
                      className="portal-table--ledger-summary-label"
                    >
                      {t('totalCharges')}
                    </th>
                    <td className="portal-table--ledger-col-money portal-table--ledger-summary-value">
                      {formatMoney(isHistoryView ? historyChargesTotal : selectedTotal)}
                    </td>
                    <td className="portal-table--ledger-col-money portal-table--ledger-summary-dash">—</td>
                  </tr>
                  <tr className="portal-table--ledger-summary-row">
                    <th
                      scope="row"
                      colSpan={isHistoryView ? 4 : 5}
                      className="portal-table--ledger-summary-label"
                    >
                      {t('totalPayments')}
                    </th>
                    <td className="portal-table--ledger-col-money portal-table--ledger-summary-dash">—</td>
                    <td className="portal-table--ledger-col-money portal-table--ledger-summary-value">
                      {formatMoney(isHistoryView ? historyPaymentsTotal : totalPayments)}
                    </td>
                  </tr>
                  {isHistoryView ? (
                    <tr className="portal-table--ledger-summary-row portal-table--ledger-summary-row--balance">
                      <th scope="row" colSpan={4} className="portal-table--ledger-summary-label">
                        {t('balance')}
                      </th>
                      <td className="portal-table--ledger-col-money portal-table--ledger-summary-dash">—</td>
                      <td className="portal-table--ledger-col-money portal-table--ledger-summary-value">
                        {formatMoney(historyBalance)}
                      </td>
                    </tr>
                  ) : null}
                </tfoot>
              </table>
            </div>
          )}
          {!isHistoryView ? (
            <AccountingLedgerCheckoutBar
              displayBalance={displayBalance}
              onCheckout={proceedToCheckout}
              t={t}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
