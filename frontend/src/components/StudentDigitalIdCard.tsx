import { useState, type ChangeEventHandler, type RefObject } from 'react'
import { PORTAL_BRANDING_TITLE } from '../branding'
import { useStudentPortalT } from '../LanguageContext'
import type { StudentProgram } from '../lib/api'

const DIGITAL_ID_LOGO_SRC = '/a51923_26efe4d2a45b41f6accb77d7be5bd8d2~mv2.png'
const APPLE_WALLET_BADGE_SRC = encodeURI('/add-to-apple-wallet-logo copy.png')
const GOOGLE_WALLET_BADGE_SRC = encodeURI('/googlewallet copy.png')

export type StudentDigitalIdCardProps = {
  fullName: string
  studentId: string
  program: StudentProgram
  track?: string | null
  photoUrl?: string | null
  photoPreviewUrl?: string | null
  photoInitials: string
  photoInputRef?: RefObject<HTMLInputElement>
  photoUploading?: boolean
  onPhotoSelect?: ChangeEventHandler<HTMLInputElement>
  hasSavedPhoto?: boolean
  hasPhotoDisplay?: boolean
  onPhotoError?: () => void
}

function WalletBadgeButton({
  src,
  label,
  onClick,
}: {
  src: string
  label: string
  onClick: () => void
}) {
  return (
    <button type="button" className="portal-digital-id__wallet-badge-btn" onClick={onClick}>
      <img src={src} alt="" className="portal-digital-id__wallet-badge" decoding="async" />
      <span className="portal-digital-id__wallet-badge-label">{label}</span>
    </button>
  )
}

export function StudentDigitalIdCard({
  fullName,
  studentId,
  program,
  track,
  photoUrl,
  photoPreviewUrl,
  photoInitials,
  photoInputRef,
  photoUploading = false,
  onPhotoSelect,
  hasSavedPhoto = false,
  hasPhotoDisplay = false,
  onPhotoError,
}: StudentDigitalIdCardProps) {
  const t = useStudentPortalT()
  const [walletComingSoon, setWalletComingSoon] = useState(false)
  const trackLabel = track?.trim() ? track.trim() : null
  const displayPhoto = photoPreviewUrl ?? photoUrl
  const photoAlt = photoPreviewUrl ? 'Selected profile photo preview' : 'Student ID photo'

  return (
    <section
      className="portal-digital-id-wrap"
      aria-labelledby="portal-digital-id-title"
    >
      <div className="portal-digital-id">
        <div className="portal-digital-id__watermark" aria-hidden="true">
          AMU
        </div>

        <header className="portal-digital-id__header">
          <div className="portal-digital-id__brand">
            <img
              src={DIGITAL_ID_LOGO_SRC}
              alt=""
              className="portal-digital-id__logo"
              width={52}
              height={52}
              decoding="async"
            />
            <div className="portal-digital-id__brand-text">
              <p className="portal-digital-id__brand-mark">AMU</p>
              <p className="portal-digital-id__brand-name">{PORTAL_BRANDING_TITLE}</p>
            </div>
          </div>
        </header>

        <div className="portal-digital-id__body">
          <div className="portal-digital-id__photo-block">
            <div className="portal-digital-id__photo-frame">
              {hasPhotoDisplay && displayPhoto ? (
                <img
                  src={displayPhoto}
                  alt={photoAlt}
                  className="portal-digital-id__photo"
                  onError={() => {
                    if (photoPreviewUrl) return
                    onPhotoError?.()
                  }}
                />
              ) : (
                <span className="portal-digital-id__photo-placeholder">{photoInitials}</span>
              )}
            </div>
            {onPhotoSelect ? (
              <label className="portal-digital-id__photo-action">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={onPhotoSelect}
                  className="portal-profile-photo-upload-input"
                  disabled={photoUploading}
                />
                {photoUploading
                  ? t('digitalIdPhotoUploading')
                  : hasSavedPhoto || hasPhotoDisplay
                    ? t('digitalIdChangePhoto')
                    : t('digitalIdAddPhoto')}
              </label>
            ) : null}
          </div>

          <div className="portal-digital-id__identity">
            <p className="portal-digital-id__label">{t('digitalIdStudentLabel')}</p>
            <h2 id="portal-digital-id-title" className="portal-digital-id__name">
              {fullName}
            </h2>
            <p className="portal-digital-id__id">{studentId}</p>
            <div className="portal-digital-id__program-block">
              <p className="portal-digital-id__program-label">{t('digitalIdProgramLabel')}</p>
              <p className="portal-digital-id__program">{program}</p>
              {trackLabel ? (
                <p className="portal-digital-id__track">
                  {t('track')}: {trackLabel}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <footer className="portal-digital-id__footer" aria-hidden="true">
          <span className="portal-digital-id__footer-gold" />
          <span className="portal-digital-id__footer-red" />
        </footer>
      </div>

      <div className="portal-digital-id__wallet-row">
        <div className="portal-digital-id__wallet-badges">
          <WalletBadgeButton
            src={APPLE_WALLET_BADGE_SRC}
            label={t('digitalIdAppleWallet')}
            onClick={() => setWalletComingSoon(true)}
          />
          <WalletBadgeButton
            src={GOOGLE_WALLET_BADGE_SRC}
            label={t('digitalIdGoogleWallet')}
            onClick={() => setWalletComingSoon(true)}
          />
        </div>
        {walletComingSoon ? (
          <p className="portal-digital-id__wallet-note" role="status">
            {t('digitalIdWalletComingSoon')}
          </p>
        ) : null}
      </div>
    </section>
  )
}
