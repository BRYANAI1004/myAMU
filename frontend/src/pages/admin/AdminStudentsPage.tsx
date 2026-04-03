import { useMemo, useState } from 'react'
import { MOCK_ADMIN_STUDENTS } from '../../data/adminMockData'

export function AdminStudentsPage() {
  const [q, setQ] = useState('')

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return MOCK_ADMIN_STUDENTS
    return MOCK_ADMIN_STUDENTS.filter(
      (r) =>
        r.studentId.toLowerCase().includes(s) ||
        r.name.toLowerCase().includes(s) ||
        r.email.toLowerCase().includes(s),
    )
  }, [q])

  return (
    <main className="admin-page">
      <div className="admin-page__toolbar">
        <h1 className="admin-page__title admin-page__title--inline">Students</h1>
        <div className="admin-page__toolbar-actions">
          <input
            type="search"
            className="admin-input admin-input--search"
            placeholder="Search by student ID, name, or email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search students"
          />
          <button type="button" className="portal-btn portal-btn--primary">
            Add Student
          </button>
        </div>
      </div>

      <div className="portal-table-wrap admin-table-wrap">
        <table className="portal-table">
          <thead>
            <tr>
              <th scope="col">Student ID</th>
              <th scope="col">Name</th>
              <th scope="col">Program</th>
              <th scope="col">Status</th>
              <th scope="col">Email</th>
              <th scope="col">Balance</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.studentId}>
                <td>{r.studentId}</td>
                <td>{r.name}</td>
                <td>{r.program}</td>
                <td>{r.status}</td>
                <td>{r.email}</td>
                <td>{r.balance}</td>
                <td>
                  <div className="admin-table-actions">
                    <button type="button" className="portal-btn portal-btn--secondary portal-btn--compact">
                      View
                    </button>
                    <button type="button" className="portal-btn portal-btn--secondary portal-btn--compact">
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
