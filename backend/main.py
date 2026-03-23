"""
TeamFlow – Team Collaboration & Workflow Management Platform
FastAPI + PostgreSQL + SQLAlchemy + WebSockets + JWT RBAC
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.db.database import Base, engine
from app.models import models

from app.api.auth          import router as auth_router, admin_router
from app.api.workspaces    import router as workspace_router, team_router
from app.api.tasks         import router as task_router, project_router
from app.api.notifications import activity_router, notification_router, websocket_only_router

Base.metadata.create_all(bind=engine)
os.makedirs("uploads", exist_ok=True)

app = FastAPI(
    title="TeamFlow API",
    description="Team Collaboration & Workflow Management Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth_router)           # Module 1 – Auth
app.include_router(admin_router)          # Module 1 – RBAC
app.include_router(workspace_router)      # Module 2 – Workspaces
app.include_router(team_router)           # Module 2 – Teams
app.include_router(project_router)        # Module 3 – Projects
app.include_router(task_router)           # Module 3 – Tasks & Kanban
app.include_router(notification_router)   # Module 4 – Notification HTTP endpoints
app.include_router(websocket_only_router) # Module 4 – WS /ws/notifications
app.include_router(activity_router)       # Module 5 – Activity Logs



@app.get("/", tags=["Health"])
def root():
    return {"message": "TeamFlow API is running ⚡", "docs": "/docs", "redoc": "/redoc"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}