import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout.jsx'
import { workspaceAPI, teamAPI, adminAPI } from '../services/api'
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

export default function Workspaces() {
  const { user }  = useAuth()
  const canManage = ['admin','manager'].includes(user?.role)
  const [workspaces, setWorkspaces] = useState([])
  const [teams,   setTeams]   = useState({})
  const [members, setMembers] = useState({})
  const [allUsers,setAllUsers]= useState([])
  const [modal,   setModal]   = useState(null)
  const [form,    setForm]    = useState({})
  const [error,   setError]   = useState('')
  const [busy,    setBusy]    = useState(false)

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    try {
      const res = await workspaceAPI.list()
      setWorkspaces(res.data)
      if (canManage) { const ur = await adminAPI.listUsers(); setAllUsers(ur.data) }
      res.data.forEach(async (ws) => {
        const [tr, mr] = await Promise.all([workspaceAPI.getTeams(ws.id), workspaceAPI.getMembers(ws.id)])
        setTeams((p) => ({ ...p, [ws.id]: tr.data }))
        setMembers((p) => ({ ...p, [ws.id]: mr.data }))
      })
    } catch (_) {}
  }

  const hc = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
  const open = (type, wsId = null) => { setForm({}); setError(''); setModal({ type, wsId }) }

  const createWS = async () => {
    setError(''); setBusy(true)
    try { await workspaceAPI.create(form); setModal(null); loadAll() }
    catch (e) { setError(e.response?.data?.detail || 'Error') } finally { setBusy(false) }
  }
  const inviteUser = async () => {
    setError(''); setBusy(true)
    try { await workspaceAPI.invite(modal.wsId, { user_id: +form.user_id }); setModal(null); loadAll() }
    catch (e) { setError(e.response?.data?.detail || 'Error') } finally { setBusy(false) }
  }
  const createTeam = async () => {
    setError(''); setBusy(true)
    try { await teamAPI.create({ team_name: form.team_name, workspace_id: modal.wsId }); setModal(null); loadAll() }
    catch (e) { setError(e.response?.data?.detail || 'Error') } finally { setBusy(false) }
  }

  return (
    <Layout title="Workspaces">
      <div className="ph">
        <div><div className="ph-title">Workspaces</div><div className="ph-sub">Manage organisations, teams and members</div></div>
        {canManage && <button className="btn btn-primary" onClick={() => open('ws')}>+ New Workspace</button>}
      </div>

      {workspaces.length === 0 ? (
        <div className="empty"><div className="empty-icon">🏢</div><h3>No workspaces yet</h3></div>
      ) : workspaces.map((ws) => (
        <div className="card" key={ws.id} style={{ marginBottom:14 }}>
          <div className="card-head">
            <div>
              <div className="card-title">🏢 {ws.workspace_name}</div>
              <div className="muted small" style={{ marginTop:3 }}>{ws.description || 'No description'}</div>
            </div>
            {canManage && (
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => open('invite', ws.id)}>+ Invite User</button>
                <button className="btn btn-secondary btn-sm" onClick={() => open('team',   ws.id)}>+ Add Team</button>
              </div>
            )}
          </div>
          <div className="grid-2" style={{ marginTop:12 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:8 }}>Teams</div>
              {!(teams[ws.id]?.length) ? <p className="muted small">No teams yet</p>
                : teams[ws.id].map((t) => (
                  <div key={t.id} style={{ padding:'6px 10px', background:'var(--bg3)', borderRadius:6, marginBottom:6, fontSize:13 }}>👥 {t.team_name}</div>
                ))
              }
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:8 }}>Members ({members[ws.id]?.length || 0})</div>
              {(members[ws.id] || []).slice(0,5).map((m) => (
                <div key={m.user_id} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <div className="avatar sm">{m.username?.[0]?.toUpperCase()}</div>
                  <span style={{ fontSize:13 }}>{m.username}</span>
                  <span className={`role-pill ${m.role}`}>{m.role}</span>
                </div>
              ))}
              {(members[ws.id]?.length || 0) > 5 && <div className="muted small">+{members[ws.id].length - 5} more</div>}
            </div>
          </div>
        </div>
      ))}

      {modal?.type === 'ws' && (
        <Modal title="Create Workspace" onClose={() => setModal(null)}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="fg"><label>Workspace Name</label><input className="fi" name="workspace_name" value={form.workspace_name||''} onChange={hc} placeholder="e.g. Engineering" /></div>
          <div className="fg"><label>Description</label><textarea className="ft" name="description" value={form.description||''} onChange={hc} placeholder="What is this workspace for?" /></div>
          <button className="btn btn-primary" onClick={createWS} disabled={busy} style={{ width:'100%', justifyContent:'center' }}>{busy ? 'Creating…' : 'Create Workspace'}</button>
        </Modal>
      )}
      {modal?.type === 'invite' && (
        <Modal title="Invite User" onClose={() => setModal(null)}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="fg"><label>Select User</label>
            <select className="fs" name="user_id" value={form.user_id||''} onChange={hc}>
              <option value="">-- Select a user --</option>
              {allUsers.map((u) => <option key={u.id} value={u.id}>{u.username} ({u.email})</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={inviteUser} disabled={busy} style={{ width:'100%', justifyContent:'center' }}>{busy ? 'Inviting…' : 'Send Invite'}</button>
        </Modal>
      )}
      {modal?.type === 'team' && (
        <Modal title="Create Team" onClose={() => setModal(null)}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="fg"><label>Team Name</label><input className="fi" name="team_name" value={form.team_name||''} onChange={hc} placeholder="e.g. Frontend Team" /></div>
          <button className="btn btn-primary" onClick={createTeam} disabled={busy} style={{ width:'100%', justifyContent:'center' }}>{busy ? 'Creating…' : 'Create Team'}</button>
        </Modal>
      )}
    </Layout>
  )
}
