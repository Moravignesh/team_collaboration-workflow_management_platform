import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import Layout from '../components/Layout.jsx'
import { projectAPI, taskAPI, adminAPI } from '../services/api'
import { useAuth } from '../context/AuthContext.jsx'

const COLS = [
  { key:'backlog',     label:'Backlog',     icon:'📋', color:'var(--text2)'  },
  { key:'in_progress', label:'In Progress', icon:'⚡', color:'var(--accent)' },
  { key:'review',      label:'Review',      icon:'👀', color:'var(--yellow)' },
  { key:'completed',   label:'Completed',   icon:'✅', color:'var(--green)'  },
]

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

function TaskDetail({ task, users, onClose }) {
  const [attachments, setAttachments] = useState([])
  const [comments,    setComments]    = useState([])
  const [newComment,  setNewComment]  = useState('')
  const [uploading,   setUploading]   = useState(false)

  useEffect(() => {
    taskAPI.getAttachments(task.id).then((r) => setAttachments(r.data)).catch(() => {})
    taskAPI.getComments(task.id).then((r) => setComments(r.data)).catch(() => {})
  }, [task.id])

  const uploadFile = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setUploading(true)
    const fd = new FormData(); fd.append('file', file)
    try { const r = await taskAPI.uploadAttachment(task.id, fd); setAttachments((p) => [...p, r.data]) }
    catch (err) { alert(err.response?.data?.detail || 'Upload failed') }
    finally { setUploading(false); e.target.value = '' }
  }

  const postComment = async () => {
    if (!newComment.trim()) return
    const r = await taskAPI.addComment(task.id, { content: newComment })
    setComments((p) => [...p, r.data]); setNewComment('')
  }

  const assignee = users.find((u) => u.id === task.assigned_user_id)

  return (
    <Modal title="Task Details" onClose={onClose}>
      <h2 style={{ fontSize:17, fontWeight:700, marginBottom:8 }}>{task.title}</h2>
      <p style={{ color:'var(--text2)', fontSize:13.5, marginBottom:14 }}>{task.description || 'No description.'}</p>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:18 }}>
        <span className={`badge badge-${task.status}`}>{task.status.replace('_',' ')}</span>
        <span className={`badge badge-${task.priority}`}>Priority: {task.priority}</span>
        {task.due_date && <span className="badge" style={{ background:'var(--bg3)', color:'var(--text2)' }}>📅 {new Date(task.due_date).toLocaleDateString()}</span>}
        {assignee    && <span className="badge" style={{ background:'var(--bg3)', color:'var(--text)' }}>👤 {assignee.username}</span>}
      </div>

      {/* Attachments – Module 6 */}
      <div style={{ marginBottom:18 }}>
        <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:8 }}>Attachments ({attachments.length})</div>
        {attachments.map((a) => (
          <div key={a.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', background:'var(--bg3)', borderRadius:6, marginBottom:6, fontSize:13 }}>
            📎 <span style={{ flex:1 }}>{a.original_name}</span>
            <span className="muted small">({Math.round(a.file_size/1024)}KB)</span>
          </div>
        ))}
        <label className="btn btn-secondary btn-sm" style={{ cursor:'pointer', display:'inline-flex' }}>
          {uploading ? 'Uploading…' : '+ Upload File'}
          <input type="file" style={{ display:'none' }} onChange={uploadFile} accept=".pdf,.jpg,.jpeg,.png,.gif,.txt,.doc,.docx" />
        </label>
      </div>

      {/* Comments – Bonus */}
      <div>
        <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:8 }}>Comments ({comments.length})</div>
        {comments.map((c) => (
          <div key={c.id} style={{ padding:'8px 10px', background:'var(--bg3)', borderRadius:6, marginBottom:8 }}>
            <div style={{ fontSize:11, color:'var(--text3)', marginBottom:3 }}>{users.find((u) => u.id === c.user_id)?.username || `User #${c.user_id}`} · {new Date(c.created_at).toLocaleString()}</div>
            <div style={{ fontSize:13.5 }}>{c.content}</div>
          </div>
        ))}
        <div style={{ display:'flex', gap:8, marginTop:8 }}>
          <input className="fi" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Write a comment…" onKeyDown={(e) => e.key === 'Enter' && postComment()} />
          <button className="btn btn-primary btn-sm" onClick={postComment}>Post</button>
        </div>
      </div>
    </Modal>
  )
}

