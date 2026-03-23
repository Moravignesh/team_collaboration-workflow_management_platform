from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.db.database import get_db
from app.models.models import User, RoleEnum
from app.schemas.schemas import TokenResponse, AssignRole, UserOut
from app.core.security import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, require_role,
)
from app.services.activity_service import log_activity

router       = APIRouter(prefix="/auth",  tags=["Module 1 – Authentication"])
admin_router = APIRouter(prefix="/admin", tags=["Module 1 – Admin / RBAC"])


# ── Register schema: role is OPTIONAL, defaults to member ────────────────────
class UserRegisterWithRole(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: Optional[RoleEnum] = RoleEnum.member


# ── POST /auth/register ───────────────────────────────────────────────────────
@router.post(
    "/register",
    response_model=UserOut,
    status_code=201,
    summary="Register user. Pass role: admin|manager|member (default: member). First user is always admin.",
)
def register(payload: UserRegisterWithRole, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    # Rule 1: Very first registered user → always admin
    # Rule 2: After that → use whatever role is passed (admin/manager/member)
    # Rule 3: If no role passed → default to member
    is_first_user = db.query(User).count() == 0
    assigned_role = RoleEnum.admin if is_first_user else (payload.role or RoleEnum.member)

    user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        role=assigned_role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log_activity(db, user.id, f"User registered with role: {assigned_role}", "user", user.id)
    return user


# ── POST /auth/login ──────────────────────────────────────────────────────────
@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login with email + password, returns JWT access token",
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(
        access_token=token,
        role=user.role,
        user_id=user.id,
        username=user.username,
    )


# ── GET /auth/me ──────────────────────────────────────────────────────────────
@router.get("/me", response_model=UserOut, summary="Get current logged-in user")
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# ── POST /admin/assign-role ───────────────────────────────────────────────────
@admin_router.post(
    "/assign-role",
    summary="Admin only: change any user role to admin | manager | member",
)
def assign_role(
    payload: AssignRole,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    old_role  = user.role
    user.role = payload.role
    db.commit()
    log_activity(
        db, current_user.id,
        f"Role changed from {old_role} to {payload.role}",
        "user", user.id,
    )
    return {
        "message":  "Role updated successfully",
        "user_id":  user.id,
        "username": user.username,
        "old_role": old_role,
        "new_role": payload.role,
    }


# ── GET /admin/users ──────────────────────────────────────────────────────────
@admin_router.get(
    "/users",
    response_model=List[UserOut],
    summary="Admin: list all users in the system",
)
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    return db.query(User).all()