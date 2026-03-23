# ⚡ TeamFlow – Team Collaboration & Workflow Management Platform

**FastAPI + PostgreSQL + React.js (Vite) + WebSockets + JWT RBAC**

---

## ✅ All 6 Modules Implemented

| Module | Feature | Status |
|--------|---------|--------|
| 1 | Role-Based Auth (Admin / Manager / Member) + Protected Routes | ✅ |
| 2 | Workspace & Team Management + Member Invite | ✅ |
| 3 | Kanban Board with Drag-and-Drop (backlog → in_progress → review → completed) | ✅ |
| 4 | Real-Time WebSocket Notifications | ✅ |
| 5 | Activity Logs & Audit Trail | ✅ |
| 6 | File Attachments + Task Comments | ✅ |
| + | Search, Filter, Pagination | ✅ |

---

## 🛠 Prerequisites

Install these before starting:

| Tool | Download |
|------|----------|
| Python 3.10+ | https://python.org/downloads |
| Node.js 18+  | https://nodejs.org |
| PostgreSQL 14+ | https://postgresql.org/download |
| VS Code | https://code.visualstudio.com |

---

## 🚀 Step-by-Step Setup

### STEP 1 — Create PostgreSQL Database

Open **pgAdmin** or **psql** and run:
```sql
CREATE DATABASE teamcollab;
```

---

### STEP 2 — Configure Backend Environment

Open `backend/.env` and update your database password:
```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/teamcollab
SECRET_KEY=your-super-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
UPLOAD_DIR=uploads
```

---

### STEP 3 — Start Backend

Open Terminal 1 in VS Code (`Ctrl + `` ` ``):

**Windows:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Mac / Linux:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

✅ Backend: **http://localhost:8000**
✅ API Docs: **http://localhost:8000/docs**

---

### STEP 4 — Start Frontend

Open Terminal 2 in VS Code:
```bash
cd frontend
npm install
npm run dev
```

✅ Frontend: **http://localhost:3000**

---

### STEP 5 — Make Your Account Admin (One-Time Setup)

1. Go to **http://localhost:3000/register** → create your account
2. Open **http://localhost:8000/docs**
3. Click **Authorize** → enter your email + password
4. Find `POST /admin/assign-role` → click **Try it out**
5. Enter: `{"user_id": 1, "role": "admin"}`
6. Click **Execute**
7. Now login at **http://localhost:3000** with full Admin access

---

## 📁 Project Structure

```
teamflow/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py           ← Module 1: Register, Login, Assign Role
│   │   │   ├── workspaces.py     ← Module 2: Workspaces, Teams, Members
│   │   │   ├── tasks.py          ← Module 3 & 6: Tasks, Board, Attachments
│   │   │   └── notifications.py  ← Module 4 & 5: WebSocket, Activity Logs
│   │   ├── core/
│   │   │   ├── config.py         ← Environment settings
│   │   │   └── security.py       ← JWT + RBAC (require_role)
│   │   ├── db/database.py        ← SQLAlchemy engine + session
│   │   ├── models/models.py      ← All DB tables
│   │   ├── schemas/schemas.py    ← Pydantic request/response models
│   │   ├── services/
│   │   │   └── activity_service.py  ← Audit log helper
│   │   └── websockets/manager.py    ← WS connection manager
│   ├── main.py                   ← FastAPI app entry point
│   ├── requirements.txt
│   └── .env
└── frontend/
    ├── index.html                ← Vite root HTML
    ├── vite.config.js            ← Vite config + proxy
    ├── package.json
    └── src/
        ├── main.jsx              ← React entry point
        ├── App.jsx               ← Router + Protected Routes
        ├── index.css             ← Global styles
        ├── context/
        │   ├── AuthContext.jsx        ← Auth state (Context API)
        │   └── NotificationContext.jsx ← WS + notif state (Context API)
        ├── components/
        │   └── Layout.jsx        ← Sidebar, Topbar, Notification bell
        ├── pages/
        │   ├── Login.jsx
        │   ├── Register.jsx
        │   ├── Dashboard.jsx
        │   ├── Workspaces.jsx    ← Workspace + team management
        │   ├── Projects.jsx
        │   ├── KanbanBoard.jsx   ← Drag-and-drop board
        │   ├── Tasks.jsx         ← Task list with filters
        │   ├── ActivityLog.jsx   ← Audit timeline
        │   └── AdminPanel.jsx    ← User role management
        └── services/
            └── api.js            ← Axios API calls
```

