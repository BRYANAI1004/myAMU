import type { BillingLineItem } from '../types/billing'
import type { MahmAccountMock } from '../mock/mahmAccountMock'
import { formatMoney } from './formatMoney'

export type InstallmentRow = {
  installment: number
  dueDate: string
  amount: number
}

export function lateFeeFromLineItems(lineItems: BillingLineItem[]): number {
  const late = lineItems.find((r) => /late fee/i.test(r.description))
  return late?.amount ?? 0
}

export function toInstallmentRows(
  schedule: MahmAccountMock['installmentPlan']['schedule'],
): InstallmentRow[] {
  return schedule.map((row, i) => ({
    installment: i + 1,
    dueDate: row.dueDate,
    amount: row.amount,
  }))
}

export function nextInstallmentRow(rows: InstallmentRow[]): InstallmentRow | undefined {
  return rows[0]
}

export function installmentPlanDisplayLabel(plan: MahmAccountMock['installmentPlan']): string {
  if (!plan.enabled) {
    return 'Pay in full (no installment plan)'
  }
  return `${plan.installmentCount}-installment plan · ~${formatMoney(plan.installmentAmount)} per installment`
}

export function portalTermLabel(account: MahmAccountMock): string {
  return `${account.student.term} ${account.student.year}`
}

/** Maps mock ledger entries to activity table rows with running balance (oldest first). */
export function activityRowsFromRecent(
  entries: MahmAccountMock['recentActivity'],
): { date: string; description: string; charges: number; credits: number; balance: number }[] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  let balance = 0
  return sorted.map((row) => {
    const charge = row.amount > 0 ? row.amount : 0
    const credit = row.amount < 0 ? -row.amount : 0
    balance += row.amount
    return {
      date: row.date,
      description: row.description,
      charges: charge,
      credits: credit,
      balance,
    }
  })
}

export function paymentsFromRecentActivity(
  entries: MahmAccountMock['recentActivity'],
): { amount: number; paidAt: string; method: string; description: string }[] {
  return entries
    .filter((e) => e.amount < 0)
    .map((e) => ({
      amount: -e.amount,
      paidAt: e.date,
      method: 'Posted payment',
      description: e.description,
    }))
}
