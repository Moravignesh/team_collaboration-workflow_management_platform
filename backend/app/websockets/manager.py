import json
from typing import Dict, List
from fastapi import WebSocket


class ConnectionManager:
    """Manages WebSocket connections per user_id."""

    def __init__(self):
        self.active: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        self.active.setdefault(user_id, []).append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active:
            try:
                self.active[user_id].remove(websocket)
            except ValueError:
                pass
            if not self.active[user_id]:
                del self.active[user_id]

    async def send_to_user(self, user_id: int, message: dict):
        """Push notification to a specific user."""
        payload = json.dumps(message)
        for ws in list(self.active.get(user_id, [])):
            try:
                await ws.send_text(payload)
            except Exception:
                pass

    async def broadcast(self, message: dict):
        """Push notification to ALL connected users."""
        payload = json.dumps(message)
        for connections in list(self.active.values()):
            for ws in list(connections):
                try:
                    await ws.send_text(payload)
                except Exception:
                    pass


manager = ConnectionManager()
