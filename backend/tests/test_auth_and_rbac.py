import pytest
import time
from datetime import datetime, timedelta, timezone
from src.backend.app.utils.jwt import (
    create_access_token,
    create_refresh_token,
    decode_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
)
from src.backend.app.services.auth import (
    hash_secret,
    verify_secret,
    request_email_otp,
    verify_email_otp,
    refresh_user_tokens,
)

def test_access_token_ttl_30_minutes():
    user_id = "00000000-0000-0000-0000-000000000001"
    token = create_access_token(
        user_id=user_id,
        email="test@docusage.ai",
        org_id="11111111-1111-1111-1111-111111111111",
        role="Partner",
        priority=90,
        is_admin=True,
    )
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == user_id
    assert payload["role"] == "Partner"
    assert payload["priority"] == 90
    assert payload["is_admin"] is True
    assert payload["type"] == "access"

    # Verify TTL is ~30 minutes (1800 seconds)
    ttl = payload["exp"] - payload["iat"]
    assert ttl == ACCESS_TOKEN_EXPIRE_MINUTES * 60

def test_refresh_token_ttl_7_days():
    user_id = "00000000-0000-0000-0000-000000000002"
    res = create_refresh_token(user_id=user_id)
    token = res["token"]
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == user_id
    assert payload["type"] == "refresh"
    assert "family_id" in payload

    # Verify TTL is ~7 days (7 * 86400 = 604800 seconds)
    ttl = payload["exp"] - payload["iat"]
    assert ttl == REFRESH_TOKEN_EXPIRE_DAYS * 86400

def test_secret_hashing_and_verification():
    secret = "948215"
    hashed = hash_secret(secret)
    assert hashed != secret
    assert verify_secret(secret, hashed) is True
    assert verify_secret("000000", hashed) is False

def is_db_connected() -> bool:
    try:
        from src.backend.app.utils.db import get_db_connection, release_db_connection
        conn = get_db_connection()
        release_db_connection(conn)
        return True
    except Exception:
        return False

def test_unauthenticated_rejection_in_get_current_user():
    from fastapi import HTTPException
    from src.backend.app.routes.auth import get_current_user, require_admin
    from src.backend.app.services.rbac import CurrentUser
    import asyncio

    # None or missing header raises 401
    with pytest.raises(HTTPException) as exc1:
        asyncio.run(get_current_user(None))
    assert exc1.value.status_code == 401

    # Invalid token raises 401
    with pytest.raises(HTTPException) as exc2:
        asyncio.run(get_current_user("Bearer invalid.jwt.token"))
    assert exc2.value.status_code == 401

    # Non-admin user rejected by require_admin
    user = CurrentUser(
        id="00000000-0000-0000-0000-000000000002",
        email="associate@docusage.ai",
        org_id="11111111-1111-1111-1111-111111111111",
        role="Associate",
        priority=30,
        is_admin=False
    )
    with pytest.raises(HTTPException) as exc3:
        require_admin(user)
    assert exc3.value.status_code == 403

def test_production_secret_enforcement(monkeypatch):
    import src.backend.app.utils.security as sec_mod
    monkeypatch.setenv("DOCUSAGE_ENV", "production")
    monkeypatch.delenv("SECRET_KEY", raising=False)
    monkeypatch.setattr(sec_mod, "_FERNET_INSTANCE", None)

    with pytest.raises(RuntimeError, match="SECRET_KEY environment variable must be set in production mode"):
        sec_mod.get_fernet_cipher()

@pytest.mark.skipif(not is_db_connected(), reason="PostgreSQL database service not reachable")
@pytest.mark.anyio
async def test_email_otp_request_and_verification_lifecycle():
    email = "lawyer_test@docusage.ai"
    req = await request_email_otp(email=email)
    assert req["email"] == email
    otp = req["dev_otp"]
    assert otp is not None
    assert len(otp) == 6

    # Verify invalid OTP fails
    with pytest.raises(ValueError, match="Invalid verification code"):
        await verify_email_otp(email, "000000")

    # Verify valid OTP succeeds and issues tokens
    auth_res = await verify_email_otp(email, otp)
    assert "access_token" in auth_res
    assert "refresh_token" in auth_res
    assert auth_res["user"]["email"] == email
    assert auth_res["expires_in"] == 1800

    # Token refresh rotation
    refreshed = await refresh_user_tokens(auth_res["refresh_token"])
    assert "access_token" in refreshed
    assert "refresh_token" in refreshed
    assert refreshed["refresh_token"] != auth_res["refresh_token"]

    # Replay attack detection: re-using old refresh token must be rejected
    with pytest.raises(ValueError, match="Refresh token expired or compromised"):
        await refresh_user_tokens(auth_res["refresh_token"])

def test_send_otp_email_via_resend_mock(monkeypatch):
    from src.backend.app.services.auth import send_otp_email
    import resend

    monkeypatch.setenv("RESEND_API_KEY", "re_test_key_12345678")
    monkeypatch.setattr("src.backend.app.config.settings.resend_api_key", "re_test_key_12345678")

    sent_calls = []
    def mock_send(params):
        sent_calls.append(params)
        return {"id": "msg_resend_12345"}

    monkeypatch.setattr(resend.Emails, "send", mock_send)

    res = send_otp_email("partner@docusage.ai", "582914")
    assert res["status"] == "delivered"
    assert res["provider"] == "resend"
    assert len(sent_calls) == 1
    assert sent_calls[0]["to"] == ["partner@docusage.ai"]
    assert "582914" in sent_calls[0]["subject"]
    assert "582914" in sent_calls[0]["html"]

def test_send_otp_email_fallback_when_unconfigured(monkeypatch):
    from src.backend.app.services.auth import send_otp_email
    monkeypatch.setenv("RESEND_API_KEY", "")
    monkeypatch.setattr("src.backend.app.config.settings.resend_api_key", "")

    res = send_otp_email("associate@docusage.ai", "123456")
    assert res["status"] == "logged"
    assert res["provider"] == "local"

