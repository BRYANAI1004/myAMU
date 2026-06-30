export type StoreCartLine = {
  feeCode: string
  name: string
  unitPriceUsd: number
  quantity: number
  allowQuantity: boolean
  maxQuantity: number
  notes?: string
}

const CART_STORAGE_PREFIX = 'amu_store_cart_v1'

function cartKey(studentId: string): string {
  return `${CART_STORAGE_PREFIX}:${studentId.trim()}`
}

export function readStoreCart(studentId: string): StoreCartLine[] {
  if (typeof window === 'undefined' || studentId.trim() === '') return []
  try {
    const raw = window.localStorage.getItem(cartKey(studentId))
    if (raw == null || raw.trim() === '') return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (row): row is StoreCartLine =>
        row != null &&
        typeof row === 'object' &&
        typeof (row as StoreCartLine).feeCode === 'string' &&
        typeof (row as StoreCartLine).name === 'string' &&
        Number.isFinite(Number((row as StoreCartLine).unitPriceUsd)) &&
        Number.isFinite(Number((row as StoreCartLine).quantity)),
    )
  } catch {
    return []
  }
}

export function storeCartLinesFromResponse(
  items: Array<{
    feeCode: string
    name: string
    unitPriceUsd: number
    quantity: number
    allowQuantity: boolean
    maxQuantity: number
    notes?: string | null
  }>,
): StoreCartLine[] {
  return items.map((row) => ({
    feeCode: row.feeCode,
    name: row.name,
    unitPriceUsd: Number(row.unitPriceUsd),
    quantity: Math.max(1, Math.trunc(Number(row.quantity) || 1)),
    allowQuantity: Boolean(row.allowQuantity),
    maxQuantity: Math.max(1, Math.trunc(Number(row.maxQuantity) || 1)),
    notes: row.notes ?? undefined,
  }))
}

export function writeStoreCart(studentId: string, lines: StoreCartLine[]): void {
  if (typeof window === 'undefined' || studentId.trim() === '') return
  window.localStorage.setItem(cartKey(studentId), JSON.stringify(lines))
}

export function clearStoreCart(studentId: string): void {
  if (typeof window === 'undefined' || studentId.trim() === '') return
  window.localStorage.removeItem(cartKey(studentId))
}

export function cartSubtotal(lines: StoreCartLine[]): number {
  return Math.round(
    lines.reduce((sum, row) => sum + row.unitPriceUsd * Math.max(1, row.quantity), 0) * 100,
  ) / 100
}

export function mergeCartLine(
  lines: StoreCartLine[],
  incoming: StoreCartLine,
): StoreCartLine[] {
  const idx = lines.findIndex((l) => l.feeCode === incoming.feeCode)
  if (idx < 0) return [...lines, incoming]
  const next = [...lines]
  const existing = next[idx]!
  const qty = incoming.allowQuantity
    ? Math.min(incoming.maxQuantity, existing.quantity + incoming.quantity)
    : 1
  next[idx] = { ...existing, quantity: qty, notes: incoming.notes ?? existing.notes }
  return next
}

export function updateCartLineQuantity(
  lines: StoreCartLine[],
  feeCode: string,
  quantity: number,
): StoreCartLine[] {
  return lines
    .map((row) => {
      if (row.feeCode !== feeCode) return row
      const qty = row.allowQuantity
        ? Math.max(1, Math.min(row.maxQuantity, Math.trunc(quantity)))
        : 1
      return { ...row, quantity: qty }
    })
    .filter((row) => row.quantity > 0)
}

export function removeCartLine(lines: StoreCartLine[], feeCode: string): StoreCartLine[] {
  return lines.filter((row) => row.feeCode !== feeCode)
}