export default function KanbanBoard() {
  const { projectId } = useParams()
  const { user }      = useAuth()
  const canManage     = ['admin','manager'].includes(user?.role)
  const [project,  setProject]  = useState(null)
  const [board,    setBoard]    = useState({ backlog:[], in_progress:[], review:[], completed:[] })
  const [users,    setUsers]    = useState([])
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState(null)
  const [form,  setForm]  = useState({})
  const [error, setError] = useState('')
  const [busy,  setBusy]  = useState(false)

  useEffect(() => { loadBoard() }, [projectId])

  const loadBoard = async () => {
    try {
      const [pr, bd] = await Promise.all([projectAPI.get(projectId), projectAPI.getBoard(projectId)])
      setProject(pr.data); setBoard(bd.data)
      if (canManage) { const ur = await adminAPI.listUsers(); setUsers(ur.data) }
    } catch (_) {}
  }

  const onDragEnd = async ({ source, destination, draggableId }) => {
    if (!destination || source.droppableId === destination.droppableId) return
    const taskId = +draggableId; const newStat = destination.droppableId
    const task = board[source.droppableId].find((t) => t.id === taskId)
    setBoard((p) => ({
      ...p,
      [source.droppableId]:      p[source.droppableId].filter((t) => t.id !== taskId),
      [destination.droppableId]: [...p[destination.droppableId], { ...task, status: newStat }],
    }))
    try { await taskAPI.updateStatus(taskId, newStat) } catch (_) { loadBoard() }
  }

  const hc = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  const createTask = async () => {
    setError(''); setBusy(true)
    try {
      await taskAPI.create({ ...form, project_id: +projectId, assigned_user_id: form.assigned_user_id ? +form.assigned_user_id : null, priority: form.priority || 'medium', status: form.status || 'backlog' })
      setShowForm(false); setForm({}); loadBoard()
    } catch (e) { setError(e.response?.data?.detail || 'Error') } finally { setBusy(false) }
  }

  return (
    <Layout title={`Board: ${project?.name || '…'}`}>
      <div className="ph">
        <div><div className="ph-title">📋 {project?.name || 'Loading…'}</div><div className="ph-sub">Drag tasks between columns to update their status</div></div>
        {canManage && <button className="btn btn-primary" onClick={() => { setForm({ priority:'medium', status:'backlog' }); setError(''); setShowForm(true) }}>+ Add Task</button>}
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="kanban">
          {COLS.map((col) => (
            <div className="k-col" key={col.key}>
              <div className="k-col-head">
                <span className="k-col-title">{col.icon} <span style={{ color:col.color }}>{col.label}</span></span>
                <span className="k-count">{board[col.key]?.length || 0}</span>
              </div>
              <Droppable droppableId={col.key}>
                {(prov, snap) => (
                  <div className="k-body" ref={prov.innerRef} {...prov.droppableProps}
                    style={{ background: snap.isDraggingOver ? 'rgba(79,142,247,.06)' : undefined }}>
                    {(board[col.key] || []).map((task, idx) => (
                      <Draggable key={task.id} draggableId={String(task.id)} index={idx}>
                        {(p2, s2) => (
                          <div className={`task-card${s2.isDragging ? ' is-drag' : ''}`} ref={p2.innerRef} {...p2.draggableProps} {...p2.dragHandleProps} onClick={() => setSelected(task)}>
                            <div className="tc-title">{task.title}</div>
                            <div className="tc-meta">
                              <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                              {task.due_date && <span className="tc-due">📅 {new Date(task.due_date).toLocaleDateString()}</span>}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {prov.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {showForm && (
        <Modal title="Create Task" onClose={() => setShowForm(false)}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="fg"><label>Title</label><input className="fi" name="title" value={form.title||''} onChange={hc} placeholder="Task title" /></div>
          <div className="fg"><label>Description</label><textarea className="ft" name="description" value={form.description||''} onChange={hc} /></div>
          <div className="grid-2">
            <div className="fg"><label>Priority</label>
              <select className="fs" name="priority" value={form.priority||'medium'} onChange={hc}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
              </select>
            </div>
            <div className="fg"><label>Status</label>
              <select className="fs" name="status" value={form.status||'backlog'} onChange={hc}>
                {COLS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
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
      {selected && <TaskDetail task={selected} users={users} onClose={() => setSelected(null)} />}
    </Layout>
  )
}
