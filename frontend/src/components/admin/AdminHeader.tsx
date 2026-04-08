import { Link, useNavigate } from 'react-router-dom'
import { PORTAL_BRANDING_TITLE } from '../../branding'
import { useAdminAuth } from '../../context/AdminAuthContext'
import { IconLogout } from '../icons/PortalModuleIcons'

export function AdminHeader() {
  const navigate = useNavigate()
  const { logout } = useAdminAuth()

  function handleLogout() {
    logout()
    navigate('/admin/login', { replace: true })
  }

  return (
    <header className="portal-app-header admin-app-header" role="banner">
      <div className="portal-branding-bar" aria-label="School branding">
        <div className="portal-branding-bar-inner">
          <div className="portal-branding-bar-start">
            <Link
              to="/admin"
              className="portal-branding-bar-logo-link"
              aria-label={`${PORTAL_BRANDING_TITLE} — admin home`}
            >
              <img
                src="/AMULogo.png"
                alt=""
                className="portal-branding-bar-logo"
                decoding="async"
              />
            </Link>
            <span className="admin-portal__branding-title">{PORTAL_BRANDING_TITLE}</span>
          </div>
          <div className="portal-branding-bar-end">
            <div className="portal-branding-bar-actions">
              <button type="button" className="portal-logout-button" onClick={handleLogout}>
                <span className="portal-user-icon" aria-hidden>
                  <IconLogout width={17} height={17} />
                </span>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
