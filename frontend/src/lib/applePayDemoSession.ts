import { openApplePayDemoSheet } from '@/components/finance/ApplePayDemoSheet'
import { isApplePayDemoMode } from '@/lib/applePayConfig'
import type { ApplePayCheckoutParams, ApplePayPaymentResult } from '@/lib/applePaySession'

/** Demo-only flow: mock Apple Pay sheet, no real charge or Apple Developer setup. */
export async function requestApplePayDemoPayment(
  params: ApplePayCheckoutParams,
): Promise<ApplePayPaymentResult> {
  if (!isApplePayDemoMode()) {
    throw new Error('Apple Pay demo mode is not enabled.')
  }

  await openApplePayDemoSheet({
    merchantName: params.total.label,
    lineItems: params.lineItems,
    total: params.total,
  })

  return {
    opaqueData: {
      dataDescriptor: 'COMMON.APPLE.INAPP.PAYMENT.DEMO',
      dataValue: btoa(`demo-${Date.now()}`),
    },
    cardholderName: 'Demo Apple Pay',
    billingZip: '91801',
  }
}