---

## 🔌 API Endpoints

### Module 1 – Auth & RBAC
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | /auth/register | Public | Register new user |
| POST | /auth/login | Public | Login, get JWT token |
| GET | /auth/me | Any | Current user info |
| POST | /admin/assign-role | Admin | Change user role |
| GET | /admin/users | Admin | List all users |

### Module 2 – Workspaces & Teams
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | /workspaces | Admin/Manager | Create workspace |
| GET | /workspaces | Any | List workspaces |
| POST | /workspaces/{id}/invite | Admin/Manager | Invite user |
| GET | /workspaces/{id}/teams | Any | Get teams |
| GET | /workspaces/{id}/members | Any | Get members |
| POST | /teams | Admin/Manager | Create team |
| POST | /teams/{id}/members | Admin/Manager | Add team member |

### Module 3 – Projects & Kanban
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | /projects | Admin/Manager | Create project |
| GET | /projects | Any | List projects |
| GET | /projects/{id}/board | Any | Kanban board (grouped by status) |
| POST | /tasks | Admin/Manager | Create task |
| GET | /tasks | Any | List tasks (search, filter, paginate) |
| PATCH | /tasks/{id}/status | Any* | Move task column |
| PUT | /tasks/{id} | Admin/Manager | Update task |
| DELETE | /tasks/{id} | Admin/Manager | Delete task |

### Module 4 – WebSockets
| Endpoint | Description |
|----------|-------------|
| WS /ws/notifications?token=JWT | Real-time events |

### Module 5 – Activity Logs
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /activity-logs | Admin/Manager | Paginated audit trail |

### Module 6 – File Attachments
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | /tasks/{id}/attachments | Any | Upload file (max 10MB) |
| GET | /tasks/{id}/attachments | Any | List attachments |
| GET | /tasks/attachments/{id}/download | Any | Download file |
| POST | /tasks/{id}/comments | Any | Add comment |
| GET | /tasks/{id}/comments | Any | Get comments |

---

## 🗄 Database Schema

```
users              → id, username, email, hashed_password, role, is_active, created_at
workspaces         → id, workspace_name, description, owner_id, created_at
workspace_members  → id, workspace_id, user_id, joined_at
teams              → id, team_name, workspace_id, created_at
team_members       → id, team_id, user_id
projects           → id, name, description, workspace_id, created_by, created_at
tasks              → id, title, description, project_id, assigned_user_id,
                     status, priority, due_date, created_by, created_at, updated_at
attachments        → id, task_id, filename, original_name, file_size,
                     content_type, uploaded_by, uploaded_at
comments           → id, task_id, user_id, content, created_at
activity_logs      → id, user_id, action, entity_type, entity_id, details, created_at
```

---

## 🔧 Common Errors & Fixes

| Error | Fix |
|-------|-----|
| `psycopg2` install fails | `pip install psycopg2-binary` |
| DB connection refused | Start PostgreSQL service |
| CORS error in browser | Backend must run on port 8000 |
| `npm: command not found` | Install Node.js from nodejs.org |
| 401 Unauthorized | Token expired — log out and log in again |
| 403 Forbidden | Your role doesn't have permission |
| venv won't activate (Windows) | Run PowerShell as Admin: `Set-ExecutionPolicy RemoteSigned` |
| WebSocket not connecting | Check backend is running on port 8000 |

---

## 🖥 VS Code Extensions (Recommended)

- **Python** (Microsoft)
- **Pylance**
- **ES7+ React/Redux/React-Native snippets**
- **Prettier – Code formatter**
- **Thunder Client** (API testing like Postman, inside VS Code)
- **PostgreSQL** by Chris Kolkman
