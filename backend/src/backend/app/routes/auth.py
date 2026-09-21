from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any, List
from src.backend.app.services.auth import (
    request_email_otp,
    verify_email_otp,
    refresh_user_tokens,
    fetch_user_full_profile,
    save_user_profile,
    revoke_user_sessions,
    list_user_sessions,
    revoke_single_session,
)
from src.backend.app.services.rbac import CurrentUser, check_contract_access
from src.backend.app.utils.jwt import decode_token

router = APIRouter()

class OTPRequest(BaseModel):
    email: str
    purpose: Optional[str] = "login"

class OTPVerify(BaseModel):
    email: str
    code: str
    name: Optional[str] = None
    title: Optional[str] = None
    department: Optional[str] = None

class RefreshRequest(BaseModel):
    refresh_token: str

class LogoutRequest(BaseModel):
    refresh_token: Optional[str] = None

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    jurisdictions: Optional[List[str]] = None
    timezone: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None
    avatar_url: Optional[str] = None

class RevokeSessionRequest(BaseModel):
    session_id: str

async def get_current_user(authorization: Optional[str] = Header(None)) -> CurrentUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")

    token = authorization.split("Bearer ", 1)[1].strip()
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

def require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if not user.is_admin and user.role.lower() not in ("partner", "admin", "owner"):
        raise HTTPException(status_code=403, detail="Administrator or Owner access required")
    return user

async def get_accessible_contract_id(contract_id: str, user: CurrentUser = Depends(get_current_user)) -> str:
    if not await check_contract_access(user, contract_id, required_level="view"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient seniority priority or access permissions")
    return contract_id

async def get_admin_contract_id(contract_id: str, user: CurrentUser = Depends(get_current_user)) -> str:
    if not await check_contract_access(user, contract_id, required_level="admin"):
        raise HTTPException(status_code=403, detail="Forbidden: Administrator or Owner access required for this contract")
    return contract_id

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
        res = await verify_email_otp(
            email=payload.email,
            otp_code=payload.code,
            name=payload.name,
            title=payload.title,
            department=payload.department,
        )
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

@router.post("/logout")
async def logout(payload: Optional[LogoutRequest] = None, user: CurrentUser = Depends(get_current_user)):
    try:
        token = payload.refresh_token if payload else None
        await revoke_user_sessions(user.id, token)
        return {"message": "Session terminated and refresh tokens revoked."}
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

@router.get("/profile")
async def get_profile(user: CurrentUser = Depends(get_current_user)):
    try:
        profile = await fetch_user_full_profile(user.id)
        return {"profile": profile}
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/profile")
async def update_profile(payload: ProfileUpdateRequest, user: CurrentUser = Depends(get_current_user)):
    try:
        data = payload.model_dump(exclude_unset=True) if hasattr(payload, "model_dump") else payload.dict(exclude_unset=True)
        updated = await save_user_profile(user.id, data)
        return {"profile": updated}
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sessions")
async def get_sessions(user: CurrentUser = Depends(get_current_user)):
    try:
        sessions = await list_user_sessions(user.id)
        return {"sessions": sessions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sessions/revoke")
async def revoke_session(payload: RevokeSessionRequest, user: CurrentUser = Depends(get_current_user)):
    try:
        await revoke_single_session(user.id, payload.session_id)
        return {"message": "Session revoked."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sessions/revoke-all")
async def revoke_all_sessions(user: CurrentUser = Depends(get_current_user)):
    try:
        await revoke_user_sessions(user.id)
        return {"message": "All sessions revoked."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
