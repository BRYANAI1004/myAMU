import type { AccountingLedgerRow } from '@/lib/api'

export type LedgerPayBucket = 'tuition_fees' | 'clinic'

export type LedgerRowRef = {
  row: AccountingLedgerRow
  index: number
}

export function ledgerRowKey(row: AccountingLedgerRow, index: number): string {
  return `${index}:${row.date}:${row.debit}:${row.credit}:${row.memo}`
}

export function isLedgerClinicRow(row: AccountingLedgerRow): boolean {
  if (row.clinicalBookingPaymentHold != null) return true
  if (row.billingAdjustmentCategory === 'clinical') return true
  const type = row.type.trim().toLowerCase()
  return type.includes('clinical') || type.includes('clinic')
}

/** Whether a ledger line appears under the active pay tab. */
export function isLedgerRowVisibleInBucket(
  row: AccountingLedgerRow,
  bucket: LedgerPayBucket,
): boolean {
  if (row.credit > 0 && row.debit <= 0) {
    if (bucket === 'clinic') return row.billingAdjustmentCategory === 'clinical'
    return row.billingAdjustmentCategory !== 'clinical'
  }
  if (bucket === 'clinic') return isLedgerClinicRow(row)
  return !isLedgerClinicRow(row)
}

/** Charge lines the student may include in checkout for the active bucket. */
export function isLedgerRowPaySelectable(
  row: AccountingLedgerRow,
  bucket: LedgerPayBucket,
): boolean {
  if (row.debit <= 0) return false
  const type = row.type.trim().toLowerCase()
  if (type === 'payment') return false
  return isLedgerRowVisibleInBucket(row, bucket)
}

export function ledgerRowsForBucket(
  rows: AccountingLedgerRow[],
  bucket: LedgerPayBucket,
): LedgerRowRef[] {
  return rows.flatMap((row, index) =>
    isLedgerRowVisibleInBucket(row, bucket) ? [{ row, index }] : [],
  )
}

export function selectableLedgerRowKeys(
  rows: AccountingLedgerRow[],
  bucket: LedgerPayBucket,
): string[] {
  return ledgerRowsForBucket(rows, bucket).flatMap(({ row, index }) =>
    isLedgerRowPaySelectable(row, bucket) ? [ledgerRowKey(row, index)] : [],
  )
}

export function sumSelectedLedgerDebits(
  rows: AccountingLedgerRow[],
  selectedKeys: ReadonlySet<string>,
  bucket: LedgerPayBucket,
): number {
  return rows.reduce((sum, row, index) => {
    const key = ledgerRowKey(row, index)
    if (!selectedKeys.has(key) || !isLedgerRowPaySelectable(row, bucket)) return sum
    return Math.round((sum + row.debit) * 100) / 100
  }, 0)
}

export function ledgerTabPaymentsTotal(visible: LedgerRowRef[]): number {
  return Math.round(visible.reduce((sum, { row }) => sum + row.credit, 0) * 100) / 100
}

export function ledgerTabChargesTotal(visible: LedgerRowRef[], bucket: LedgerPayBucket): number {
  return Math.round(
    visible.reduce(
      (sum, { row }) =>
        isLedgerRowPaySelectable(row, bucket) ? sum + row.debit : sum,
      0,
    ) * 100,
  ) / 100
}

export function ledgerTabDisplayBalance(
  visible: LedgerRowRef[],
  selectedTotal: number,
  bucket: LedgerPayBucket,
): number {
  const totalCharges = ledgerTabChargesTotal(visible, bucket)
  const totalPayments = ledgerTabPaymentsTotal(visible)
  const allSelected =
    Math.abs(selectedTotal - totalCharges) < 0.01 && totalCharges > 0
  if (allSelected) {
    return Math.max(0, Math.round((totalCharges - totalPayments) * 100) / 100)
  }
  return selectedTotal
}
