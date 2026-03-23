import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout.jsx'
import { adminAPI } from '../services/api'

export default function AdminPanel() {
  const [users, setUsers] = useState([])
  const [busy,  setBusy]  = useState({})
  const [msg,   setMsg]   = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    adminAPI.listUsers().then((r) => setUsers(r.data)).catch(() => {})
  }, [])

  const changeRole = async (userId, role) => {
    setBusy((b) => ({ ...b, [userId]: true }))
    setMsg(''); setError('')
    try {
      await adminAPI.assignRole({ user_id: userId, role })
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role } : u))
      setMsg(`✅ Role updated to "${role}" successfully`)
      setTimeout(() => setMsg(''), 3000)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to update role')
    } finally {
      setBusy((b) => ({ ...b, [userId]: false }))
    }
  }

  return (
    <Layout title="Admin Panel">
      <div className="ph">
        <div>
          <div className="ph-title">Admin Panel</div>
          <div className="ph-sub">Manage all users and their role assignments (RBAC)</div>
        </div>
        <div className="muted small" style={{ padding:'8px 14px', background:'var(--bg3)', borderRadius:8, border:'1px solid var(--border)' }}>
          {users.length} users registered
        </div>
      </div>

      {msg   && <div className="alert alert-success" style={{ marginBottom:16 }}>{msg}</div>}
      {error && <div className="alert alert-error"   style={{ marginBottom:16 }}>{error}</div>}

      {/* Role legend */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        {[
          { role:'admin',   desc:'Full access – manage users, roles, all data' },
          { role:'manager', desc:'Create projects, tasks, invite users' },
          { role:'member',  desc:'View and update only assigned tasks' },
        ].map(({ role, desc }) => (
          <div key={role} style={{ padding:'10px 14px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:8, display:'flex', alignItems:'center', gap:10 }}>
            <span className={`role-pill ${role}`}>{role}</span>
            <span className="muted small">{desc}</span>
          </div>
        ))}
      </div>

      <div className="card tbl-card">
        <table className="tbl">
          <thead>
            <tr>
              <th>User</th><th>Email</th><th>Current Role</th>
              <th>Change Role</th><th>Status</th><th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div className="avatar sm">{u.username[0].toUpperCase()}</div>
                    <span style={{ color:'var(--text)', fontWeight:500 }}>{u.username}</span>
                  </div>
                </td>
                <td>{u.email}</td>
                <td><span className={`role-pill ${u.role}`}>{u.role}</span></td>
                <td>
                  <div style={{ display:'flex', gap:6 }}>
                    {['admin','manager','member'].filter((r) => r !== u.role).map((r) => (
                      <button
                        key={r}
                        className="btn btn-secondary btn-xs"
                        disabled={busy[u.id]}
                        onClick={() => changeRole(u.id, r)}
                      >
                        → {r}
                      </button>
                    ))}
                  </div>
                </td>
                <td>
                  <span style={{ color: u.is_active ? 'var(--green)' : 'var(--red)', fontSize:12 }}>
                    {u.is_active ? '● Active' : '○ Inactive'}
                  </span>
                </td>
                <td className="muted small">{new Date(u.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}
