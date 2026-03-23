from typing import List, Optional
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from app.db.database import get_db
from app.models.models import ActivityLog, User
from app.schemas.schemas import ActivityLogOut
from app.core.security import require_role
from app.core.config import settings
from app.websockets.manager import manager

# ── Module 5 router ───────────────────────────────────────────────────────────
activity_router = APIRouter(
    prefix="/activity-logs",
    tags=["Module 5 – Activity Logs"],
)

# ── Module 4 HTTP router (visible in /docs) ───────────────────────────────────
notification_router = APIRouter(
    prefix="/ws",
    tags=["Module 4 – Real-Time Notifications (WebSocket)"],
)

# ── Module 4 WebSocket router (not visible in /docs — OpenAPI limitation) ─────
websocket_only_router = APIRouter()


# ══════════════════════════════════════════════════════════════════════════════
# MODULE 5 – GET /activity-logs
# ══════════════════════════════════════════════════════════════════════════════

@activity_router.get(
    "",
    response_model=List[ActivityLogOut],
    summary="Get paginated audit trail (Admin / Manager only)",
)
def get_activity_logs(
    entity_type: Optional[str] = Query(None, description="Filter: task | project | workspace | user"),
    skip:  int = Query(0,  ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "manager")),
):
    q = db.query(ActivityLog)
    if entity_type:
        q = q.filter(ActivityLog.entity_type == entity_type)
    return q.order_by(ActivityLog.created_at.desc()).offset(skip).limit(limit).all()


# ══════════════════════════════════════════════════════════════════════════════
# MODULE 4 – WS /ws/notifications  (actual WebSocket — works, not in Swagger)
# ══════════════════════════════════════════════════════════════════════════════

@websocket_only_router.websocket("/ws/notifications")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="JWT access token"),
):
    """
    WebSocket endpoint for real-time notifications.
    Connect: ws://localhost:8000/ws/notifications?token=<JWT>

    Events pushed to client:
      - task_assigned
      - task_status_changed
      - workspace_invite
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, ValueError, TypeError):
        await websocket.close(code=4001)
        return

    await manager.connect(websocket, user_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)


# ══════════════════════════════════════════════════════════════════════════════
# MODULE 4 – HTTP endpoints to TEST notifications (visible in /docs)
# These trigger the same 3 events the task requires
# ══════════════════════════════════════════════════════════════════════════════

@notification_router.get(
    "/connected-users",
    summary="Get users currently connected to WebSocket",
)
def get_connected_users(
    current_user: User = Depends(require_role("admin")),
):
    return {
        "connected_user_ids": list(manager.active.keys()),
        "total_connections":  sum(len(v) for v in manager.active.values()),
        "websocket_url":      "ws://localhost:8000/ws/notifications?token=<JWT>",
    }


@notification_router.post(
    "/notify/task-assigned",
    summary="Trigger event: task_assigned → notify user a task was assigned",
)
async def notify_task_assigned(
    user_id:    int = Query(..., description="User ID to notify"),
    task_id:    int = Query(..., description="Task ID"),
    task_title: str = Query(..., description="Task title"),
    current_user: User = Depends(require_role("admin", "manager")),
):
    """
    Sends **task_assigned** event to a specific user via WebSocket.

    Event received by user:
```json
    {
      "type": "task_assigned",
      "message": "Task 'Fix login bug' has been assigned to you",
      "task_id": 1
    }
```
    This also fires automatically when `POST /tasks` or `PUT /tasks/{id}`
    is called with an `assigned_user_id`.
    """
    event = {
        "type":    "task_assigned",
        "message": f"Task '{task_title}' has been assigned to you",
        "task_id": task_id,
    }
    await manager.send_to_user(user_id, event)
    return {
        "event":       "task_assigned",
        "to_user_id":  user_id,
        "task_id":     task_id,
        "user_online": user_id in manager.active,
        "note": "Event sent" if user_id in manager.active else "⚠️ User not connected to WebSocket",
    }


@notification_router.post(
    "/notify/task-status-changed",
    summary="Trigger event: task_status_changed → broadcast task moved to new column",
)
async def notify_task_status_changed(
    task_id:    int = Query(..., description="Task ID"),
    task_title: str = Query(..., description="Task title"),
    new_status: str = Query(..., description="New status: backlog | in_progress | review | completed"),
    current_user: User = Depends(require_role("admin", "manager")),
):
    """
    Broadcasts **task_status_changed** event to ALL connected users.

    Event received by all users:
```json
    {
      "type": "task_status_changed",
      "message": "Task 'Fix login bug' moved to in progress",
      "task_id": 1,
      "new_status": "in_progress"
    }
```
    This also fires automatically when `PATCH /tasks/{id}/status` is called
    or when a card is dragged on the Kanban board.
    """
    event = {
        "type":       "task_status_changed",
        "message":    f"Task '{task_title}' moved to {new_status.replace('_', ' ')}",
        "task_id":    task_id,
        "new_status": new_status,
    }
    await manager.broadcast(event)
    connected = list(manager.active.keys())
    return {
        "event":              "task_status_changed",
        "broadcast_to_users": connected,
        "total_users_online": len(connected),
        "task_id":            task_id,
        "new_status":         new_status,
    }


@notification_router.post(
    "/notify/workspace-invite",
    summary="Trigger event: workspace_invite → notify user they were invited",
)
async def notify_workspace_invite(
    user_id:        int = Query(..., description="User ID who was invited"),
    workspace_id:   int = Query(..., description="Workspace ID"),
    workspace_name: str = Query(..., description="Workspace name"),
    current_user: User = Depends(require_role("admin", "manager")),
):
    """
    Sends **workspace_invite** event to a specific user via WebSocket.

    Event received by user:
```json
    {
      "type": "workspace_invite",
      "message": "You were invited to workspace 'Engineering'",
      "workspace_id": 1
    }
```
    This also fires automatically when `POST /workspaces/{id}/invite` is called.
    """
    event = {
        "type":         "workspace_invite",
        "message":      f"You were invited to workspace '{workspace_name}'",
        "workspace_id": workspace_id,
    }
    await manager.send_to_user(user_id, event)
    return {
        "event":         "workspace_invite",
        "to_user_id":    user_id,
        "workspace_id":  workspace_id,
        "user_online":   user_id in manager.active,
        "note": "Event sent" if user_id in manager.active else "⚠️ User not connected to WebSocket",
    }