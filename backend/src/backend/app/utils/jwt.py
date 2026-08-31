import os
import uuid
import jwt
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional

JWT_SECRET = os.getenv("JWT_SECRET", os.getenv("SECRET_KEY", "docusage-secure-jwt-secret-key-2026-production!"))
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

def create_access_token(
    user_id: str,
    email: str,
    org_id: str,
    role: str,
    priority: int,
    is_admin: bool = False,
    expires_delta: Optional[timedelta] = None,
) -> str:
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    
    payload: Dict[str, Any] = {
        "sub": str(user_id),
        "email": email,
        "org_id": str(org_id),
        "role": role,
        "priority": priority,
        "is_admin": is_admin,
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(
    user_id: str,
    family_id: Optional[str] = None,
    expires_delta: Optional[timedelta] = None,
) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta if expires_delta else timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    fam_id = family_id or str(uuid.uuid4())
    token_id = str(uuid.uuid4())

    payload: Dict[str, Any] = {
        "sub": str(user_id),
        "family_id": fam_id,
        "type": "refresh",
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "jti": token_id,
    }
    encoded = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return {
        "token": encoded,
        "family_id": fam_id,
        "token_id": token_id,
        "expires_at": expire,
    }

def decode_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except (jwt.PyJWTError, Exception):
        return None
