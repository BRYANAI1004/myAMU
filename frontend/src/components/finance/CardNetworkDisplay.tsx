import { useMemo } from 'react'
import { useStudentPortalT } from '@/LanguageContext'
import {
  ALL_CARD_NETWORKS,
  CARD_NETWORK_META,
  inferCardNetworkFromPan,
} from '@/lib/cardNetworkFromBin'

type CardNetworkIconsProps = {
  cardNumber: string
  className?: string
}

export function useDetectedCardNetwork(cardNumber: string) {
  return useMemo(() => inferCardNetworkFromPan(cardNumber), [cardNumber])
}

export function CardNetworkIcons({ cardNumber, className }: CardNetworkIconsProps) {
  const network = useDetectedCardNetwork(cardNumber)

  if (network != null) {
    const { icon } = CARD_NETWORK_META[network]
    return (
      <div
        className={[
          'portal-finance-checkout-form__trailing-icons',
          'card-brand-icons',
          'card-brand-icons--detected',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-hidden="true"
      >
        <img src={icon} alt="" className="card-brand-icons__active" />
      </div>
    )
  }

  return (
    <div
      className={[
        'portal-finance-checkout-form__trailing-icons',
        'card-brand-icons',
        'card-brand-icons--placeholder',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden="true"
    >
      {ALL_CARD_NETWORKS.map((id) => (
        <img key={id} src={CARD_NETWORK_META[id].icon} alt="" />
      ))}
    </div>
  )
}

type CardNetworkDetectedNoteProps = {
  cardNumber: string
}

export function CardNetworkDetectedNote({ cardNumber }: CardNetworkDetectedNoteProps) {
  const t = useStudentPortalT()
  const network = useDetectedCardNetwork(cardNumber)
  const digits = cardNumber.replace(/\D/g, '')

  if (network == null || digits.length < 2) return null

  const label = t(CARD_NETWORK_META[network].labelKey)
  return (
    <p
      className="portal-finance-checkout-form__helper portal-finance-checkout-form__network-detected"
      role="status"
    >
      {t('cardNetworkDetected').replace('{network}', label)}
    </p>
  )
}
