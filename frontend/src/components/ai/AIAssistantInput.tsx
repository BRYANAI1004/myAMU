import type { Ref } from 'react'
import { AI_ASSISTANT_COMING_SOON } from '@/lib/aiAssistantConfig'
import { useStudentPortalT } from '../../LanguageContext'

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
  const t = useStudentPortalT()

  const canSend = value.trim() !== '' && !AI_ASSISTANT_COMING_SOON
  const sendDisabled = Boolean(disabled || !canSend)
  const inputDisabled = Boolean(disabled || AI_ASSISTANT_COMING_SOON)

  return (
    <div className="portal-ai-assistant-input-stack">
      <p className="portal-ai-assistant-attribution">{t('poweredByAhmc')}</p>
      <p className="portal-ai-assistant-disclaimer">{t('aiAssist.disclaimer')}</p>

      <div className="portal-ai-assistant-compose">
        <label htmlFor={id} className="visually-hidden">
          {t('messageToAmuAssistant')}
        </label>
        <textarea
          ref={inputRef}
          id={id}
          className="portal-ai-assistant-input"
          rows={1}
          value={value}
          disabled={inputDisabled}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || e.shiftKey) return
            if (sendDisabled) return
            e.preventDefault()
            onSubmit()
          }}
          placeholder={
            AI_ASSISTANT_COMING_SOON
              ? t('askAQuestionComingSoonPlaceholder')
              : t('askAQuestionPlaceholder')
          }
          autoComplete="off"
        />
        <button
          type="button"
          className="portal-ai-assistant-send"
          onClick={onSubmit}
          disabled={sendDisabled}
          aria-label={t('sendMessage')}
        >
          {t('send')}
        </button>
      </div>
    </div>
  )
}
