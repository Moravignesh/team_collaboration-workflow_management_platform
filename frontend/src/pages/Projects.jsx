import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { projectAPI, workspaceAPI } from '../services/api'
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

export default function Projects() {
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const canManage = ['admin','manager'].includes(user?.role)
  const [projects,   setProjects]   = useState([])
  const [workspaces, setWorkspaces] = useState([])
  const [showModal,  setShowModal]  = useState(false)
  const [form,  setForm]  = useState({})
  const [error, setError] = useState('')
  const [busy,  setBusy]  = useState(false)

  useEffect(() => {
    Promise.all([projectAPI.list(), workspaceAPI.list()])
      .then(([pr, ws]) => { setProjects(pr.data); setWorkspaces(ws.data) })
      .catch(() => {})
  }, [])

  const hc = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  const create = async () => {
    setError(''); setBusy(true)
    try {
      await projectAPI.create({ ...form, workspace_id: +form.workspace_id })
      setShowModal(false); setForm({})
      const pr = await projectAPI.list(); setProjects(pr.data)
    } catch (e) { setError(e.response?.data?.detail || 'Error') } finally { setBusy(false) }
  }

  const wsMap = Object.fromEntries(workspaces.map((w) => [w.id, w.workspace_name]))

  return (
    <Layout title="Projects">
      <div className="ph">
        <div><div className="ph-title">Projects</div><div className="ph-sub">Open a project to view its Kanban board</div></div>
        {canManage && <button className="btn btn-primary" onClick={() => { setForm({}); setError(''); setShowModal(true) }}>+ New Project</button>}
      </div>

      {projects.length === 0 ? (
        <div className="empty"><div className="empty-icon">📁</div><h3>No projects yet</h3></div>
      ) : (
        <div className="grid-3">
          {projects.map((p) => (
            <div className="card" key={p.id} style={{ cursor:'pointer' }} onClick={() => navigate(`/projects/${p.id}/board`)}>
              <div style={{ fontSize:32, marginBottom:10 }}>📁</div>
              <div className="card-title" style={{ fontSize:15 }}>{p.name}</div>
              <div className="muted small" style={{ marginTop:4, marginBottom:12 }}>{p.description || 'No description'}</div>
              <div style={{ fontSize:12, color:'var(--text3)', marginBottom:14 }}>🏢 {wsMap[p.workspace_id] || 'Unknown'}</div>
              <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/projects/${p.id}/board`) }}>Open Board →</button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="Create Project" onClose={() => setShowModal(false)}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="fg"><label>Project Name</label><input className="fi" name="name" value={form.name||''} onChange={hc} placeholder="e.g. Website Redesign" /></div>
          <div className="fg"><label>Description</label><textarea className="ft" name="description" value={form.description||''} onChange={hc} /></div>
          <div className="fg"><label>Workspace</label>
            <select className="fs" name="workspace_id" value={form.workspace_id||''} onChange={hc}>
              <option value="">-- Select workspace --</option>
              {workspaces.map((w) => <option key={w.id} value={w.id}>{w.workspace_name}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={create} disabled={busy} style={{ width:'100%', justifyContent:'center' }}>{busy ? 'Creating…' : 'Create Project'}</button>
        </Modal>
      )}
    </Layout>
  )
}
