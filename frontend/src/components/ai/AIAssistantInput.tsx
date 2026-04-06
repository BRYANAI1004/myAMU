import type { Ref } from 'react'

type AIAssistantInputProps = {
  id: string
  value: string
  onChange: (next: string) => void
  onSubmit: () => void
  disabled?: boolean
  inputRef: Ref<HTMLTextAreaElement>
}

export function AIAssistantInput({
  id,
  value,
  onChange,
  onSubmit,
  disabled,
  inputRef,
}: AIAssistantInputProps) {
  return (
    <div className="portal-ai-assistant-compose">
      <label htmlFor={id} className="visually-hidden">
        Message to AMU AI Assistant
      </label>
      <textarea
        ref={inputRef}
        id={id}
        className="portal-ai-assistant-input"
        rows={2}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || e.shiftKey) return
          e.preventDefault()
          onSubmit()
        }}
        placeholder="Ask a question…"
        autoComplete="off"
      />
      <button
        type="button"
        className="portal-ai-assistant-send"
        onClick={onSubmit}
        disabled={disabled || value.trim() === ''}
        aria-label="Send message"
      >
        Send
      </button>
    </div>
  )
}
