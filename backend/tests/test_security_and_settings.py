import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from src.backend.app.main import app
from src.backend.app.utils.security import encrypt_api_key, decrypt_api_key, mask_api_key

client = TestClient(app)

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
    response = client.get("/settings/providers")
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
    response = client.get("/settings/ollama/models")
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
    response = client.post("/settings/", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "openai"
    assert data["api_key_masked"] == "sk-proj••••••••89ab"
