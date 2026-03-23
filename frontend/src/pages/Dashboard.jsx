import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { taskAPI, workspaceAPI, projectAPI } from '../services/api'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats,   setStats]   = useState({ tasks:3, done:2, ws:3, proj:5})
  const [recent,  setRecent]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      taskAPI.list({ limit:200 }),
      taskAPI.list({ status:'completed', limit:200 }),
      workspaceAPI.list(),
      projectAPI.list(),
      taskAPI.list({ limit:5 }),
    ]).then(([all, done, ws, proj, top5]) => {
      setStats({ tasks:all.data.length, done:done.data.length, ws:ws.data.length, proj:proj.data.length })
      setRecent(top5.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <Layout title="Dashboard">
      <div className="ph">
        <div>
          <div className="ph-title">Welcome back, {user?.username} 👋</div>
          <div className="ph-sub">Overview of your workspace activity</div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/tasks')}>All Tasks →</button>
      </div>

      <div className="stats">
        <div className="stat-card">
          <div className="stat-label">My Tasks</div>
          <div className="stat-val" style={{ color:'var(--accent)' }}>{stats.tasks}</div>
          <div className="stat-sub">Total assigned</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Completed</div>
          <div className="stat-val" style={{ color:'var(--green)' }}>{stats.done}</div>
          <div className="stat-sub">Tasks finished</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Workspaces</div>
          <div className="stat-val" style={{ color:'var(--accent2)' }}>{stats.ws}</div>
          <div className="stat-sub">Member of</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Projects</div>
          <div className="stat-val" style={{ color:'var(--yellow)' }}>{stats.proj}</div>
          <div className="stat-sub">Active projects</div>
        </div>
      </div>

      <div className="card tbl-card">
        <div className="card-head" style={{ padding:'16px 20px 0' }}>
          <span className="card-title">Recent Tasks</span>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tasks')}>View all</button>
        </div>
        {loading ? (
          <p style={{ padding:20, color:'var(--text2)' }}>Loading…</p>
        ) : recent.length === 0 ? (
          <div className="empty"><div className="empty-icon">✅</div><h3>No tasks yet</h3></div>
        ) : (
          <table className="tbl">
            <thead><tr><th>Title</th><th>Status</th><th>Priority</th><th>Due Date</th></tr></thead>
            <tbody>
              {recent.map((t) => (
                <tr key={t.id} style={{ cursor:'pointer' }} onClick={() => navigate('/tasks')}>
                  <td style={{ color:'var(--text)', fontWeight:500 }}>{t.title}</td>
                  <td><span className={`badge badge-${t.status}`}>{t.status.replace('_',' ')}</span></td>
                  <td><span className={`badge badge-${t.priority}`}>{t.priority}</span></td>
                  <td>{t.due_date ? new Date(t.due_date).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  )
}