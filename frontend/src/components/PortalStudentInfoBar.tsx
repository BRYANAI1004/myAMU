import { useId, useState, type ChangeEvent } from 'react'
import { useAccount } from '../context/AccountContext'
import { useStudentPortalT } from '../LanguageContext'
import { formatMoney } from '../lib/formatMoney'
import { tryUploadStudentAvatar } from '../lib/studentAvatarUpload'

function initialsFromName(name: string, dash: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || (parts.length === 1 && parts[0] === '')) {
    return dash
  }
  return parts
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function readAvatarUrl(student: unknown): string | null {
  if (student == null || typeof student !== 'object') return null
  const raw = (student as { avatarUrl?: unknown }).avatarUrl
  if (typeof raw !== 'string') return null
  const t = raw.trim()
  return t.length > 0 ? t : null
}

export function PortalStudentInfoBar() {
  const t = useStudentPortalT()
  const inputId = useId()
  const { fetchedAccount, loading, error, authToken, reload } = useAccount()
  const dash = t('dashEm')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const showLiveData = !loading && !error && fetchedAccount !== null
  const displayName = showLiveData
    ? fetchedAccount.student.name
    : loading
      ? t('loadingEllipsis')
      : error
        ? t('accountUnavailable')
        : dash

  const balanceAmount = showLiveData
    ? formatMoney(fetchedAccount.summary.outstandingBalance)
    : dash

  const initials = showLiveData
    ? initialsFromName(fetchedAccount.student.name, dash)
    : loading
      ? t('welcomeLoading')
      : dash

  const avatarUrl = showLiveData ? readAvatarUrl(fetchedAccount.student) : null
  const canUpload = Boolean(authToken?.trim()) && showLiveData && !loading

  const onAvatarFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0] ?? null
    input.value = ''
    if (!file) return
    const token = authToken?.trim()
    if (!token) return

    setUploadError(null)
    setUploading(true)
    try {
      const result = await tryUploadStudentAvatar(token, file)
      if (result.ok) {
        reload()
      } else {
        const msg =
          result.reason === 'no_auth'
            ? t('studentAvatarNoAuth')
            : result.reason === 'invalid_type'
              ? t('studentAvatarInvalidType')
              : (result.message ?? t('studentAvatarUploadFailed'))
        setUploadError(msg)
      }
    } catch (e) {
      setUploadError(
        e instanceof Error ? e.message : t('studentAvatarUploadFailed'),
      )
    } finally {
      setUploading(false)
    }
  }

  const avatarInner =
    avatarUrl != null ? (
      <img
        src={avatarUrl}
        alt=""
        className="portal-student-info-bar-avatar__img"
      />
    ) : (
      initials
    )

  return (
    <section
      className="portal-student-info-bar"
      aria-label={t('signedInStudentAria')}
      aria-busy={loading || uploading}
    >
      <div className="portal-student-info-bar-inner">
        <div className="portal-student-info-bar-identity">
          {canUpload ? (
            <label
              htmlFor={inputId}
              className={`portal-student-info-bar-avatar portal-student-info-bar-avatar--interactive${uploading ? ' portal-student-info-bar-avatar--uploading' : ''}`}
              aria-label={t('studentAvatarChangePhotoAria')}
            >
              <input
                id={inputId}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="portal-student-info-bar-avatar__input"
                onChange={onAvatarFile}
                disabled={uploading}
              />
              {avatarInner}
            </label>
          ) : (
            <div className="portal-student-info-bar-avatar" aria-hidden="true">
              {avatarInner}
            </div>
          )}
          <div className="portal-student-info-bar-text">
            <p className="portal-student-info-bar-name">{displayName}</p>
            {uploadError ? (
              <p
                className="portal-student-info-bar-name"
                style={{ fontSize: '0.8em', opacity: 0.9, color: '#fecaca' }}
                role="status"
              >
                {uploadError}
              </p>
            ) : null}
            {error ? (
              <p
                className="portal-student-info-bar-name"
                style={{ fontSize: '0.85em', opacity: 0.85 }}
                role="status"
              >
                {error}
              </p>
            ) : null}
          </div>
        </div>
        <div className="portal-student-info-bar-balance">
          <span className="portal-student-info-bar-balance-label">
            {t('studentInfoBarBalance')}
          </span>
          <span className="portal-student-info-bar-balance-amount">
            {balanceAmount}
          </span>
        </div>
      </div>
    </section>
  )
}
