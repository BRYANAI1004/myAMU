import { useLayoutEffect, useRef } from 'react'
import { useAIAssistantMobileAnchor } from './AIAssistantMobileAnchorContext'

/**
 * Mount inside the dashboard welcome banner row on mobile so the launcher cluster can align to it.
 */
export function AIAssistantMobileDockAnchor() {
  const ref = useRef<HTMLDivElement>(null)
  const { setMobileDockAnchorEl } = useAIAssistantMobileAnchor()

  useLayoutEffect(() => {
    const el = ref.current
    setMobileDockAnchorEl(el)
    return () => setMobileDockAnchorEl(null)
  }, [setMobileDockAnchorEl])

  return (
    <div
      ref={ref}
      className="portal-dashboard-hero__ai-dock-anchor"
      aria-hidden
    />
  )
}
