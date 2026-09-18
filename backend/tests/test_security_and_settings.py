import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from src.backend.app.main import app
from src.backend.app.utils.security import encrypt_api_key, decrypt_api_key, mask_api_key

from src.backend.app.utils.jwt import create_access_token

client = TestClient(app)

ADMIN_TOKEN = create_access_token(
    user_id="00000000-0000-0000-0000-000000000001",
    email="admin@docusage.ai",
    org_id="11111111-1111-1111-1111-111111111111",
    role="Partner",
    priority=100,
    is_admin=True,
)
ADMIN_HEADERS = {"Authorization": f"Bearer {ADMIN_TOKEN}"}

USER_TOKEN = create_access_token(
    user_id="00000000-0000-0000-0000-000000000002",
    email="associate@docusage.ai",
    org_id="11111111-1111-1111-1111-111111111111",
    role="Associate",
    priority=30,
    is_admin=False,
)
USER_HEADERS = {"Authorization": f"Bearer {USER_TOKEN}"}

def test_fernet_encryption_and_masking():
    raw_key = "sk-proj-1234567890abcdefghijklmnopqrstuvwxyz"
    encrypted = encrypt_api_key(raw_key)
    assert encrypted != raw_key
    assert len(encrypted) > 20

    decrypted = decrypt_api_key(encrypted)
    assert decrypted == raw_key

    masked = mask_api_key(raw_key)
    assert masked.startswith("sk-proj")
    assert masked.endswith("wxyz")
    assert "••••••••" in masked

def test_empty_key_encryption():
    assert encrypt_api_key("") == ""
    assert decrypt_api_key("") == ""
    assert mask_api_key("") == ""

def test_get_providers_endpoint():
    # Unauthenticated request must return 401 Unauthorized
    unauth = client.get("/settings/providers")
    assert unauth.status_code == 401

    # Authenticated request succeeds
    response = client.get("/settings/providers", headers=ADMIN_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert "providers" in data
    provider_ids = [p["id"] for p in data["providers"]]
    assert "openai" in provider_ids
    assert "ollama" in provider_ids
    assert "anthropic" in provider_ids

@patch("src.backend.app.routes.settings.fetch_ollama_tags", new_callable=AsyncMock)
def test_get_ollama_models_endpoint(mock_tags):
    mock_tags.return_value = [
        {"name": "llama3.2", "size": 2000000000, "digest": "a1b2c3d4e5f6"},
        {"name": "nomic-embed-text", "size": 500000000, "digest": "f6e5d4c3b2a1"},
    ]
    # Unauthenticated request must return 401
    unauth = client.get("/settings/ollama/models")
    assert unauth.status_code == 401

    # Non-admin user gets 403 Forbidden
    forbidden = client.get("/settings/ollama/models", headers=USER_HEADERS)
    assert forbidden.status_code == 403

    # Admin user succeeds
    response = client.get("/settings/ollama/models", headers=ADMIN_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert data["connected"] is True
    assert len(data["models"]) == 2
    assert data["models"][0]["name"] == "llama3.2"

@patch("src.backend.app.routes.settings.save_provider_setting", new_callable=AsyncMock)
def test_post_settings_endpoint(mock_save):
    mock_save.return_value = {
        "id": 1,
        "provider": "openai",
        "selected_llm": "gpt-4o",
        "selected_embedding": "text-embedding-3-small",
        "api_key_masked": "sk-proj••••••••89ab",
        "has_api_key": True,
        "ollama_base_url": "http://localhost:11434",
        "is_active": True,
        "updated_at": "2026-08-30T22:00:00",
    }
    payload = {
        "provider": "openai",
        "selected_llm": "gpt-4o",
        "selected_embedding": "text-embedding-3-small",
        "api_key": "sk-proj-secret12389ab",
    }
    # Unauthenticated request must return 401
    unauth = client.post("/settings/", json=payload)
    assert unauth.status_code == 401

    # Non-admin user gets 403
    forbidden = client.post("/settings/", json=payload, headers=USER_HEADERS)
    assert forbidden.status_code == 403

    # Admin user succeeds
    response = client.post("/settings/", json=payload, headers=ADMIN_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "openai"
    assert data["api_key_masked"] == "sk-proj••••••••89ab"

def test_ollama_ssrf_rejection():
    # Attempting to query cloud metadata endpoint must be blocked by SSRF filter
    resp = client.get(
        "/settings/ollama/models?url=http://169.254.169.254/latest/meta-data",
        headers=ADMIN_HEADERS
    )
    assert resp.status_code == 400
    assert "Disallowed Ollama base URL host" in resp.json()["detail"]

