from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List
from src.backend.app.models.policies import PolicyCreate, PolicyResponse
from src.backend.app.services.policies import (
    create_policy,
    get_policy,
    list_policies,
    delete_policy
)
from src.backend.app.routes.auth import get_current_user, require_admin
from src.backend.app.services.rbac import CurrentUser

router = APIRouter()

@router.post("/", response_model=PolicyResponse, status_code=201)
async def create_new_policy(policy: PolicyCreate, admin: CurrentUser = Depends(require_admin)):
    return await create_policy(name=policy.name, rules=policy.rules)

@router.get("/", response_model=List[PolicyResponse])
async def get_all_policies(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user: CurrentUser = Depends(get_current_user)
):
    return await list_policies(skip=skip, limit=limit)

@router.get("/{policy_id}", response_model=PolicyResponse)
async def get_policy_by_id(policy_id: int, user: CurrentUser = Depends(get_current_user)):
    policy = await get_policy(policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    return policy

@router.delete("/{policy_id}", status_code=204)
async def remove_policy(policy_id: int, admin: CurrentUser = Depends(require_admin)):
    success = await delete_policy(policy_id)
    if not success:
        raise HTTPException(status_code=404, detail="Policy not found")
    return None
