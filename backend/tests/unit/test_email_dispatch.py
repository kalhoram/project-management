"""Unit tests for verification URL builder and email dispatch."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.services.email_dispatch import build_verification_url, send_verification_email


def test_build_verification_url_uses_frontend_base() -> None:
    url = build_verification_url("abc123token", "user@yadbox.app")
    assert url.startswith("http://localhost:3000/verify-email?")
    assert "token=abc123token" in url
    assert "email=user%40yadbox.app" in url


@pytest.mark.asyncio
async def test_send_verification_email_returns_console_mode() -> None:
    mock_sender = AsyncMock()
    mock_sender.send = AsyncMock(return_value=True)
    with patch("app.services.email_dispatch.get_email_sender", return_value=mock_sender):
        ok, mode = await send_verification_email(to="demo@yadbox.app", token="test-token-xyz")
    assert ok is True
    assert mode == "console"
    mock_sender.send.assert_awaited_once()
    payload = mock_sender.send.await_args.args[0]
    assert payload.to == "demo@yadbox.app"
    assert "test-token-xyz" in payload.body_text
    assert "localhost:3000/verify-email" in payload.body_text
