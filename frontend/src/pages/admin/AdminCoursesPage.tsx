import { useMemo, useState } from 'react'
import { MOCK_ADMIN_COURSES } from '../../data/adminMockData'

export function AdminCoursesPage() {
  const [q, setQ] = useState('')

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return MOCK_ADMIN_COURSES
    return MOCK_ADMIN_COURSES.filter(
      (r) => r.code.toLowerCase().includes(s) || r.title.toLowerCase().includes(s),
    )
  }, [q])

  return (
    <main className="admin-page">
      <div className="admin-page__toolbar">
        <h1 className="admin-page__title admin-page__title--inline">Courses</h1>
        <div className="admin-page__toolbar-actions">
          <input
            type="search"
            className="admin-input admin-input--search"
            placeholder="Search by course code or title"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search courses"
          />
          <button type="button" className="portal-btn portal-btn--primary">
            Add Course
          </button>
        </div>
      </div>

      <div className="portal-table-wrap admin-table-wrap">
        <table className="portal-table">
          <thead>
            <tr>
              <th scope="col">Course Code</th>
              <th scope="col">Course Title</th>
              <th scope="col">Credits</th>
              <th scope="col">Category</th>
              <th scope="col">Status</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code}>
                <td>{r.code}</td>
                <td>{r.title}</td>
                <td>{r.credits}</td>
                <td>{r.category}</td>
                <td>{r.status}</td>
                <td>
                  <button type="button" className="portal-btn portal-btn--secondary portal-btn--compact">
                    Edit
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
