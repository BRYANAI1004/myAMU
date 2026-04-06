import Lottie from 'lottie-react'
import type { CSSProperties } from 'react'
import { useCatLottieData } from './useCatLottieData'

type AIAssistantPetProps = {
  size?: number
  className?: string
  style?: CSSProperties
  loop?: boolean
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void
  onPointerMove?: (e: React.PointerEvent<HTMLDivElement>) => void
  onPointerUp?: (e: React.PointerEvent<HTMLDivElement>) => void
  onPointerCancel?: (e: React.PointerEvent<HTMLDivElement>) => void
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void
  tabIndex?: number
  role?: 'button'
  'aria-label'?: string
  /** Set when the pet is decorative (e.g. parent control has the accessible name). */
  'aria-hidden'?: boolean
}

export function AIAssistantPet({
  size = 78,
  className = '',
  style,
  loop = true,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onClick,
  tabIndex,
  role,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden,
}: AIAssistantPetProps) {
  const data = useCatLottieData()

  const boxStyle: CSSProperties = {
    width: size,
    height: size,
    flexShrink: 0,
    cursor: onPointerDown ? 'grab' : 'inherit',
    touchAction: onPointerDown ? 'none' : undefined,
    ...style,
  }

  if (!data) {
    return (
      <div
        className={`portal-ai-assistant-pet portal-ai-assistant-pet--loading ${className}`.trim()}
        style={boxStyle}
        aria-hidden={ariaHidden ? true : undefined}
        aria-label={ariaLabel}
      />
    )
  }

  return (
    <div
      className={`portal-ai-assistant-pet ${className}`.trim()}
      style={boxStyle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClick={onClick}
      tabIndex={tabIndex}
      role={role}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden ? true : undefined}
    >
      <Lottie animationData={data} loop={loop} style={{ width: size, height: size }} />
    </div>
  )
}
