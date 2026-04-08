import { Link, useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../../context/AdminAuthContext'

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
        <button type="button" className="admin-header__logout" onClick={handleLogout}>
          <img
            className="admin-header__logout-icon"
            src="/logout (1).svg"
            alt=""
            aria-hidden
          />
          <span>Logout</span>
        </button>
      </div>
    </header>
  )
}
