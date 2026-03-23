import os
import uuid
import aiofiles
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import Task, Project, Attachment, Comment, User, TaskStatusEnum
from app.schemas.schemas import (
    TaskCreate, TaskUpdate, TaskOut, TaskStatusUpdate, BoardOut,
    AttachmentOut, CommentCreate, CommentOut,
    ProjectCreate, ProjectOut,
)
from app.core.security import get_current_user, require_role
from app.core.config import settings
from app.services.activity_service import log_activity
from app.websockets.manager import manager

router         = APIRouter(prefix="/tasks",    tags=["Module 3 – Tasks & Kanban"])
project_router = APIRouter(prefix="/projects", tags=["Module 3 – Projects"])

ALLOWED_MIME = {
    "image/jpeg", "image/png", "image/gif",
    "application/pdf", "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
MAX_FILE_BYTES = 10 * 1024 * 1024   # 10 MB


# ══════════════════════════════════════════════════════════════════════════════
# PROJECTS
# ══════════════════════════════════════════════════════════════════════════════

@project_router.post("", response_model=ProjectOut, status_code=201,
                     summary="Create a project inside a workspace")
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "manager")),
):
    ws = db.query(Project).filter(Project.workspace_id == payload.workspace_id).first()
    proj = Project(**payload.model_dump(), created_by=current_user.id)
    db.add(proj)
    db.commit()
    db.refresh(proj)
    log_activity(db, current_user.id, f"Created project '{proj.name}'", "project", proj.id)
    return proj


@project_router.get("", response_model=List[ProjectOut], summary="List projects")
def list_projects(
    workspace_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Project)
    if workspace_id:
        q = q.filter(Project.workspace_id == workspace_id)
    return q.all()


@project_router.get("/{project_id}", response_model=ProjectOut, summary="Get project by ID")
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return proj


@project_router.get("/{project_id}/board", response_model=BoardOut,
                    summary="Get Kanban board — tasks grouped by status")
def get_project_board(
    project_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    tasks = db.query(Task).filter(Task.project_id == project_id).all()
    return BoardOut(
        backlog    =[t for t in tasks if t.status == TaskStatusEnum.backlog],
        in_progress=[t for t in tasks if t.status == TaskStatusEnum.in_progress],
        review     =[t for t in tasks if t.status == TaskStatusEnum.review],
        completed  =[t for t in tasks if t.status == TaskStatusEnum.completed],
    )


# ══════════════════════════════════════════════════════════════════════════════
# TASKS — CRUD
# ══════════════════════════════════════════════════════════════════════════════

@router.post("", response_model=TaskOut, status_code=201, summary="Create a task")
async def create_task(
    payload: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "manager")),
):
    if not db.query(Project).filter(Project.id == payload.project_id).first():
        raise HTTPException(status_code=404, detail="Project not found")

    task = Task(**payload.model_dump(), created_by=current_user.id)
    db.add(task)
    db.commit()
    db.refresh(task)
    log_activity(db, current_user.id, f"Created task '{task.title}'", "task", task.id)

    # Module 4 — broadcast status change to all connected users
    await manager.broadcast({
        "type":       "task_status_changed",
        "message":    f"Task '{task.title}' moved to {payload.status.replace('_', ' ')}",
        "task_id":    task.id,
        "new_status": payload.status,
    })
    return task


@router.get("", response_model=List[TaskOut], summary="List tasks with filters + pagination")
def list_tasks(
    project_id: Optional[int]  = None,
    status:     Optional[str]  = None,
    priority:   Optional[str]  = None,
    search:     Optional[str]  = None,
    skip:       int = Query(0,  ge=0),
    limit:      int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Task)
    # Members only see their own tasks
    if current_user.role == "member":
        q = q.filter(Task.assigned_user_id == current_user.id)
    if project_id:
        q = q.filter(Task.project_id == project_id)
    if status:
        q = q.filter(Task.status == status)
    if priority:
        q = q.filter(Task.priority == priority)
    if search:
        q = q.filter(Task.title.ilike(f"%{search}%"))
    return q.offset(skip).limit(limit).all()


