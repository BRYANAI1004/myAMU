import { useRegistrationWindow } from './RegistrationWindowContext'

function RegistrationWindowIcon({ status }: { status: 'closed' | 'not_yet_open' }) {
  if (status === 'not_yet_open') {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r="8.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
        />
        <path
          d="M12 7.5v4.5l3 2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-3 0H10V7a2 2 0 1 1 4 0Z"
      />
    </svg>
  )
}

export function RegistrationWindowBanner() {
  const { bannerTitle, bannerDetail, status } = useRegistrationWindow()

  if (bannerTitle == null || bannerDetail == null || status === 'open') return null

  return (
    <div
      className={`portal-registration-window-banner portal-registration-window-banner--${status}`}
      role="status"
      aria-live="polite"
    >
      <div className="portal-registration-window-banner__icon" aria-hidden="true">
        <RegistrationWindowIcon status={status} />
      </div>
      <div className="portal-registration-window-banner__content">
        <p className="portal-registration-window-banner__title">{bannerTitle}</p>
        <p className="portal-registration-window-banner__detail">{bannerDetail}</p>
      </div>
    </div>
  )
}
