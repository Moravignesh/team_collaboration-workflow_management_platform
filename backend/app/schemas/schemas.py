from __future__ import annotations
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

from app.models.models import RoleEnum, TaskStatusEnum, PriorityEnum


# ── Auth ──────────────────────────────────────────────────────────────────────
class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    username: str


class AssignRole(BaseModel):
    user_id: int
    role: RoleEnum


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    role: RoleEnum
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Workspace ─────────────────────────────────────────────────────────────────
class WorkspaceCreate(BaseModel):
    workspace_name: str
    description: Optional[str] = None


class WorkspaceOut(BaseModel):
    id: int
    workspace_name: str
    description: Optional[str]
    owner_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class InviteUser(BaseModel):
    user_id: int


# ── Team ──────────────────────────────────────────────────────────────────────
class TeamCreate(BaseModel):
    team_name: str
    workspace_id: int


class TeamOut(BaseModel):
    id: int
    team_name: str
    workspace_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class AddTeamMember(BaseModel):
    user_id: int


# ── Project ───────────────────────────────────────────────────────────────────
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    workspace_id: int


class ProjectOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    workspace_id: int
    created_by: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Task ──────────────────────────────────────────────────────────────────────
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    project_id: int
    assigned_user_id: Optional[int] = None
    status: TaskStatusEnum = TaskStatusEnum.backlog
    priority: PriorityEnum = PriorityEnum.medium
    due_date: Optional[datetime] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_user_id: Optional[int] = None
    status: Optional[TaskStatusEnum] = None
    priority: Optional[PriorityEnum] = None
    due_date: Optional[datetime] = None


class TaskStatusUpdate(BaseModel):
    status: TaskStatusEnum


class TaskOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    project_id: int
    assigned_user_id: Optional[int]
    status: TaskStatusEnum
    priority: PriorityEnum
    due_date: Optional[datetime]
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}


class BoardOut(BaseModel):
    backlog: List[TaskOut]
    in_progress: List[TaskOut]
    review: List[TaskOut]
    completed: List[TaskOut]


# ── Attachment ────────────────────────────────────────────────────────────────
class AttachmentOut(BaseModel):
    id: int
    task_id: int
    filename: str
    original_name: str
    file_size: int
    content_type: str
    uploaded_by: int
    uploaded_at: datetime

    model_config = {"from_attributes": True}


# ── Comment ───────────────────────────────────────────────────────────────────
class CommentCreate(BaseModel):
    content: str


class CommentOut(BaseModel):
    id: int
    task_id: int
    user_id: int
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Activity Log ──────────────────────────────────────────────────────────────
class ActivityLogOut(BaseModel):
    id: int
    user_id: int
    action: str
    entity_type: str
    entity_id: Optional[int]
    details: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
