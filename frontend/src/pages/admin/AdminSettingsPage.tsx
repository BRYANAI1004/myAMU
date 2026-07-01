import { useAdminAuth } from '../../context/AdminAuthContext'
import { formatAdminRoleLabel } from '../../lib/adminAccess'
import { AdminLoginEmailPanel } from '../../components/admin/AdminLoginEmailPanel'

function dashText(value: string | null | undefined): string {
  const s = value?.trim() ?? ''
  return s.length > 0 ? s : '—'
}

function SettingsField({
  label,
  value,
  fullWidth,
}: {
  label: string
  value: string
  fullWidth?: boolean
}) {
  return (
    <div
      className={`admin-settings-field${fullWidth ? ' admin-settings-field--full' : ''}`}
    >
      <dt className="admin-settings-field__label">{label}</dt>
      <dd className="admin-settings-field__value">{value}</dd>
    </div>
  )
}

export function AdminSettingsPage() {
  const { isHydrated, user } = useAdminAuth()

  return (
    <main className="admin-page">
      <h1 className="admin-page__title">Setting</h1>
      <p className="admin-page__lede portal-card-note">
        Your administrator account and sign-in preferences.
      </p>

      {!isHydrated ? (
        <section className="portal-card admin-settings-card" aria-live="polite">
          <p className="portal-card-note">Loading account information…</p>
        </section>
      ) : user == null ? (
        <section className="portal-card admin-settings-card" role="alert">
          <p className="portal-card-note">Sign in to view your administrator profile.</p>
        </section>
      ) : (
        <div className="admin-settings-stack">
          <section
            className="portal-card admin-settings-card"
            aria-labelledby="admin-settings-profile-heading"
          >
            <h2 id="admin-settings-profile-heading" className="admin-settings-card__title">
              Account
            </h2>
            <dl className="admin-settings-grid">
              <SettingsField label="Display name" value={dashText(user.displayName)} />
              <SettingsField label="Username" value={dashText(user.username)} />
              <SettingsField label="Email" value={dashText(user.email)} fullWidth />
              <SettingsField label="Role" value={formatAdminRoleLabel(user.role)} />
            </dl>
          </section>

          <section className="portal-card admin-settings-card admin-settings-card--login-email">
            <AdminLoginEmailPanel ready />
          </section>
        </div>
      )}
    </main>
  )
}
