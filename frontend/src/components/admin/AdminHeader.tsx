import { Link, useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../../context/AdminAuthContext'

const MOCK_ADMIN_NAME = 'Li, Lillian'

export function AdminHeader() {
  const navigate = useNavigate()
  const { logout } = useAdminAuth()

  function handleLogout() {
    logout()
    navigate('/admin/login', { replace: true })
  }

  return (
    <header className="admin-header">
      <div className="admin-header__left">
        <Link to="/admin" className="admin-header__logo-link">
          <img
            className="admin-header__logo"
            src="/AMULogo.png"
            alt="Alhambra Medical University"
          />
        </Link>
        <span className="admin-header__title">Administrator Portal</span>
      </div>
      <div className="admin-header__right">
        <span className="admin-header__name">{MOCK_ADMIN_NAME}</span>
        <button type="button" className="admin-header__logout" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </header>
  )
}
