import type { StudentPortalKey } from '@/lib/i18n'

/** Card network (payment brand) inferred from BIN prefix — not the issuing bank. */
export type CardNetwork = 'visa' | 'mastercard' | 'amex' | 'discover'

export const ALL_CARD_NETWORKS: readonly CardNetwork[] = [
  'visa',
  'mastercard',
  'amex',
  'discover',
] as const

export const CARD_NETWORK_META: Record<
  CardNetwork,
  { icon: string; labelKey: StudentPortalKey }
> = {
  visa: { icon: '/visa.png', labelKey: 'cardNetworkVisa' },
  mastercard: { icon: '/master.png', labelKey: 'cardNetworkMastercard' },
  amex: { icon: '/amex.png', labelKey: 'cardNetworkAmex' },
  discover: { icon: '/discover.png', labelKey: 'cardNetworkDiscover' },
}

/**
 * Infer card network from PAN prefix (Visa, Mastercard, Amex, Discover).
 * Requires at least 2 digits; Discover `6011` needs 4.
 */
export function inferCardNetworkFromPan(panDigits: string): CardNetwork | null {
  const digits = panDigits.replace(/\D/g, '')
  if (digits.length < 2) return null

  if (/^3[47]/.test(digits)) return 'amex'

  if (digits.length >= 4 && /^6011/.test(digits)) return 'discover'
  if (/^65/.test(digits)) return 'discover'
  if (/^64[4-9]/.test(digits)) return 'discover'

  if (/^4/.test(digits)) return 'visa'

  if (/^5[1-5]/.test(digits)) return 'mastercard'
  if (/^2(2(2[1-9]|[3-9]\d)|[3-6]\d{2}|7[01]\d|720)/.test(digits)) return 'mastercard'

  return null
}
