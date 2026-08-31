from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from src.backend.app.services.rbac import (
    CurrentUser,
    list_org_roles,
    update_org_role,
    list_org_members,
    update_member_role,
    grant_contract_access,
    revoke_contract_access,
    list_contract_grants,
)
from src.backend.app.routes.auth import get_current_user

router = APIRouter()

def require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if not user.is_admin and user.role.lower() not in ("partner", "admin", "owner"):
        raise HTTPException(status_code=403, detail="Administrator or Owner access required")
    return user

class RoleUpdateRequest(BaseModel):
    priority: int = Field(ge=1, le=100)
    description: Optional[str] = None

class MemberUpdateRequest(BaseModel):
    role_id: int
    custom_priority_override: Optional[int] = Field(default=None, ge=1, le=100)

class GrantAccessRequest(BaseModel):
    target_user_id: str
    permission_level: Optional[str] = "view"
    expires_at: Optional[datetime] = None

@router.get("/org/roles")
async def get_roles(user: CurrentUser = Depends(get_current_user)):
    roles = await list_org_roles(user.org_id)
    return {"roles": roles}

@router.put("/org/roles/{role_id}")
async def edit_role_priority(role_id: int, payload: RoleUpdateRequest, admin: CurrentUser = Depends(require_admin)):
    try:
        updated = await update_org_role(role_id, priority=payload.priority, description=payload.description)
        return updated
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/org/members")
async def get_members(user: CurrentUser = Depends(get_current_user)):
    members = await list_org_members(user.org_id)
    return {"members": members}

@router.put("/org/members/{user_id}")
async def edit_member(user_id: str, payload: MemberUpdateRequest, admin: CurrentUser = Depends(require_admin)):
    try:
        updated = await update_member_role(
            org_id=admin.org_id,
            user_id=user_id,
            role_id=payload.role_id,
            custom_priority_override=payload.custom_priority_override
        )
        return updated
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/contracts/{contract_id}/grants")
async def get_contract_grants(contract_id: str, user: CurrentUser = Depends(get_current_user)):
    grants = await list_contract_grants(contract_id)
    return {"grants": grants}

@router.post("/contracts/{contract_id}/grants")
async def create_contract_grant(
    contract_id: str,
    payload: GrantAccessRequest,
    user: CurrentUser = Depends(get_current_user),
):
    try:
        grant = await grant_contract_access(
            contract_id=contract_id,
            target_user_id=payload.target_user_id,
            granted_by=user,
            permission_level=payload.permission_level or "view",
            expires_at=payload.expires_at,
        )
        return grant
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/contracts/{contract_id}/grants/{target_user_id}")
async def delete_contract_grant(
    contract_id: str,
    target_user_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    try:
        deleted = await revoke_contract_access(contract_id=contract_id, target_user_id=target_user_id, revoked_by=user)
        if not deleted:
            raise HTTPException(status_code=404, detail="Access grant not found")
        return {"message": "Access grant revoked successfully"}
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
