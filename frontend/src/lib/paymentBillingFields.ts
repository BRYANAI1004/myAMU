const CARDHOLDER_NAME_RE = /^[\p{L}\p{M}'.\- ]{2,64}$/u

export function normalizeCardholderName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

export function isValidCardholderName(raw: string): boolean {
  const name = normalizeCardholderName(raw)
  if (name.length < 2 || name.length > 64) return false
  if (!CARDHOLDER_NAME_RE.test(name)) return false
  return /[\p{L}\p{M}]/u.test(name)
}

/** Accept 5-digit or ZIP+4; returns 5 or 9 digits for AVS. */
export function normalizeBillingZip(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 5 || digits.length === 9) return digits
  return null
}

export function isValidBillingZip(raw: string): boolean {
  return normalizeBillingZip(raw) != null
}

export function formatBillingZipInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 9)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export function splitCardholderNameForBillTo(name: string): { firstName: string; lastName: string } {
  const normalized = normalizeCardholderName(name)
  const lastSpace = normalized.lastIndexOf(' ')
  if (lastSpace <= 0) {
    return { firstName: normalized.slice(0, 50), lastName: '.' }
  }
  return {
    firstName: normalized.slice(0, lastSpace).slice(0, 50),
    lastName: normalized.slice(lastSpace + 1).slice(0, 50),
  }
}
