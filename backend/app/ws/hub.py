"""In-process WebSocket connection hub.

Tracks live connections per workspace channel and per user channel so
`app.services.*` can push realtime events (`task.updated`, `notification.created`,
...) without depending on the transport layer. Single-process only; swap for a
Redis pub/sub backed hub if the API ever runs with multiple workers/replicas.
"""

from __future__ import annotations

from collections import defaultdict
from uuid import UUID

from fastapi import WebSocket

from app.core.logging import get_logger

logger = get_logger(__name__)


class ConnectionHub:
    def __init__(self) -> None:
        self._workspace_channels: dict[str, set[WebSocket]] = defaultdict(set)
        self._user_channels: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect_workspace(self, workspace_id: UUID | str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._workspace_channels[str(workspace_id)].add(websocket)

    async def connect_user(self, user_id: UUID | str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._user_channels[str(user_id)].add(websocket)

    def disconnect_workspace(self, workspace_id: UUID | str, websocket: WebSocket) -> None:
        self._workspace_channels[str(workspace_id)].discard(websocket)

    def disconnect_user(self, user_id: UUID | str, websocket: WebSocket) -> None:
        self._user_channels[str(user_id)].discard(websocket)

    async def broadcast_to_workspace(self, workspace_id: UUID | str, event: str, payload: dict) -> None:
        await self._broadcast(self._workspace_channels.get(str(workspace_id), set()), event, payload)

    async def send_to_user(self, user_id: UUID | str, event: str, payload: dict) -> None:
        await self._broadcast(self._user_channels.get(str(user_id), set()), event, payload)

    async def _broadcast(self, sockets: set[WebSocket], event: str, payload: dict) -> None:
        if not sockets:
            return
        message = {"event": event, "payload": payload}
        dead: list[WebSocket] = []
        for socket in list(sockets):
            try:
                await socket.send_json(message)
            except Exception:
                logger.warning("ws.send_failed", event=event)
                dead.append(socket)
        for socket in dead:
            sockets.discard(socket)


hub = ConnectionHub()
