from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
from src.backend.app.services.auth import request_email_otp, verify_email_otp, refresh_user_tokens
from src.backend.app.services.rbac import CurrentUser
from src.backend.app.utils.jwt import decode_token

router = APIRouter()

class OTPRequest(BaseModel):
    email: str
    purpose: Optional[str] = "login"

class OTPVerify(BaseModel):
    email: str
    code: str

class RefreshRequest(BaseModel):
    refresh_token: str

async def get_current_user(authorization: Optional[str] = Header(None)) -> CurrentUser:
    if not authorization or not authorization.startswith("Bearer "):
        # Dev fallback: If no auth header provided, authenticate as default admin
        return CurrentUser(
            id="00000000-0000-0000-0000-000000000001",
            email="admin@docusage.ai",
            name="Eleanor Vance",
            org_id="11111111-1111-1111-1111-111111111111",
            role="Partner",
            priority=90,
            is_admin=True,
        )

    token = authorization.split("Bearer ")[1].strip()
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid or expired access token")

    email = payload.get("email", "")
    default_name = email.split("@")[0].replace(".", " ").title() if email else "User"

    return CurrentUser(
        id=payload.get("sub", ""),
        email=email,
        name=payload.get("name", default_name),
        org_id=payload.get("org_id", ""),
        role=payload.get("role", "Associate"),
        priority=payload.get("priority", 40),
        is_admin=payload.get("is_admin", False),
    )

@router.post("/otp/request")
async def send_otp(payload: OTPRequest):
    try:
        res = await request_email_otp(email=payload.email, purpose=payload.purpose)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/otp/verify")
async def verify_otp(payload: OTPVerify):
    try:
        res = await verify_email_otp(email=payload.email, otp_code=payload.code)
        return res
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/refresh")
async def refresh_tokens(payload: RefreshRequest):
    try:
        res = await refresh_user_tokens(payload.refresh_token)
        return res
    except ValueError as ve:
        raise HTTPException(status_code=401, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/me")
async def get_me(user: CurrentUser = Depends(get_current_user)):
    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name or (user.email.split("@")[0].replace(".", " ").title() if user.email else "Counsel"),
            "org_id": user.org_id,
            "role": user.role,
            "priority": user.priority,
            "is_admin": user.is_admin,
        }
    }
