import { Link } from 'react-router-dom'

const cards = [
  {
    title: 'Students',
    body: 'Manage student records, status, and portal access',
    to: '/admin/students',
    cta: 'Go to Students',
  },
  {
    title: 'Courses',
    body: 'Manage course catalog, offerings, and schedules',
    to: '/admin/courses',
    cta: 'Go to Courses',
  },
  {
    title: 'Finance',
    body: 'Manage charges, payments, and student balances',
    to: '/admin/finance',
    cta: 'Go to Finance',
  },
] as const

export function AdminDashboardPage() {
  return (
    <main className="admin-page">
      <h1 className="admin-page__title">Administrator Dashboard</h1>
      <p className="admin-page__lede portal-text-muted">
        Select a module to manage university operations.
      </p>
      <div className="admin-dashboard-grid">
        {cards.map(({ title, body, to, cta }) => (
          <section key={to} className="admin-dashboard-card">
            <h2 className="admin-dashboard-card__title">{title}</h2>
            <p className="admin-dashboard-card__body">{body}</p>
            <Link className="portal-btn portal-btn--primary admin-dashboard-card__cta" to={to}>
              {cta}
            </Link>
          </section>
        ))}
      </div>
    </main>
  )
}
