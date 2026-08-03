"""WebSocket endpoints: one channel per workspace, one per authenticated user.

Auth is via `?token=<access_token>` query parameter since browsers cannot set
`Authorization` headers on WebSocket upgrade requests. Mounted at the app root
(no `/api/v1` prefix) so URLs are `/ws/workspace/{id}` and `/ws/me`.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.core.security import decode_access_token
from app.db.session import AsyncSessionLocal
from app.models.user import User, UserSession
from app.models.workspace import WorkspaceMember
from app.ws.hub import hub

router = APIRouter(prefix="/ws", tags=["websocket"])


async def _authenticate(token: str | None) -> User | None:
    if not token:
        return None
    try:
        payload = decode_access_token(token)
    except ValueError:
        return None

    user_id = payload.get("sub")
    session_id = payload.get("sid")
    if not user_id or not session_id:
        return None

    async with AsyncSessionLocal() as db:
        try:
            session = await db.get(UserSession, UUID(str(session_id)))
        except ValueError:
            return None
        if session is None or session.revoked_at is not None:
            return None
        user = await db.get(User, UUID(str(user_id)))
        if user is None or user.status == "suspended":
            return None
        return user


async def _is_workspace_member(user_id: UUID, workspace_id: UUID) -> bool:
    async with AsyncSessionLocal() as db:
        stmt = select(WorkspaceMember.id).where(
            WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == user_id
        )
        return (await db.execute(stmt)).scalar_one_or_none() is not None


@router.websocket("/workspace/{workspace_id}")
async def workspace_channel(websocket: WebSocket, workspace_id: UUID, token: str | None = None) -> None:
    user = await _authenticate(token)
    if user is None or not await _is_workspace_member(user.id, workspace_id):
        await websocket.close(code=4401)
        return

    await hub.connect_workspace(workspace_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        hub.disconnect_workspace(workspace_id, websocket)


@router.websocket("/me")
async def user_channel(websocket: WebSocket, token: str | None = None) -> None:
    user = await _authenticate(token)
    if user is None:
        await websocket.close(code=4401)
        return

    await hub.connect_user(user.id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        hub.disconnect_user(user.id, websocket)
