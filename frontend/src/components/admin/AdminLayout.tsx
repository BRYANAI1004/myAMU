import { Outlet } from 'react-router-dom'
import { AdminHeader } from './AdminHeader'
import { AdminSidebar } from './AdminSidebar'

export function AdminLayout() {
  return (
    <div className="admin-portal">
      <AdminSidebar />
      <div className="admin-portal__frame">
        <AdminHeader />
        <div className="admin-portal__main">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
