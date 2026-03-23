import enum
from sqlalchemy import (
    Column, Integer, String, Text, DateTime,
    ForeignKey, Enum, Boolean,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


# ── Enums ─────────────────────────────────────────────────────────────────────
class RoleEnum(str, enum.Enum):
    admin   = "admin"
    manager = "manager"
    member  = "member"


class TaskStatusEnum(str, enum.Enum):
    backlog     = "backlog"
    in_progress = "in_progress"
    review      = "review"
    completed   = "completed"


class PriorityEnum(str, enum.Enum):
    low    = "low"
    medium = "medium"
    high   = "high"


# ── Users ─────────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    username        = Column(String(100), unique=True, nullable=False, index=True)
    email           = Column(String(200), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role            = Column(Enum(RoleEnum), default=RoleEnum.member, nullable=False)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    tasks_assigned    = relationship("Task", back_populates="assigned_user",  foreign_keys="Task.assigned_user_id")
    tasks_created     = relationship("Task", back_populates="creator",        foreign_keys="Task.created_by")
    activity_logs     = relationship("ActivityLog",      back_populates="user")
    workspace_members = relationship("WorkspaceMember",  back_populates="user")
    comments          = relationship("Comment",          back_populates="user")


# ── Workspaces ────────────────────────────────────────────────────────────────
class Workspace(Base):
    __tablename__ = "workspaces"

    id             = Column(Integer, primary_key=True, index=True)
    workspace_name = Column(String(200), nullable=False)
    description    = Column(Text, nullable=True)
    owner_id       = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())

    owner    = relationship("User",            foreign_keys=[owner_id])
    members  = relationship("WorkspaceMember", back_populates="workspace")
    teams    = relationship("Team",            back_populates="workspace")
    projects = relationship("Project",         back_populates="workspace")


class WorkspaceMember(Base):
    __tablename__ = "workspace_members"

    id           = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False)
    user_id      = Column(Integer, ForeignKey("users.id"),      nullable=False)
    joined_at    = Column(DateTime(timezone=True), server_default=func.now())

    workspace = relationship("Workspace", back_populates="members")
    user      = relationship("User",      back_populates="workspace_members")


# ── Teams ─────────────────────────────────────────────────────────────────────
class Team(Base):
    __tablename__ = "teams"

    id           = Column(Integer, primary_key=True, index=True)
    team_name    = Column(String(200), nullable=False)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    workspace = relationship("Workspace",  back_populates="teams")
    members   = relationship("TeamMember", back_populates="team")


class TeamMember(Base):
    __tablename__ = "team_members"

    id      = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    team = relationship("Team", back_populates="members")
    user = relationship("User")


# ── Projects ──────────────────────────────────────────────────────────────────
class Project(Base):
    __tablename__ = "projects"

    id           = Column(Integer, primary_key=True, index=True)
    name         = Column(String(200), nullable=False)
    description  = Column(Text, nullable=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False)
    created_by   = Column(Integer, ForeignKey("users.id"),      nullable=False)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    workspace = relationship("Workspace", back_populates="projects")
    creator   = relationship("User",      foreign_keys=[created_by])
    tasks     = relationship("Task",      back_populates="project")


# ── Tasks ─────────────────────────────────────────────────────────────────────
class Task(Base):
    __tablename__ = "tasks"

    id               = Column(Integer, primary_key=True, index=True)
    title            = Column(String(300), nullable=False)
    description      = Column(Text, nullable=True)
    project_id       = Column(Integer, ForeignKey("projects.id"), nullable=False)
    assigned_user_id = Column(Integer, ForeignKey("users.id"),    nullable=True)
    status           = Column(Enum(TaskStatusEnum), default=TaskStatusEnum.backlog,  nullable=False)
    priority         = Column(Enum(PriorityEnum),   default=PriorityEnum.medium,     nullable=False)
    due_date         = Column(DateTime(timezone=True), nullable=True)
    created_by       = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    updated_at       = Column(DateTime(timezone=True), onupdate=func.now())

    project       = relationship("Project", back_populates="tasks")
    assigned_user = relationship("User",    back_populates="tasks_assigned", foreign_keys=[assigned_user_id])
    creator       = relationship("User",    back_populates="tasks_created",  foreign_keys=[created_by])
    attachments   = relationship("Attachment", back_populates="task", cascade="all, delete-orphan")
    comments      = relationship("Comment",    back_populates="task", cascade="all, delete-orphan")


# ── Attachments ───────────────────────────────────────────────────────────────
class Attachment(Base):
    __tablename__ = "attachments"

    id            = Column(Integer, primary_key=True, index=True)
    task_id       = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    filename      = Column(String(500), nullable=False)   # stored name (UUID)
    original_name = Column(String(500), nullable=False)   # original upload name
    file_size     = Column(Integer, nullable=False)
    content_type  = Column(String(100), nullable=False)
    uploaded_by   = Column(Integer, ForeignKey("users.id"), nullable=False)
    uploaded_at   = Column(DateTime(timezone=True), server_default=func.now())

    task     = relationship("Task", back_populates="attachments")
    uploader = relationship("User")


# ── Comments ──────────────────────────────────────────────────────────────────
class Comment(Base):
    __tablename__ = "comments"

    id         = Column(Integer, primary_key=True, index=True)
    task_id    = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    content    = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    task = relationship("Task", back_populates="comments")
    user = relationship("User", back_populates="comments")


# ── Activity Logs ─────────────────────────────────────────────────────────────
class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    action      = Column(String(300), nullable=False)
    entity_type = Column(String(50),  nullable=False)   # task / project / workspace / user
    entity_id   = Column(Integer,     nullable=True)
    details     = Column(Text,        nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="activity_logs")
