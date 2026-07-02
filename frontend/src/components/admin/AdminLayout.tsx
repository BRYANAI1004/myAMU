import { Outlet } from 'react-router-dom'
import { AdminPortalTermProvider } from '../../context/AdminPortalTermContext'
import { AdminHeader } from './AdminHeader'
import { AdminSidebar } from './AdminSidebar'

export function AdminLayout() {
  return (
    <AdminPortalTermProvider>
      <div className="admin-portal">
        <AdminSidebar />
        <div className="admin-portal__frame">
          <AdminHeader />
          <div className="admin-portal__main">
            <div className="admin-portal__main-content">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </AdminPortalTermProvider>
  )
}
