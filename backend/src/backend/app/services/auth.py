import os
import random
import hashlib
import uuid
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional, Tuple
from src.backend.app.utils.db import get_db_connection, release_db_connection
from src.backend.app.utils.jwt import create_access_token, create_refresh_token, decode_token
from src.backend.app.utils.logging import logger

from src.backend.app.config import settings

OTP_EXPIRE_MINUTES = 10
MAX_OTP_ATTEMPTS = 5

def hash_secret(secret: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(secret.encode("utf-8"), salt).decode("utf-8")

def verify_secret(secret: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(secret.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def send_otp_email(to_email: str, otp_code: str, purpose: str = "login") -> Dict[str, Any]:
    api_key = settings.resend_api_key or os.getenv("RESEND_API_KEY", "")
    from_email = settings.resend_from_email or os.getenv("RESEND_FROM_EMAIL", "Docusage Security <onboarding@resend.dev>")
    
    if not api_key:
        logger.info(f"[AUTH RESEND] No RESEND_API_KEY configured. Falling back to local logger. OTP: {otp_code}")
        return {"status": "logged", "provider": "local"}

    html_content = f"""
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Docusage Verification Code</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #09090b; padding: 40px 15px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="480" border="0" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #121214; border: 1px solid #27272a; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.6);">
                <tr>
                  <td style="padding: 32px 28px; text-align: center;">
                    <div style="font-size: 20px; font-weight: 700; letter-spacing: -0.5px; color: #ffffff; margin-bottom: 6px;">
                      docusage<span style="font-size: 10px; font-weight: 600; vertical-align: top; margin-left: 4px; padding: 2px 6px; background-color: #27272a; border-radius: 4px; color: #a1a1aa;">AI</span>
                    </div>
                    <p style="font-size: 13px; color: #a1a1aa; margin: 0 0 28px 0;">Enterprise Document Security & Seniority Auditing</p>

                    <div style="background-color: #18181b; border: 1px solid #3f3f46; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                      <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #71717a; display: block; margin-bottom: 8px;">Single-Use Verification Code</span>
                      <div style="font-size: 32px; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-weight: 700; letter-spacing: 8px; color: #ffffff;">
                        {otp_code}
                      </div>
                    </div>

                    <p style="font-size: 12px; color: #71717a; line-height: 1.5; margin: 0 0 16px 0;">
                      This code is valid for <strong>10 minutes</strong> and can only be used once. If you did not request this login code, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #0d0d0f; padding: 14px 28px; text-align: center; border-top: 1px solid #27272a; font-size: 11px; color: #52525b;">
                    Protected by 30-min Access Tokens & 7-day Refresh Tokens • Docusage Auth
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
    """

    try:
        import resend
        resend.api_key = api_key
        params: resend.Emails.SendParams = {
            "from": from_email,
            "to": [to_email],
            "subject": f"Your Docusage Verification Code: {otp_code}",
            "html": html_content,
        }
        email_resp = resend.Emails.send(params)
        logger.info(f"[AUTH RESEND] Sent OTP email to {to_email} via Resend. ID: {email_resp}")
        return {"status": "delivered", "provider": "resend", "id": str(email_resp)}
    except Exception as e:
        logger.error(f"[AUTH RESEND] Failed to deliver email via Resend: {e}")
        return {"status": "error", "provider": "resend", "error": str(e)}

async def request_email_otp(email: str, purpose: str = "login") -> Dict[str, Any]:
    email = email.lower().strip()
    # Generate 6-digit numeric OTP
    otp_code = f"{random.randint(100000, 999999)}"
    otp_hash = hash_secret(otp_code)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=OTP_EXPIRE_MINUTES)

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        # Invalidate any prior active OTPs for this email
        cursor.execute("DELETE FROM auth_otp_codes WHERE email = %s", (email,))
        cursor.execute(
            """
            INSERT INTO auth_otp_codes (email, otp_hash, purpose, expires_at, attempts, created_at)
            VALUES (%s, %s, %s, %s, 0, %s)
            """,
            (email, otp_hash, purpose, expires_at, now)
        )
        conn.commit()
        cursor.close()

        # Deliver OTP via Resend email service
        delivery_res = send_otp_email(email, otp_code, purpose)

        logger.info(f"[AUTH OTP] Email: {email} | Verification Code: {otp_code} | Delivery: {delivery_res.get('status')}")

        return {
            "email": email,
            "message": "Verification OTP sent successfully to your email.",
            "delivery": delivery_res.get("status"),
            "expires_in_seconds": OTP_EXPIRE_MINUTES * 60,
            # Dev fallback if Resend API key is not set
            "dev_otp": otp_code if (os.getenv("DOCUSAGE_ENV", "dev") != "production" or not settings.resend_api_key) else None
        }
    finally:
        release_db_connection(conn)

async def verify_email_otp(email: str, otp_code: str) -> Dict[str, Any]:
    email = email.lower().strip()
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, otp_hash, expires_at, attempts 
            FROM auth_otp_codes 
            WHERE email = %s 
            ORDER BY created_at DESC 
            LIMIT 1
            """,
            (email,)
        )
        row = cursor.fetchone()
        if not row:
            raise ValueError("No OTP request found for this email. Please request a new code.")

        otp_id, stored_hash, expires_at, attempts = row[0], row[1], row[2], row[3]

        # Check expiration
        now = datetime.now(timezone.utc)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if now > expires_at:
            cursor.execute("DELETE FROM auth_otp_codes WHERE id = %s", (otp_id,))
            conn.commit()
            raise ValueError("OTP code has expired. Please request a new code.")

        if attempts >= MAX_OTP_ATTEMPTS:
            cursor.execute("DELETE FROM auth_otp_codes WHERE id = %s", (otp_id,))
            conn.commit()
            raise ValueError("Maximum verification attempts exceeded. Please request a new code.")

        # Check match
        if not verify_secret(otp_code.strip(), stored_hash):
            cursor.execute("UPDATE auth_otp_codes SET attempts = attempts + 1 WHERE id = %s", (otp_id,))
            conn.commit()
            raise ValueError("Invalid verification code.")

        # Successful OTP -> delete code
        cursor.execute("DELETE FROM auth_otp_codes WHERE id = %s", (otp_id,))
        conn.commit()

        # Lookup or create user
        cursor.execute("SELECT id, email, name, is_active FROM users WHERE email = %s", (email,))
        user_row = cursor.fetchone()
        if not user_row:
            user_id = str(uuid.uuid4())
            name = email.split("@")[0].replace(".", " ").title()
            cursor.execute(
                "INSERT INTO users (id, email, name, is_active) VALUES (%s, %s, %s, TRUE) RETURNING id, email, name, is_active",
                (user_id, email, name)
            )
            user_row = cursor.fetchone()
            conn.commit()

        user_id, email_val, name_val = str(user_row[0]), user_row[1], user_row[2]

        # Lookup organization membership and priority
        cursor.execute(
            """
            SELECT m.org_id, r.role_name, COALESCE(m.custom_priority_override, r.priority) as priority, r.is_admin
            FROM organization_members m
            JOIN organization_roles r ON m.role_id = r.id
            WHERE m.user_id = %s
            LIMIT 1
            """,
            (user_id,)
        )
        mem_row = cursor.fetchone()

        if not mem_row:
            # Check if default org exists, otherwise assign default Associate role
            cursor.execute("SELECT id FROM organizations LIMIT 1")
            org = cursor.fetchone()
            org_id = str(org[0]) if org else str(uuid.uuid4())
            
            cursor.execute("SELECT id, priority, is_admin FROM organization_roles WHERE org_id = %s AND role_name = 'Associate'", (org_id,))
            role = cursor.fetchone()
            if not role:
                cursor.execute("SELECT id, priority, is_admin FROM organization_roles WHERE org_id = %s LIMIT 1", (org_id,))
                role = cursor.fetchone()

            role_id = role[0] if role else 1
            priority = role[1] if role else 40
            is_admin = role[2] if role else False
            role_name = "Associate"

            cursor.execute(
                "INSERT INTO organization_members (org_id, user_id, role_id) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
                (org_id, user_id, role_id)
            )
            conn.commit()
        else:
            org_id = str(mem_row[0])
            role_name = mem_row[1]
            priority = mem_row[2]
            is_admin = mem_row[3]

        cursor.close()

        # Issue tokens (Access: 30 min, Refresh: 7 days)
        access_token = create_access_token(
            user_id=user_id,
            email=email_val,
            org_id=org_id,
            role=role_name,
            priority=priority,
            is_admin=is_admin,
        )
        refresh_res = create_refresh_token(user_id=user_id)

        # Store refresh token
        cur2 = conn.cursor()
        token_hash = hashlib.sha256(refresh_res["token"].encode("utf-8")).hexdigest()
        cur2.execute(
            """
            INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at, is_revoked)
            VALUES (%s, %s, %s, %s, FALSE)
            """,
            (user_id, token_hash, refresh_res["family_id"], refresh_res["expires_at"])
        )
        conn.commit()
        cur2.close()

        return {
            "access_token": access_token,
            "refresh_token": refresh_res["token"],
            "token_type": "bearer",
            "expires_in": 1800,  # 30 minutes
            "user": {
                "id": user_id,
                "email": email_val,
                "name": name_val,
                "org_id": org_id,
                "role": role_name,
                "priority": priority,
                "is_admin": is_admin,
            }
        }
    finally:
        release_db_connection(conn)

async def refresh_user_tokens(refresh_token: str) -> Dict[str, Any]:
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise ValueError("Invalid refresh token.")

    user_id = payload.get("sub")
    family_id = payload.get("family_id")
    token_hash = hashlib.sha256(refresh_token.encode("utf-8")).hexdigest()

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, is_revoked, expires_at FROM refresh_tokens WHERE token_hash = %s",
            (token_hash,)
        )
        row = cursor.fetchone()
        if not row:
            raise ValueError("Refresh token not found or already consumed.")

        rt_id, is_revoked, expires_at = row[0], row[1], row[2]
        now = datetime.now(timezone.utc)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if is_revoked or now > expires_at:
            # Revoke entire token family on detected replay
            cursor.execute("UPDATE refresh_tokens SET is_revoked = TRUE WHERE family_id = %s", (family_id,))
            conn.commit()
            raise ValueError("Refresh token expired or compromised. Please login again.")

        # Invalidate consumed token (single use)
        cursor.execute("UPDATE refresh_tokens SET is_revoked = TRUE WHERE id = %s", (rt_id,))
        conn.commit()

        # Fetch live user & role details
        cursor.execute(
            """
            SELECT u.email, u.name, m.org_id, r.role_name, COALESCE(m.custom_priority_override, r.priority), r.is_admin
            FROM users u
            JOIN organization_members m ON u.id = m.user_id
            JOIN organization_roles r ON m.role_id = r.id
            WHERE u.id = %s
            """,
            (user_id,)
        )
        user_row = cursor.fetchone()
        if not user_row:
            raise ValueError("User not found.")

        email, name, org_id, role_name, priority, is_admin = user_row[0], user_row[1], str(user_row[2]), user_row[3], user_row[4], user_row[5]

        # Issue new Access Token (30 min) + Rotated Refresh Token (7 days)
        new_access_token = create_access_token(
            user_id=user_id,
            email=email,
            org_id=org_id,
            role=role_name,
            priority=priority,
            is_admin=is_admin,
        )
        new_refresh = create_refresh_token(user_id=user_id, family_id=family_id)

        new_hash = hashlib.sha256(new_refresh["token"].encode("utf-8")).hexdigest()
        cursor.execute(
            """
            INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at, is_revoked)
            VALUES (%s, %s, %s, %s, FALSE)
            """,
            (user_id, new_hash, family_id, new_refresh["expires_at"])
        )
        conn.commit()
        cursor.close()

        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh["token"],
            "token_type": "bearer",
            "expires_in": 1800,
            "user": {
                "id": user_id,
                "email": email,
                "name": name,
                "org_id": org_id,
                "role": role_name,
                "priority": priority,
                "is_admin": is_admin,
            }
        }
    finally:
        release_db_connection(conn)
