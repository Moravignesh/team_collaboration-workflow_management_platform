import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation }            from 'react-router-dom'
import { useAuth }                             from '../context/AuthContext.jsx'
import { useNotifications }                   from '../context/NotificationContext.jsx'

const ICONS = { task_assigned:'📋', task_status_changed:'🔄', workspace_invite:'🏢' }

function NotifPanel({ onClose }) {
  const { notifications, unread, markAllRead, clearAll } = useNotifications()
  const ref = useRef()
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [onClose])

  return (
    <div className="notif-panel" ref={ref}>
      <div className="np-head">
        <h4>Notifications{unread > 0 ? ` (${unread})` : ''}</h4>
        <div style={{ display:'flex', gap:6 }}>
          <button className="btn btn-ghost btn-xs" onClick={markAllRead}>Read all</button>
          <button className="btn btn-ghost btn-xs" onClick={clearAll}>Clear</button>
        </div>
      </div>
      {notifications.length === 0
        ? <div className="np-empty">🔔 No notifications yet</div>
        : notifications.map((n) => (
          <div key={n.id} className={`np-item${!n.read ? ' unread' : ''}`}>
            <span className="np-ico">{ICONS[n.type] || '🔔'}</span>
            <div>
              <div className="np-msg">{n.message}</div>
              <div className="np-time">{new Date(n.ts).toLocaleTimeString()}</div>
            </div>
          </div>
        ))
      }
    </div>
  )
}

export default function Layout({ children, title }) {
  const { user, logout }  = useAuth()
  const { unread }        = useNotifications()
  const navigate          = useNavigate()
  const location          = useLocation()
  const [showNotif, setShowNotif] = useState(false)

  const nav = [
    { path:'/dashboard',  icon:'🏠', label:'Dashboard'  },
    { path:'/workspaces', icon:'🏢', label:'Workspaces' },
    { path:'/projects',   icon:'📁', label:'Projects'   },
    { path:'/tasks',      icon:'✅', label:'My Tasks'   },
    { path:'/activity',   icon:'📜', label:'Activity Log', roles:['admin','manager'] },
    { path:'/admin',      icon:'⚙️', label:'Admin Panel',  roles:['admin'] },
  ].filter((i) => !i.roles || i.roles.includes(user?.role))

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">⚡ TeamFlow<small>Collaboration Platform</small></div>
        <nav className="sidebar-nav">
          <div className="nav-label">Menu</div>
          {nav.map((item) => (
            <button
              key={item.path}
              className={`nav-item${location.pathname === item.path ? ' active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="ni">{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="avatar">{user?.username?.[0]?.toUpperCase()}</div>
          <div className="user-meta">
            <div className="uname">{user?.username}</div>
            <span className={`role-pill ${user?.role}`}>{user?.role}</span>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={logout} title="Logout">↪</button>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <span className="topbar-title">{title}</span>
          <div className="topbar-right">
            <div style={{ position:'relative' }}>
              <button className="notif-btn" onClick={() => setShowNotif((v) => !v)}>
                🔔
                {unread > 0 && <span className="notif-dot">{unread > 9 ? '9+' : unread}</span>}
              </button>
              {showNotif && <NotifPanel onClose={() => setShowNotif(false)} />}
            </div>
          </div>
        </header>
        <div className="page">{children}</div>
      </div>
    </div>
  )
}
