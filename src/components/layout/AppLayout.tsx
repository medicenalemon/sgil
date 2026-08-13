import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

/**
 * Main application layout with sidebar and topbar.
 * Wraps all authenticated routes.
 */
export default function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <main className="page-container">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
