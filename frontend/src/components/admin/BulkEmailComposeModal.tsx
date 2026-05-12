import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from 'react'
import {
  fetchAdminEmailProfiles,
  sendAdminBulkEmail,
  type AdminEmailProfile,
  type SendAdminBulkEmailResponse,
} from '../../lib/api'

export type BulkEmailCandidate = {
  studentId: string
  name: string
  /** AMU-issued email; null when not on file. */
  amuEmail: string | null
  /** Personal email from legacy `students.email`. */
  personalEmail: string | null
}

export type BulkEmailComposeModalProps = {
  /** Selected students with both potential emails. The modal picks recipients based on the user's chosen field. */
  candidates: BulkEmailCandidate[]
  /** Called when the user closes the modal (cancel, backdrop, esc, or after send). */
  onClose: () => void
  /** Optional callback fired after a successful send (e.g. to surface a status line on the page). */
  onSent?: (response: SendAdminBulkEmailResponse) => void
}

const SUBJECT_MAX = 200
const BODY_MAX = 50_000

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type EmailFieldChoice = 'amu-first' | 'personal-first' | 'amu-only' | 'personal-only'

const EMAIL_FIELD_OPTIONS: Array<{
  value: EmailFieldChoice
  label: string
  hint: string
}> = [
  {
    value: 'amu-first',
    label: 'AMU email (fall back to personal)',
    hint: 'Sends to the AMU address; uses personal when no AMU is on file.',
  },
  {
    value: 'personal-first',
    label: 'Personal email (fall back to AMU)',
    hint: 'Sends to the personal address; uses AMU when no personal is on file.',
  },
  {
    value: 'amu-only',
    label: 'AMU email only',
    hint: 'Skips students without an AMU email on file.',
  },
  {
    value: 'personal-only',
    label: 'Personal email only',
    hint: 'Skips students without a personal email on file.',
  },
]

function backdropMouseDown(
  e: MouseEvent<HTMLDivElement>,
  onClose: () => void,
  disabled: boolean,
) {
  if (disabled) return
  if (e.target === e.currentTarget) onClose()
}

type Resolved = {
  recipients: string[]
  missing: BulkEmailCandidate[]
  amuUsed: number
  personalUsed: number
}

function resolveRecipients(
  candidates: readonly BulkEmailCandidate[],
  choice: EmailFieldChoice,
): Resolved {
  const seen = new Set<string>()
  const recipients: string[] = []
  const missing: BulkEmailCandidate[] = []
  let amuUsed = 0
  let personalUsed = 0
  for (const c of candidates) {
    const amu = c.amuEmail?.trim() ?? ''
    const personal = c.personalEmail?.trim() ?? ''
    const amuValid = amu !== '' && EMAIL_REGEX.test(amu)
    const personalValid = personal !== '' && EMAIL_REGEX.test(personal)
    let pick: { email: string; source: 'amu' | 'personal' } | null = null
    switch (choice) {
      case 'amu-only':
        if (amuValid) pick = { email: amu, source: 'amu' }
        break
      case 'personal-only':
        if (personalValid) pick = { email: personal, source: 'personal' }
        break
      case 'personal-first':
        if (personalValid) pick = { email: personal, source: 'personal' }
        else if (amuValid) pick = { email: amu, source: 'amu' }
        break
      case 'amu-first':
      default:
        if (amuValid) pick = { email: amu, source: 'amu' }
        else if (personalValid) pick = { email: personal, source: 'personal' }
        break
    }
    if (pick == null) {
      missing.push(c)
      continue
    }
    if (pick.source === 'amu') amuUsed += 1
    else personalUsed += 1
    const key = pick.email.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    recipients.push(pick.email)
  }
  return { recipients, missing, amuUsed, personalUsed }
}

