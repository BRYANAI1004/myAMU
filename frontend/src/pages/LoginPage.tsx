import { useNavigate } from 'react-router-dom'

export function LoginPage() {
  const navigate = useNavigate()

  return (
    <div className="portal-shell portal-shell--login">
      <div className="portal-login-body">
        <div className="portal-login-stack">
          <img
            className="portal-login-logo"
            src="/AMULogo.png"
            alt="Alhambra Medical University"
          />
          <article className="portal-login-card">
            <h1 className="portal-login-card-title">
              Student Tuition Payment Portal
            </h1>
            <div className="portal-login-fields">
              <div className="portal-login-field">
                <label className="portal-login-label" htmlFor="login-student-id">
                  Student ID
                </label>
                <input
                  id="login-student-id"
                  className="portal-login-input"
                  type="text"
                  name="username"
                  autoComplete="username"
                />
              </div>
              <div className="portal-login-field">
                <label className="portal-login-label" htmlFor="login-password">
                  Password
                </label>
                <input
                  id="login-password"
                  className="portal-login-input"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                />
              </div>
            </div>
            <button
              type="button"
              className="portal-login-submit"
              onClick={() => navigate('/overview')}
            >
              Sign In
            </button>
            <nav className="portal-login-help-links" aria-label="Account help">
              <a className="portal-login-help-link" href="#">
                Forgot Student ID
              </a>
              <span className="portal-login-help-sep" aria-hidden="true">
                |
              </span>
              <a className="portal-login-help-link" href="#">
                Forgot Password
              </a>
            </nav>
          </article>
        </div>
      </div>
    </div>
  )
}
