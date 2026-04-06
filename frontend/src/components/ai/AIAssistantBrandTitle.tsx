type AIAssistantBrandTitleProps = {
  /** `panel` = dialog header; `minimized` = compact bar label */
  variant: 'panel' | 'minimized'
}

/**
 * Institutional title: Cinzel “AMU” (medium weight) + bold “AI Assist” in portal red.
 */
export function AIAssistantBrandTitle({ variant }: AIAssistantBrandTitleProps) {
  const base =
    variant === 'panel'
      ? 'portal-ai-assistant-brand-title portal-ai-assistant-brand-title--panel'
      : 'portal-ai-assistant-brand-title portal-ai-assistant-brand-title--minimized'

  return (
    <span className={base}>
      <span className="portal-ai-assistant-brand-title__mark">AMU</span>
      <span className="portal-ai-assistant-brand-title__rest">AI Assist</span>
    </span>
  )
}
