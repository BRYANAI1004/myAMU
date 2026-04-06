import { createContext, useContext, type ReactNode } from 'react'
import type { AIAssistantPageContext } from '../../data/aiMockReplies'
import { useAIAssistant } from '../../hooks/useAIAssistant'

type AIAssistantContextValue = ReturnType<typeof useAIAssistant>

const AIAssistantContext = createContext<AIAssistantContextValue | null>(null)

export function AIAssistantProvider({
  pageContext,
  children,
}: {
  pageContext: AIAssistantPageContext
  children: ReactNode
}) {
  const value = useAIAssistant(pageContext)
  return <AIAssistantContext.Provider value={value}>{children}</AIAssistantContext.Provider>
}

export function useAIAssistantContext(): AIAssistantContextValue {
  const v = useContext(AIAssistantContext)
  if (!v) {
    throw new Error('useAIAssistantContext must be used within AIAssistantProvider')
  }
  return v
}
