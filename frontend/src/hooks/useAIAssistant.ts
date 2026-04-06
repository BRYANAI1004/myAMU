import { useCallback, useEffect, useRef, useState } from 'react'
import type { AIAssistantPageContext } from '../data/aiMockReplies'
import { getWelcomeLines } from '../data/aiMockReplies'
import { buildApiUrl } from '../lib/api'
import type { SendAssistantAttachmentPayload } from '../lib/sendAssistantMessage'

export type AIAssistantChatRole = 'user' | 'assistant'

export type AIAssistantChatMessage = {
  id: string
  role: AIAssistantChatRole
  content: string
  createdAt: number
  /** Present only for the initial welcome message — renders cat + structured copy in the panel. */
  welcomeLines?: string[]
}

export type AIAssistantAttachment = SendAssistantAttachmentPayload

const AMU_AI_OPEN = 'amu-ai-open'
const AMU_AI_MESSAGES = 'amu-ai-messages'

function newId(): string {
  return crypto.randomUUID()
}

function assistantWelcomeMessage(pageContext: AIAssistantPageContext): AIAssistantChatMessage {
  const lines = getWelcomeLines(pageContext)
  return {
    id: newId(),
    role: 'assistant',
    content: lines.join('\n\n'),
    createdAt: Date.now(),
    welcomeLines: [...lines],
  }
}

function assistantTextMessage(content: string): AIAssistantChatMessage {
  return { id: newId(), role: 'assistant', content, createdAt: Date.now() }
}

function userMessage(content: string): AIAssistantChatMessage {
  return { id: newId(), role: 'user', content, createdAt: Date.now() }
}

function formatSourcesAppendix(sources: unknown): string {
  if (!Array.isArray(sources) || sources.length === 0) return ''
  const lines: string[] = []
  for (const item of sources) {
    if (typeof item !== 'object' || item === null) continue
    const o = item as Record<string, unknown>
    const src = typeof o.source === 'string' ? o.source : ''
    if (!src) continue
    const chunk =
      typeof o.chunkIndex === 'number' && Number.isFinite(o.chunkIndex)
        ? o.chunkIndex
        : null
    lines.push(chunk != null ? `- ${src} (chunk ${chunk})` : `- ${src}`)
  }
  if (lines.length === 0) return ''
  return `\n\nSources:\n${lines.join('\n')}`
}

function isChatMessageRecord(v: unknown): v is AIAssistantChatMessage {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  if (typeof o.id !== 'string' || (o.role !== 'user' && o.role !== 'assistant')) return false
  if (typeof o.content !== 'string' || typeof o.createdAt !== 'number') return false
  if (o.welcomeLines !== undefined) {
    if (!Array.isArray(o.welcomeLines) || !o.welcomeLines.every((x) => typeof x === 'string')) {
      return false
    }
  }
  return true
}

function readStoredMessages(): AIAssistantChatMessage[] | null {
  try {
    const raw = localStorage.getItem(AMU_AI_MESSAGES)
    if (raw == null || raw === '') return null
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    const out: AIAssistantChatMessage[] = []
    for (const item of parsed) {
      if (isChatMessageRecord(item)) out.push({ ...item, welcomeLines: item.welcomeLines })
    }
    return out.length > 0 ? out : null
  } catch {
    return null
  }
}

function persistMessages(messages: AIAssistantChatMessage[]): void {
  try {
    localStorage.setItem(AMU_AI_MESSAGES, JSON.stringify(messages))
  } catch {
    /* ignore */
  }
}

export type AIAssistantPanelState = 'closed' | 'open' | 'minimized'

function readPanelOpen(): AIAssistantPanelState {
  try {
    const v = localStorage.getItem(AMU_AI_OPEN)
    if (v === 'open' || v === 'minimized' || v === 'closed') return v
  } catch {
    /* ignore */
  }
  return 'closed'
}

function persistPanelOpen(state: AIAssistantPanelState): void {
  try {
    localStorage.setItem(AMU_AI_OPEN, state)
  } catch {
    /* ignore */
  }
}

function buildInitialMessages(
  pageContext: AIAssistantPageContext,
  panelState: AIAssistantPanelState,
): AIAssistantChatMessage[] {
  const stored = readStoredMessages()
  if (stored && stored.length > 0) return stored
  if (panelState === 'open' || panelState === 'minimized') {
    return [assistantWelcomeMessage(pageContext)]
  }
  return []
}

