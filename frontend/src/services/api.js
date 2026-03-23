import axios from 'axios'

// Vite proxy handles routing to http://localhost:8000
// So we use relative URLs here

const api = axios.create({ baseURL: '', timeout: 15000 })
// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Global 401 handler
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (email, password) => {
    const p = new URLSearchParams()
    p.append('username', email)
    p.append('password', password)
    return api.post('/auth/login', p, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
  },
  me: () => api.get('/auth/me'),
}

// ── Admin ─────────────────────────────────────────────────────────────────
export const adminAPI = {
  listUsers:  ()     => api.get('/admin/users'),
  assignRole: (data) => api.post('/admin/assign-role', data),
}

// ── Workspaces ────────────────────────────────────────────────────────────
export const workspaceAPI = {
  list:       ()         => api.get('/workspaces'),
  create:     (data)     => api.post('/workspaces', data),
  get:        (id)       => api.get(`/workspaces/${id}`),
  invite:     (id, data) => api.post(`/workspaces/${id}/invite`, data),
  getTeams:   (id)       => api.get(`/workspaces/${id}/teams`),
  getMembers: (id)       => api.get(`/workspaces/${id}/members`),
}

// ── Teams ─────────────────────────────────────────────────────────────────
export const teamAPI = {
  create:    (data)     => api.post('/teams', data),
  addMember: (id, data) => api.post(`/teams/${id}/members`, data),
  getMembers:(id)       => api.get(`/teams/${id}/members`),
}

// ── Projects ──────────────────────────────────────────────────────────────
export const projectAPI = {
  list:     (wsId) => api.get('/projects', { params: wsId ? { workspace_id: wsId } : {} }),
  create:   (data) => api.post('/projects', data),
  get:      (id)   => api.get(`/projects/${id}`),
  getBoard: (id)   => api.get(`/projects/${id}/board`),
}

// ── Tasks ─────────────────────────────────────────────────────────────────
export const taskAPI = {
  list:             (params) => api.get('/tasks', { params }),
  create:           (data)   => api.post('/tasks', data),
  get:              (id)     => api.get(`/tasks/${id}`),
  update:           (id, d)  => api.put(`/tasks/${id}`, d),
  updateStatus:     (id, s)  => api.patch(`/tasks/${id}/status`, { status: s }),
  delete:           (id)     => api.delete(`/tasks/${id}`),
  uploadAttachment: (id, fd) => api.post(`/tasks/${id}/attachments`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getAttachments: (id)   => api.get(`/tasks/${id}/attachments`),
  addComment:     (id, d)=> api.post(`/tasks/${id}/comments`, d),
  getComments:    (id)   => api.get(`/tasks/${id}/comments`),
}

// ── Activity Logs ─────────────────────────────────────────────────────────
export const activityAPI = {
  list: (params) => api.get('/activity-logs', { params }),
}

export default api
