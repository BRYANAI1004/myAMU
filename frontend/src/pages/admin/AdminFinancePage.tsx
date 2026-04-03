import { useMemo, useState } from 'react'
import { MOCK_ADMIN_FINANCE } from '../../data/adminMockData'

export function AdminFinancePage() {
  const [q, setQ] = useState('')

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return MOCK_ADMIN_FINANCE
    return MOCK_ADMIN_FINANCE.filter(
      (r) => r.studentId.toLowerCase().includes(s) || r.name.toLowerCase().includes(s),
    )
  }, [q])

  return (
    <main className="admin-page">
      <div className="admin-page__toolbar">
        <h1 className="admin-page__title admin-page__title--inline">Finance</h1>
        <div className="admin-page__toolbar-actions admin-page__toolbar-actions--wrap">
          <input
            type="search"
            className="admin-input admin-input--search"
            placeholder="Search by student ID or name"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search finance records"
          />
          <button type="button" className="portal-btn portal-btn--secondary">
            Post Charge
          </button>
          <button type="button" className="portal-btn portal-btn--primary">
            Record Payment
          </button>
        </div>
      </div>

      <div className="admin-finance-summary">
        <section className="admin-stat-card">
          <h2 className="admin-stat-card__label">Total Outstanding</h2>
          <p className="admin-stat-card__value">$3,340.50</p>
        </section>
        <section className="admin-stat-card">
          <h2 className="admin-stat-card__label">Paid This Term</h2>
          <p className="admin-stat-card__value">$13,959.50</p>
        </section>
        <section className="admin-stat-card">
          <h2 className="admin-stat-card__label">Overdue Accounts</h2>
          <p className="admin-stat-card__value">1</p>
        </section>
      </div>

      <div className="portal-table-wrap admin-table-wrap">
        <table className="portal-table">
          <thead>
            <tr>
              <th scope="col">Student ID</th>
              <th scope="col">Name</th>
              <th scope="col">Current Term</th>
              <th scope="col">Charges</th>
              <th scope="col">Payments</th>
              <th scope="col">Outstanding</th>
              <th scope="col">Status</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.studentId}>
                <td>{r.studentId}</td>
                <td>{r.name}</td>
                <td>{r.currentTerm}</td>
                <td>{r.charges}</td>
                <td>{r.payments}</td>
                <td>{r.outstanding}</td>
                <td>{r.status}</td>
                <td>
                  <button type="button" className="portal-btn portal-btn--secondary portal-btn--compact">
                    View Ledger
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
