import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout.jsx'
import { activityAPI } from '../services/api'

const ICONS = { task:'✅', project:'📁', workspace:'🏢', team:'👥', user:'👤' }

function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 60)    return `${s}s ago`
  if (s < 3600)  return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}

const LIMIT = 20

export default function ActivityLog() {
  const [logs,   setLogs]   = useState([])
  const [filter, setFilter] = useState('')
  const [skip,   setSkip]   = useState(0)
  const [loading,setLoading]= useState(true)

  useEffect(() => {
    setLoading(true)
    const p = { skip, limit: LIMIT }
    if (filter) p.entity_type = filter
    activityAPI.list(p)
      .then((r) => setLogs(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filter, skip])

  return (
    <Layout title="Activity Log">
      <div className="ph">
        <div>
          <div className="ph-title">Activity Log</div>
          <div className="ph-sub">Complete audit trail — every important system action is recorded here</div>
        </div>
        <select className="fs" value={filter} onChange={(e) => { setFilter(e.target.value); setSkip(0) }} style={{ width:160 }}>
          <option value="">All Events</option>
          <option value="task">Tasks</option>
          <option value="project">Projects</option>
          <option value="workspace">Workspaces</option>
          <option value="user">Users</option>
        </select>
      </div>

      <div className="card">
        {loading ? (
          <p style={{ color:'var(--text2)', padding:16 }}>Loading…</p>
        ) : logs.length === 0 ? (
          <div className="empty"><div className="empty-icon">📜</div><h3>No activity yet</h3></div>
        ) : (
          <div className="timeline">
            {logs.map((log) => (
              <div className="tl-item" key={log.id}>
                <div className="tl-dot">{ICONS[log.entity_type] || '📌'}</div>
                <div className="tl-body">
                  <div className="tl-action">{log.action}</div>
                  <div className="tl-meta">
                    <span style={{ color:'var(--accent)' }}>User #{log.user_id}</span>
                    {' · '}
                    <span style={{ textTransform:'capitalize' }}>{log.entity_type}</span>
                    {log.entity_id ? ` #${log.entity_id}` : ''}
                    {' · '}{timeAgo(log.created_at)}
                    {' · '}
                    <span className="mono" style={{ fontSize:11, color:'var(--text3)' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ paddingTop:12, display:'flex', gap:8 }}>
          <button className="btn btn-secondary btn-sm" disabled={skip===0} onClick={() => setSkip((s) => Math.max(0, s-LIMIT))}>← Prev</button>
          <span className="muted small" style={{ padding:'5px 8px' }}>Showing {skip+1}–{skip+logs.length}</span>
          <button className="btn btn-secondary btn-sm" disabled={logs.length < LIMIT} onClick={() => setSkip((s) => s+LIMIT)}>Next →</button>
        </div>
      </div>
    </Layout>
  )
}
