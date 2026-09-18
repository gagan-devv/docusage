from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from src.backend.app.services.provider_manager import (
    SUPPORTED_PROVIDERS,
    fetch_ollama_tags,
    save_provider_setting,
    get_active_setting,
    get_ollama_base_url,
    is_safe_ollama_url,
)
from src.backend.app.routes.auth import get_current_user, require_admin
from src.backend.app.services.rbac import CurrentUser

router = APIRouter()

class ProviderSettingRequest(BaseModel):
    provider: str
    selected_llm: str
    selected_embedding: str
    api_key: Optional[str] = None
    ollama_base_url: Optional[str] = None

@router.get("/providers")
async def get_providers(user: CurrentUser = Depends(get_current_user)):
    return {"providers": SUPPORTED_PROVIDERS}

@router.get("/ollama/models")
async def get_ollama_models(url: Optional[str] = None, admin: CurrentUser = Depends(require_admin)):
    if url and not is_safe_ollama_url(url):
        raise HTTPException(status_code=400, detail="Disallowed Ollama base URL host or scheme")
    tags = await fetch_ollama_tags(url)
    return {
        "base_url": url or get_ollama_base_url(),
        "connected": len(tags) > 0 or bool(tags),
        "models": tags,
    }

@router.get("/")
async def read_active_settings(user: CurrentUser = Depends(get_current_user)):
    return await get_active_setting()

@router.post("/")
async def update_settings(payload: ProviderSettingRequest, admin: CurrentUser = Depends(require_admin)):
    if payload.ollama_base_url and not is_safe_ollama_url(payload.ollama_base_url):
        raise HTTPException(status_code=400, detail="Disallowed Ollama base URL host or scheme")
    try:
        updated = await save_provider_setting(
            provider=payload.provider,
            selected_llm=payload.selected_llm,
            selected_embedding=payload.selected_embedding,
            api_key=payload.api_key,
            ollama_base_url=payload.ollama_base_url,
        )
        return updated
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