@router.get("/{task_id}", response_model=TaskOut, summary="Get task by ID")
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.patch("/{task_id}/status", response_model=TaskOut,
              summary="Move task between Kanban columns")
async def update_task_status(
    task_id: int,
    payload: TaskStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Members can only update their own tasks
    if current_user.role == "member" and task.assigned_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update your own tasks")

    old_status  = task.status
    task.status = payload.status
    db.commit()
    db.refresh(task)
    log_activity(db, current_user.id, f"Task '{task.title}' moved to {payload.status}", "task", task.id)

    # Module 4: broadcast status change to all users
    await manager.broadcast({
        "type":       "task_status_changed",
        "message":    f"Task '{task.title}' moved to {payload.status.replace('_', ' ')}",
        "task_id":    task.id,
        "new_status": payload.status,
    })
    return task


@router.put("/{task_id}", response_model=TaskOut, summary="Update a task fully")
async def update_task(
    task_id: int,
    payload: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "manager")),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    for k, v in payload.model_dump().items():
        setattr(task, k, v)
    db.commit()
    db.refresh(task)
    log_activity(db, current_user.id, f"Updated task '{task.title}'", "task", task.id)

    if payload.assigned_user_id:
        await manager.send_to_user(payload.assigned_user_id, {
            "type":    "task_assigned",
            "message": f"Task '{task.title}' was assigned to you",
            "task_id": task.id,
        })
    return task


@router.delete("/{task_id}", summary="Delete a task")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "manager")),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    title = task.title
    db.delete(task)
    db.commit()
    log_activity(db, current_user.id, f"Deleted task '{title}'", "task", task_id)
    return {"message": "Task deleted"}


# ══════════════════════════════════════════════════════════════════════════════
# MODULE 6 – FILE ATTACHMENTS
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/{task_id}/attachments", response_model=AttachmentOut,
             summary="Upload a file attachment to a task")
async def upload_attachment(
    task_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not db.query(Task).filter(Task.id == task_id).first():
        raise HTTPException(status_code=404, detail="Task not found")

    # Validate MIME type
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file.content_type}' is not allowed. Allowed: PDF, images, Word, TXT",
        )

    # Read and validate size
    contents = await file.read()
    if len(contents) > MAX_FILE_BYTES:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10 MB")

    # Save to disk with UUID name
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    ext         = os.path.splitext(file.filename)[1]
    stored_name = f"{uuid.uuid4()}{ext}"
    file_path   = os.path.join(settings.UPLOAD_DIR, stored_name)

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(contents)

    att = Attachment(
        task_id       = task_id,
        filename      = stored_name,
        original_name = file.filename,
        file_size     = len(contents),
        content_type  = file.content_type,
        uploaded_by   = current_user.id,
    )
    db.add(att)
    db.commit()
    db.refresh(att)
    log_activity(db, current_user.id, f"Uploaded file '{file.filename}'", "task", task_id)
    return att


@router.get("/{task_id}/attachments", response_model=List[AttachmentOut],
            summary="List all attachments for a task")
def get_attachments(
    task_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return db.query(Attachment).filter(Attachment.task_id == task_id).all()


@router.get("/attachments/{attachment_id}/download",
            summary="Download an attachment file")
def download_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    att = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attachment not found")
    path = os.path.join(settings.UPLOAD_DIR, att.filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File missing from storage")
    return FileResponse(path, filename=att.original_name)


# ══════════════════════════════════════════════════════════════════════════════
# BONUS – TASK COMMENTS
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/{task_id}/comments", response_model=CommentOut, status_code=201,
             summary="Add a comment to a task")
def add_comment(
    task_id: int,
    payload: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not db.query(Task).filter(Task.id == task_id).first():
        raise HTTPException(status_code=404, detail="Task not found")

    comment = Comment(task_id=task_id, user_id=current_user.id, content=payload.content)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.get("/{task_id}/comments", response_model=List[CommentOut],
            summary="Get all comments for a task")
def get_comments(
    task_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return db.query(Comment).filter(Comment.task_id == task_id).all()
