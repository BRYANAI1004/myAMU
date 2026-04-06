import { useCallback, useEffect, useRef, useState } from 'react'
import type { AIAssistantPageContext } from '../data/aiMockReplies'
import { getWelcomeMessage } from '../data/aiMockReplies'
import { sendAssistantMessage } from '../lib/sendAssistantMessage'

export type AIAssistantChatRole = 'user' | 'assistant'

export type AIAssistantChatMessage = {
  id: string
  role: AIAssistantChatRole
  content: string
  createdAt: number
}

function newId(): string {
  return crypto.randomUUID()
}

function assistantMessage(content: string): AIAssistantChatMessage {
  return { id: newId(), role: 'assistant', content, createdAt: Date.now() }
}

function userMessage(content: string): AIAssistantChatMessage {
  return { id: newId(), role: 'user', content, createdAt: Date.now() }
}

export type AIAssistantPanelState = 'closed' | 'open' | 'minimized'

export function useAIAssistant(pageContext: AIAssistantPageContext) {
  const [panelState, setPanelState] = useState<AIAssistantPanelState>('closed')
  const [messages, setMessages] = useState<AIAssistantChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [isAwaitingReply, setIsAwaitingReply] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const ensureWelcome = useCallback(() => {
    setMessages((prev) => {
      if (prev.length > 0) return prev
      return [assistantMessage(getWelcomeMessage(pageContext))]
    })
  }, [pageContext])

  const openPanel = useCallback(() => {
    ensureWelcome()
    setPanelState('open')
  }, [ensureWelcome])

  const minimizePanel = useCallback(() => {
    setPanelState('minimized')
  }, [])

  const expandPanel = useCallback(() => {
    ensureWelcome()
    setPanelState('open')
  }, [ensureWelcome])

  const closePanel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setIsAwaitingReply(false)
    setPanelState('closed')
  }, [])

  const clearChat = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setIsAwaitingReply(false)
    setDraft('')
    setMessages([assistantMessage(getWelcomeMessage(pageContext))])
  }, [pageContext])

  const submitDraft = useCallback(async () => {
    const text = draft.trim()
    if (text === '' || isAwaitingReply) return

    setDraft('')
    const user = userMessage(text)
    setMessages((m) => [...m, user])
    setIsAwaitingReply(true)

    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    try {
      const reply = await sendAssistantMessage(text, pageContext, { signal: ac.signal })
      setMessages((m) => [...m, assistantMessage(reply)])
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setMessages((m) => [
        ...m,
        assistantMessage(
          'Something went wrong while generating a reply. Please try again in a moment.',
        ),
      ])
    } finally {
      if (abortRef.current === ac) {
        abortRef.current = null
        setIsAwaitingReply(false)
      }
    }
  }, [draft, isAwaitingReply, pageContext])

  useEffect(() => {
    if (panelState !== 'open') return
    const id = window.requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(id)
  }, [panelState])

  useEffect(() => () => abortRef.current?.abort(), [])

  return {
    pageContext,
    panelState,
    messages,
    draft,
    setDraft,
    isAwaitingReply,
    inputRef,
    openPanel,
    minimizePanel,
    expandPanel,
    closePanel,
    clearChat,
    submitDraft,
  }
}
