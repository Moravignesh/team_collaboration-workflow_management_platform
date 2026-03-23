from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import Workspace, WorkspaceMember, Team, TeamMember, User
from app.schemas.schemas import (
    WorkspaceCreate, WorkspaceOut, InviteUser,
    TeamCreate, TeamOut, AddTeamMember, UserOut,
)
from app.core.security import get_current_user, require_role
from app.services.activity_service import log_activity
from app.websockets.manager import manager

router      = APIRouter(prefix="/workspaces", tags=["Module 2 – Workspaces"])
team_router = APIRouter(prefix="/teams",      tags=["Module 2 – Teams"])


# ══════════════════════════════════════════════════════════════════════════════
# WORKSPACES
# ══════════════════════════════════════════════════════════════════════════════

@router.post("", response_model=WorkspaceOut, status_code=201,
             summary="Create a new workspace")
def create_workspace(
    payload: WorkspaceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "manager")),
):
    ws = Workspace(
        workspace_name=payload.workspace_name,
        description=payload.description,
        owner_id=current_user.id,
    )
    db.add(ws)
    db.commit()
    db.refresh(ws)
    # Auto-add creator as a member
    db.add(WorkspaceMember(workspace_id=ws.id, user_id=current_user.id))
    db.commit()
    log_activity(db, current_user.id, f"Created workspace '{ws.workspace_name}'", "workspace", ws.id)
    return ws


@router.get("", response_model=List[WorkspaceOut], summary="List workspaces")
def list_workspaces(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "admin":
        return db.query(Workspace).all()
    ids = [
        m.workspace_id
        for m in db.query(WorkspaceMember).filter(WorkspaceMember.user_id == current_user.id)
    ]
    return db.query(Workspace).filter(Workspace.id.in_(ids)).all()


@router.get("/{workspace_id}", response_model=WorkspaceOut, summary="Get workspace by ID")
def get_workspace(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return ws


@router.post("/{workspace_id}/invite", summary="Invite a user to the workspace")
async def invite_user(
    workspace_id: int,
    payload: InviteUser,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "manager")),
):
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    already = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == payload.user_id,
    ).first()
    if already:
        raise HTTPException(status_code=400, detail="User already a member")

    db.add(WorkspaceMember(workspace_id=workspace_id, user_id=payload.user_id))
    db.commit()
    log_activity(db, current_user.id, f"Invited {user.username} to workspace", "workspace", workspace_id)

    # Real-time WebSocket notification (Module 4)
    await manager.send_to_user(payload.user_id, {
        "type": "workspace_invite",
        "message": f"You were invited to workspace '{ws.workspace_name}'",
        "workspace_id": workspace_id,
    })
    return {"message": f"{user.username} invited successfully"}


@router.get("/{workspace_id}/teams", response_model=List[TeamOut], summary="Get teams in workspace")
def get_workspace_teams(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Team).filter(Team.workspace_id == workspace_id).all()


@router.get("/{workspace_id}/members", summary="Get members in workspace")
def get_workspace_members(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = db.query(WorkspaceMember).filter(WorkspaceMember.workspace_id == workspace_id).all()
    result = []
    for m in rows:
        u = db.query(User).filter(User.id == m.user_id).first()
        if u:
            result.append({
                "user_id":  u.id,
                "username": u.username,
                "email":    u.email,
                "role":     u.role,
                "joined_at": str(m.joined_at),
            })
    return result


# ══════════════════════════════════════════════════════════════════════════════
# TEAMS
# ══════════════════════════════════════════════════════════════════════════════

@team_router.post("", response_model=TeamOut, status_code=201, summary="Create a team")
def create_team(
    payload: TeamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "manager")),
):
    ws = db.query(Workspace).filter(Workspace.id == payload.workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    team = Team(team_name=payload.team_name, workspace_id=payload.workspace_id)
    db.add(team)
    db.commit()
    db.refresh(team)
    log_activity(db, current_user.id, f"Created team '{team.team_name}'", "team", team.id)
    return team


@team_router.get("/{team_id}", response_model=TeamOut, summary="Get team by ID")
def get_team(
    team_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


@team_router.post("/{team_id}/members", summary="Add member to team")
def add_team_member(
    team_id: int,
    payload: AddTeamMember,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "manager")),
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    if db.query(TeamMember).filter(TeamMember.team_id == team_id, TeamMember.user_id == payload.user_id).first():
        raise HTTPException(status_code=400, detail="User already in team")

    db.add(TeamMember(team_id=team_id, user_id=payload.user_id))
    db.commit()
    return {"message": "Member added to team"}


@team_router.get("/{team_id}/members", summary="Get team members")
def get_team_members(
    team_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = db.query(TeamMember).filter(TeamMember.team_id == team_id).all()
    result = []
    for m in rows:
        u = db.query(User).filter(User.id == m.user_id).first()
        if u:
            result.append({"user_id": u.id, "username": u.username, "email": u.email, "role": u.role})
    return result