export function useAIAssistant(pageContext: AIAssistantPageContext) {
  const [panelState, setPanelState] = useState<AIAssistantPanelState>(() => readPanelOpen())
  const [messages, setMessages] = useState<AIAssistantChatMessage[]>(() =>
    buildInitialMessages(pageContext, readPanelOpen()),
  )
  const [draft, setDraft] = useState('')
  const [attachments, setAttachments] = useState<AIAssistantAttachment[]>([])
  const [isAwaitingReply, setIsAwaitingReply] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    persistPanelOpen(panelState)
  }, [panelState])

  useEffect(() => {
    persistMessages(messages)
  }, [messages])

  const revokeAttachmentUrls = useCallback((items: AIAssistantAttachment[]) => {
    for (const a of items) {
      if (a.previewUrl) URL.revokeObjectURL(a.previewUrl)
    }
  }, [])

  const ensureWelcome = useCallback(() => {
    setMessages((prev) => {
      if (prev.length > 0) return prev
      return [assistantWelcomeMessage(pageContext)]
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
    setAttachments((prev) => {
      for (const a of prev) {
        if (a.previewUrl) URL.revokeObjectURL(a.previewUrl)
      }
      return []
    })
    setMessages([assistantWelcomeMessage(pageContext)])
  }, [pageContext])

  const addAttachments = useCallback((files: FileList | File[]) => {
    const list = Array.from(files)
    setAttachments((prev) => {
      const next = [...prev]
      for (const file of list) {
        const isImage = file.type.startsWith('image/')
        const id = newId()
        const previewUrl = isImage ? URL.createObjectURL(file) : undefined
        next.push({
          id,
          name: file.name,
          type: isImage ? 'image' : 'file',
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          file,
          previewUrl,
        })
      }
      return next
    })
  }, [])

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const found = prev.find((a) => a.id === id)
      if (found?.previewUrl) URL.revokeObjectURL(found.previewUrl)
      return prev.filter((a) => a.id !== id)
    })
  }, [])

  const submitDraft = useCallback(async () => {
    const text = draft.trim()
    if ((text === '' && attachments.length === 0) || isAwaitingReply) return

    const outgoingAttachments = attachments
    const userLine = text || (outgoingAttachments.length > 0 ? 'Sent file(s).' : '')

    if (userLine) {
      setMessages((m) => [...m, userMessage(userLine)])
    }
    setDraft('')
    setAttachments([])

    setIsAwaitingReply(true)

    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    try {
      const res = await fetch(buildApiUrl('/api/ai/ask'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userLine }),
        signal: ac.signal,
      })

      const ct = (res.headers.get('content-type') ?? '').toLowerCase()
      let data: unknown
      if (ct.includes('application/json')) {
        data = await res.json()
      } else {
        const snippet = (await res.text()).slice(0, 200)
        throw new Error(
          `Expected JSON from /api/ai/ask (HTTP ${res.status}). Body starts with: ${snippet || '(empty)'}`,
        )
      }

      if (!res.ok) {
        throw new Error(
          typeof (data as { error?: string }).error === 'string'
            ? (data as { error: string }).error
            : `Request failed (HTTP ${res.status})`,
        )
      }

      if (typeof data !== 'object' || data === null || typeof (data as { answer?: unknown }).answer !== 'string') {
        throw new Error('Invalid response: missing answer string')
      }

      const answer = (data as { answer: string; sources?: unknown }).answer
      const appendix = formatSourcesAppendix((data as { sources?: unknown }).sources)
      setMessages((m) => [...m, assistantTextMessage(answer + appendix)])
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      console.error(e)
      setMessages((m) => [
        ...m,
        assistantTextMessage(
          "Sorry, I'm having trouble connecting to the server. Please try again.",
        ),
      ])
    } finally {
      revokeAttachmentUrls(outgoingAttachments)
      if (abortRef.current === ac) {
        abortRef.current = null
        setIsAwaitingReply(false)
      }
    }
  }, [attachments, draft, isAwaitingReply, revokeAttachmentUrls])

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length !== 1) return prev
      const m = prev[0]
      if (m.role !== 'assistant' || !m.welcomeLines?.length) return prev
      return [assistantWelcomeMessage(pageContext)]
    })
  }, [pageContext])

  useEffect(() => {
    if (panelState !== 'open') return
    const id = window.requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(id)
  }, [panelState])

  useEffect(() => () => abortRef.current?.abort(), [])

  const attachmentsRef = useRef(attachments)
  attachmentsRef.current = attachments
  useEffect(
    () => () => {
      for (const a of attachmentsRef.current) {
        if (a.previewUrl) URL.revokeObjectURL(a.previewUrl)
      }
    },
    [],
  )

  return {
    pageContext,
    panelState,
    messages,
    draft,
    setDraft,
    attachments,
    addAttachments,
    removeAttachment,
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