export function BulkEmailComposeModal({
  candidates,
  onClose,
  onSent,
}: BulkEmailComposeModalProps) {
  const titleId = useId()
  const subjectId = useId()
  const bodyId = useId()
  const senderId = useId()
  const fieldId = useId()

  const [emailFieldChoice, setEmailFieldChoice] =
    useState<EmailFieldChoice>('amu-first')
  const [profiles, setProfiles] = useState<AdminEmailProfile[]>([])
  const [profilesLoading, setProfilesLoading] = useState(true)
  const [profilesError, setProfilesError] = useState<string | null>(null)
  const [selectedProfileId, setSelectedProfileId] = useState<string>('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SendAdminBulkEmailResponse | null>(null)

  const subjectRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    subjectRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !sending) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sending, onClose])

  useEffect(() => {
    const ac = new AbortController()
    setProfilesLoading(true)
    setProfilesError(null)
    fetchAdminEmailProfiles({ signal: ac.signal })
      .then((res) => {
        setProfiles(res.profiles)
        setSelectedProfileId(res.profiles[0]?.id ?? '')
      })
      .catch((err) => {
        if (ac.signal.aborted) return
        setProfilesError(
          err instanceof Error
            ? err.message
            : 'Could not load sender accounts.',
        )
      })
      .finally(() => {
        if (!ac.signal.aborted) setProfilesLoading(false)
      })
    return () => ac.abort()
  }, [])

  const resolved = useMemo(
    () => resolveRecipients(candidates, emailFieldChoice),
    [candidates, emailFieldChoice],
  )
  const recipients = resolved.recipients
  const missing = resolved.missing

  const subjectTrimmed = subject.trim()
  const bodyTrimmed = body.trim()
  const canSend =
    !sending &&
    !profilesLoading &&
    profiles.length > 0 &&
    selectedProfileId !== '' &&
    recipients.length > 0 &&
    subjectTrimmed !== '' &&
    bodyTrimmed !== '' &&
    subject.length <= SUBJECT_MAX &&
    body.length <= BODY_MAX

  const recipientPreviewLimit = 8
  const recipientPreview = recipients.slice(0, recipientPreviewLimit)
  const recipientOverflow = recipients.length - recipientPreview.length
  const selectedProfile = profiles.find((p) => p.id === selectedProfileId)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSend) return
    setSending(true)
    setError(null)
    setResult(null)
    try {
      const response = await sendAdminBulkEmail({
        recipients,
        subject: subjectTrimmed,
        body,
        recipientField: 'bcc',
        profileId: selectedProfileId,
      })
      setResult(response)
      if (response.delivered) {
        onSent?.(response)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Email send failed.')
    } finally {
      setSending(false)
    }
  }

  function onCloseClick() {
    if (sending) return
    onClose()
  }

  return (
    <div
      className="bulk-email-modal-backdrop"
      role="presentation"
      onMouseDown={(e) => backdropMouseDown(e, onClose, sending)}
    >
      <div
        className="bulk-email-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="bulk-email-modal__header">
          <h2 id={titleId} className="bulk-email-modal__title">
            New email
          </h2>
          <button
            type="button"
            className="bulk-email-modal__close"
            onClick={onCloseClick}
            disabled={sending}
            aria-label="Close compose window"
          >
            ×
          </button>
        </div>

        <form className="bulk-email-modal__form" onSubmit={onSubmit}>
          <div className="bulk-email-modal__row-2">
            <div className="bulk-email-modal__field">
              <label
                htmlFor={senderId}
                className="bulk-email-modal__field-label"
              >
                From
              </label>
              <select
                id={senderId}
                className="bulk-email-modal__select"
                value={selectedProfileId}
                disabled={sending || profilesLoading || profiles.length === 0}
                onChange={(e) => setSelectedProfileId(e.target.value)}
              >
                {profilesLoading ? (
                  <option value="">Loading senders…</option>
                ) : profiles.length === 0 ? (
                  <option value="">(no senders configured)</option>
                ) : (
                  profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                      {p.fromAddress && p.fromAddress !== p.label
                        ? ` <${p.fromAddress}>`
                        : ''}
                    </option>
                  ))
                )}
              </select>
              {profilesError ? (
                <p className="bulk-email-modal__hint bulk-email-modal__hint--error">
                  {profilesError}
                </p>
              ) : profiles.length === 0 && !profilesLoading ? (
                <p className="bulk-email-modal__hint">
                  No SMTP sender profiles are configured. Set <code>SMTP_PROFILES</code>{' '}
                  (or the legacy <code>SMTP_HOST</code>/<code>SMTP_USER</code>) in{' '}
                  <code>backend/.env</code> and restart.
                </p>
              ) : selectedProfile && selectedProfile.fromName ? (
                <p className="bulk-email-modal__hint">
                  Recipients will see this message from{' '}
                  <strong>{selectedProfile.fromName}</strong> &lt;
                  {selectedProfile.fromAddress}&gt;.
                </p>
              ) : null}
            </div>

            <div className="bulk-email-modal__field">
              <label
                htmlFor={fieldId}
                className="bulk-email-modal__field-label"
              >
                Use which student email
              </label>
              <select
                id={fieldId}
                className="bulk-email-modal__select"
                value={emailFieldChoice}
                disabled={sending}
                onChange={(e) =>
                  setEmailFieldChoice(e.target.value as EmailFieldChoice)
                }
              >
                {EMAIL_FIELD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="bulk-email-modal__hint">
                {EMAIL_FIELD_OPTIONS.find(
                  (o) => o.value === emailFieldChoice,
                )?.hint ?? ''}
              </p>
            </div>
          </div>

          <div className="bulk-email-modal__field bulk-email-modal__field--recipients">
            <span className="bulk-email-modal__field-label">
              Bcc{' '}
              <span className="bulk-email-modal__count">
                ({recipients.length} of {candidates.length} selected
                {resolved.amuUsed > 0 || resolved.personalUsed > 0
                  ? ` — ${resolved.amuUsed} AMU, ${resolved.personalUsed} personal`
                  : ''}
                )
              </span>
            </span>
            <div
              className="bulk-email-modal__chips"
              role="list"
              aria-label={`${recipients.length} recipient${recipients.length === 1 ? '' : 's'}`}
            >
              {recipients.length === 0 ? (
                <span className="bulk-email-modal__hint bulk-email-modal__hint--error">
                  No selected students have a usable email under this rule.
                </span>
              ) : (
                <>
                  {recipientPreview.map((email) => (
                    <span
                      key={email}
                      className="bulk-email-modal__chip"
                      role="listitem"
                      title={email}
                    >
                      {email}
                    </span>
                  ))}
                  {recipientOverflow > 0 ? (
                    <span
                      className="bulk-email-modal__chip bulk-email-modal__chip--overflow"
                      role="listitem"
                      title={recipients.slice(recipientPreviewLimit).join(', ')}
                    >
                      +{recipientOverflow} more
                    </span>
                  ) : null}
                </>
              )}
            </div>
            {missing.length > 0 ? (
              <p className="bulk-email-modal__hint">
                {missing.length} selected student
                {missing.length === 1 ? '' : 's'} skipped (no usable email):{' '}
                {missing.slice(0, 5).map((m) => m.studentId).join(', ')}
                {missing.length > 5 ? ', …' : ''}
              </p>
            ) : null}
          </div>

          <div className="bulk-email-modal__field">
            <label htmlFor={subjectId} className="bulk-email-modal__field-label">
              Subject
            </label>
            <input
              id={subjectId}
              ref={subjectRef}
              type="text"
              className="bulk-email-modal__subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={SUBJECT_MAX}
              disabled={sending}
              required
              autoComplete="off"
            />
          </div>

          <div className="bulk-email-modal__field bulk-email-modal__field--body">
            <label htmlFor={bodyId} className="bulk-email-modal__field-label">
              Message
            </label>
            <textarea
              id={bodyId}
              className="bulk-email-modal__body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={BODY_MAX}
              disabled={sending}
              rows={14}
              required
              placeholder="Write your message here…"
            />
            <p className="bulk-email-modal__char-count" aria-live="polite">
              {body.length.toLocaleString()} / {BODY_MAX.toLocaleString()} characters
            </p>
          </div>

          {error ? (
            <p
              className="bulk-email-modal__alert bulk-email-modal__alert--error"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </p>
          ) : null}

          {result && result.delivered ? (
            <p
              className="bulk-email-modal__alert bulk-email-modal__alert--success"
              role="status"
              aria-live="polite"
            >
              Sent to {result.recipientCount} recipient
              {result.recipientCount === 1 ? '' : 's'}
              {result.profileId ? ` from ${result.profileId}` : ''}.
              {result.messageId ? ` (Message ID: ${result.messageId})` : ''}
            </p>
          ) : null}

          {result && !result.delivered ? (
            <p
              className="bulk-email-modal__alert bulk-email-modal__alert--warn"
              role="status"
              aria-live="polite"
            >
              {result.note ??
                'The server received your message but did not deliver it.'}
            </p>
          ) : null}

          <div className="bulk-email-modal__actions">
            <button
              type="button"
              className="portal-btn portal-btn--secondary"
              onClick={onCloseClick}
              disabled={sending}
            >
              {result && result.delivered ? 'Close' : 'Cancel'}
            </button>
            {!(result && result.delivered) ? (
              <button
                type="submit"
                className="portal-btn portal-btn--primary"
                disabled={!canSend}
              >
                {sending ? 'Sending…' : 'Send'}
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  )
}
