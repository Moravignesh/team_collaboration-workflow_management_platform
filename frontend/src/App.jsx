import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth }        from './context/AuthContext.jsx'
import { NotificationProvider }         from './context/NotificationContext.jsx'
import Login       from './pages/Login.jsx'
import Register    from './pages/Register.jsx'
import Dashboard   from './pages/Dashboard.jsx'
import Workspaces  from './pages/Workspaces.jsx'
import Projects    from './pages/Projects.jsx'
import KanbanBoard from './pages/KanbanBoard.jsx'
import Tasks       from './pages/Tasks.jsx'
import ActivityLog from './pages/ActivityLog.jsx'
import AdminPanel  from './pages/AdminPanel.jsx'

// ── Role-based route guard ────────────────────────────────────────────────
function Guard({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'var(--text2)' }}>
      Loading…
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"    element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
      <Route path="/"         element={<Navigate to="/dashboard" />} />

      {/* Any authenticated user */}
      <Route path="/dashboard"                 element={<Guard><Dashboard /></Guard>} />
      <Route path="/workspaces"                element={<Guard><Workspaces /></Guard>} />
      <Route path="/projects"                  element={<Guard><Projects /></Guard>} />
      <Route path="/projects/:projectId/board" element={<Guard><KanbanBoard /></Guard>} />
      <Route path="/tasks"                     element={<Guard><Tasks /></Guard>} />

      {/* Admin + Manager only */}
      <Route path="/activity" element={<Guard roles={['admin','manager']}><ActivityLog /></Guard>} />

      {/* Admin only */}
      <Route path="/admin" element={<Guard roles={['admin']}><AdminPanel /></Guard>} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <AppRoutes />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
