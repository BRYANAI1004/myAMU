import { useEffect, useId, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useStudentPortalT } from '@/LanguageContext'
import type { ApplePayLineItem } from '@/lib/applePaySession'

export type ApplePayDemoSheetProps = {
  merchantName: string
  lineItems: ApplePayLineItem[]
  total: ApplePayLineItem
  onAuthorize: () => void
  onCancel: () => void
}

function ApplePayDemoSheetView({
  merchantName,
  lineItems,
  total,
  onAuthorize,
  onCancel,
}: ApplePayDemoSheetProps) {
  const t = useStudentPortalT()
  const titleId = useId()
  const [authorizing, setAuthorizing] = useState(false)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const handlePay = () => {
    if (authorizing) return
    setAuthorizing(true)
    window.setTimeout(onAuthorize, 900)
  }

  return (
    <div className="apple-pay-demo-backdrop" onClick={onCancel}>
      <div
        className="apple-pay-demo-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="apple-pay-demo-sheet__handle" aria-hidden="true" />
        <header className="apple-pay-demo-sheet__header">
          <span className="apple-pay-demo-sheet__badge">{t('applePayDemoBadge')}</span>
          <h2 id={titleId} className="apple-pay-demo-sheet__title">
            {t('applePayDemoSheetTitle')}
          </h2>
        </header>

        <div className="apple-pay-demo-sheet__merchant">
          <p className="apple-pay-demo-sheet__merchant-name">{merchantName}</p>
          <p className="apple-pay-demo-sheet__amount">${total.amount}</p>
        </div>

        <ul className="apple-pay-demo-sheet__lines">
          {lineItems.map((item) => (
            <li key={`${item.label}-${item.amount}`} className="apple-pay-demo-sheet__line">
              <span>{item.label}</span>
              <span>${item.amount}</span>
            </li>
          ))}
        </ul>

        <button type="button" className="apple-pay-demo-sheet__card" disabled={authorizing}>
          <span className="apple-pay-demo-sheet__card-icon" aria-hidden="true" />
          <span className="apple-pay-demo-sheet__card-label">{t('applePayDemoCardLabel')}</span>
          <span className="apple-pay-demo-sheet__card-chevron" aria-hidden="true">
            ›
          </span>
        </button>

        <button
          type="button"
          className="apple-pay-demo-sheet__pay"
          disabled={authorizing}
          onClick={handlePay}
        >
          {authorizing ? t('applePayDemoAuthorizing') : t('applePayDemoPayWithFaceId')}
        </button>

        <button
          type="button"
          className="apple-pay-demo-sheet__cancel"
          disabled={authorizing}
          onClick={onCancel}
        >
          {t('cancel')}
        </button>
      </div>
    </div>
  )
}

export function openApplePayDemoSheet(
  props: Omit<ApplePayDemoSheetProps, 'onAuthorize' | 'onCancel'>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const mount = document.createElement('div')
    document.body.appendChild(mount)
    let root: Root | null = createRoot(mount)

    const cleanup = () => {
      root?.unmount()
      root = null
      mount.remove()
    }

    root.render(
      <ApplePayDemoSheetView
        {...props}
        onAuthorize={() => {
          cleanup()
          resolve()
        }}
        onCancel={() => {
          cleanup()
          reject(new Error('Apple Pay was cancelled.'))
        }}
      />,
    )
  })
}
