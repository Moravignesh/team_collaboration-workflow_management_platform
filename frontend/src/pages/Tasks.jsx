import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout.jsx'
import { taskAPI, projectAPI, adminAPI } from '../services/api'
import { useAuth } from '../context/AuthContext.jsx'

function Modal({ title, onClose, children }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><span className="modal-title">{title}</span><button className="modal-x" onClick={onClose}>×</button></div>
        {children}
      </div>
    </div>
  )
}

const PAGE = 20

export default function Tasks() {
  const { user }  = useAuth()
  const canManage = ['admin','manager'].includes(user?.role)
  const [tasks,    setTasks]    = useState([])
  const [projects, setProjects] = useState([])
  const [users,    setUsers]    = useState([])
  const [filters,  setFilters]  = useState({ search:'', status:'', priority:'', project_id:'' })
  const [page,     setPage]     = useState(0)
  const [modal,    setModal]    = useState(false)
  const [form,  setForm]  = useState({})
  const [error, setError] = useState('')
  const [busy,  setBusy]  = useState(false)

  useEffect(() => {
    projectAPI.list().then((r) => setProjects(r.data)).catch(() => {})
    if (canManage) adminAPI.listUsers().then((r) => setUsers(r.data)).catch(() => {})
  }, [])

  useEffect(() => { loadTasks() }, [filters, page])

  const loadTasks = async () => {
    const p = { skip: page * PAGE, limit: PAGE }
    if (filters.status)     p.status     = filters.status
    if (filters.priority)   p.priority   = filters.priority
    if (filters.project_id) p.project_id = filters.project_id
    if (filters.search)     p.search     = filters.search
    try { const r = await taskAPI.list(p); setTasks(r.data) } catch (_) {}
  }

  const sf  = (e) => { setFilters((f) => ({ ...f, [e.target.name]: e.target.value })); setPage(0) }
  const hc  = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const createTask = async () => {
    setError(''); setBusy(true)
    try {
      await taskAPI.create({ ...form, project_id: +form.project_id, assigned_user_id: form.assigned_user_id ? +form.assigned_user_id : null, priority: form.priority||'medium', status: form.status||'backlog' })
      setModal(false); setForm({}); loadTasks()
    } catch (e) { setError(e.response?.data?.detail || 'Error') } finally { setBusy(false) }
  }

  const deleteTask    = async (id) => { if (!window.confirm('Delete this task?')) return; await taskAPI.delete(id); loadTasks() }
  const updateStatus  = async (id, status) => { await taskAPI.updateStatus(id, status); loadTasks() }

  const projMap = Object.fromEntries(projects.map((p) => [p.id, p.name]))
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.username]))

  return (
    <Layout title="My Tasks">
      <div className="ph">
        <div><div className="ph-title">Tasks</div><div className="ph-sub">Search, filter and manage all tasks</div></div>
        {canManage && <button className="btn btn-primary" onClick={() => { setForm({ priority:'medium', status:'backlog' }); setError(''); setModal(true) }}>+ New Task</button>}
      </div>

      {/* Filters + Search — Bonus */}
      <div className="filter-bar">
        <input  className="fi" name="search"     placeholder="🔍 Search tasks…"  value={filters.search}     onChange={sf} style={{ width:200 }} />
        <select className="fs" name="status"     value={filters.status}     onChange={sf} style={{ width:150 }}>
          <option value="">All Statuses</option><option value="backlog">Backlog</option><option value="in_progress">In Progress</option><option value="review">Review</option><option value="completed">Completed</option>
        </select>
        <select className="fs" name="priority"   value={filters.priority}   onChange={sf} style={{ width:140 }}>
          <option value="">All Priorities</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
        </select>
        <select className="fs" name="project_id" value={filters.project_id} onChange={sf} style={{ width:180 }}>
          <option value="">All Projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="card tbl-card">
        <table className="tbl">
          <thead><tr><th>Title</th><th>Project</th><th>Status</th><th>Priority</th><th>Assigned</th><th>Due</th>{canManage && <th></th>}</tr></thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign:'center', padding:36, color:'var(--text3)' }}>No tasks found</td></tr>
            ) : tasks.map((t) => (
              <tr key={t.id}>
                <td style={{ color:'var(--text)', fontWeight:500 }}>{t.title}</td>
                <td>{projMap[t.project_id] || `#${t.project_id}`}</td>
                <td>
                  <select value={t.status} onChange={(e) => updateStatus(t.id, e.target.value)}
                    style={{ background:'transparent', border:'none', color:'var(--text)', cursor:'pointer', fontFamily:'inherit', fontSize:12.5 }}>
                    <option value="backlog">Backlog</option><option value="in_progress">In Progress</option><option value="review">Review</option><option value="completed">Completed</option>
                  </select>
                </td>
                <td><span className={`badge badge-${t.priority}`}>{t.priority}</span></td>
                <td>{t.assigned_user_id ? (userMap[t.assigned_user_id] || `#${t.assigned_user_id}`) : '—'}</td>
                <td>{t.due_date ? new Date(t.due_date).toLocaleDateString() : '—'}</td>
                {canManage && <td><button className="btn btn-danger btn-xs" onClick={() => deleteTask(t.id)}>Delete</button></td>}
              </tr>
            ))}
          </tbody>
        </table>
        {/* Pagination — Bonus */}
        <div style={{ padding:'12px 16px', display:'flex', gap:8, alignItems:'center', borderTop:'1px solid var(--border)' }}>
          <button className="btn btn-secondary btn-sm" disabled={page===0} onClick={() => setPage((p) => p-1)}>← Prev</button>
          <span className="muted small">Page {page+1}</span>
          <button className="btn btn-secondary btn-sm" disabled={tasks.length < PAGE} onClick={() => setPage((p) => p+1)}>Next →</button>
        </div>
      </div>

      {modal && (
        <Modal title="Create Task" onClose={() => setModal(false)}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="fg"><label>Title</label><input className="fi" name="title" value={form.title||''} onChange={hc} /></div>
          <div className="fg"><label>Description</label><textarea className="ft" name="description" value={form.description||''} onChange={hc} /></div>
          <div className="fg"><label>Project</label>
            <select className="fs" name="project_id" value={form.project_id||''} onChange={hc}>
              <option value="">-- Select project --</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid-2">
            <div className="fg"><label>Priority</label>
              <select className="fs" name="priority" value={form.priority||'medium'} onChange={hc}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
              </select>
            </div>
            <div className="fg"><label>Status</label>
              <select className="fs" name="status" value={form.status||'backlog'} onChange={hc}>
                <option value="backlog">Backlog</option><option value="in_progress">In Progress</option><option value="review">Review</option><option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <div className="fg"><label>Assign To</label>
            <select className="fs" name="assigned_user_id" value={form.assigned_user_id||''} onChange={hc}>
              <option value="">-- Unassigned --</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.username}</option>)}
            </select>
          </div>
          <div className="fg"><label>Due Date</label><input className="fi" type="datetime-local" name="due_date" value={form.due_date||''} onChange={hc} /></div>
          <button className="btn btn-primary" onClick={createTask} disabled={busy} style={{ width:'100%', justifyContent:'center' }}>{busy ? 'Creating…' : 'Create Task'}</button>
        </Modal>
      )}
    </Layout>
  )
}
