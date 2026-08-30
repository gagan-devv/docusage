import os
import json
import httpx
from typing import Dict, Any, List, Optional
from src.backend.app.utils.db import get_db_connection, release_db_connection
from src.backend.app.utils.security import encrypt_api_key, decrypt_api_key, mask_api_key

SUPPORTED_PROVIDERS = [
    {
        "id": "openai",
        "name": "OpenAI",
        "requires_api_key": True,
        "llm_models": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
        "embedding_models": ["text-embedding-3-small", "text-embedding-3-large", "text-embedding-ada-002"],
    },
    {
        "id": "anthropic",
        "name": "Anthropic",
        "requires_api_key": True,
        "llm_models": ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"],
        "embedding_models": ["sentence-transformers/all-mpnet-base-v2"],
    },
    {
        "id": "gemini",
        "name": "Google Gemini",
        "requires_api_key": True,
        "llm_models": ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash-exp"],
        "embedding_models": ["models/embedding-001", "sentence-transformers/all-mpnet-base-v2"],
    },
    {
        "id": "ollama",
        "name": "Ollama (Local)",
        "requires_api_key": False,
        "llm_models": ["llama3.2", "llama3.1", "mistral", "qwen2.5", "codellama"],
        "embedding_models": ["nomic-embed-text", "mxbai-embed-large", "all-minilm"],
    },
    {
        "id": "local",
        "name": "SentenceTransformers (Offline Baseline)",
        "requires_api_key": False,
        "llm_models": ["rule-based-auditor"],
        "embedding_models": ["sentence-transformers/all-mpnet-base-v2", "sentence-transformers/all-MiniLM-L6-v2"],
    },
]

def get_ollama_base_url() -> str:
    # ponytail: check env first, fallback to host.docker.internal if in container
    env_url = os.getenv("OLLAMA_BASE_URL")
    if env_url:
        return env_url
    return "http://localhost:11434"

async def fetch_ollama_tags(base_url: Optional[str] = None) -> List[Dict[str, Any]]:
    url = (base_url or get_ollama_base_url()).rstrip("/") + "/api/tags"
    urls_to_try = [url]
    if "localhost" in url:
        urls_to_try.append(url.replace("localhost", "host.docker.internal"))

    for target_url in urls_to_try:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(target_url)
                if resp.status_code == 200:
                    data = resp.json()
                    models = data.get("models", [])
                    return [
                        {
                            "name": m.get("name"),
                            "size": m.get("size"),
                            "digest": m.get("digest", "")[:12],
                        }
                        for m in models
                    ]
        except Exception:
            continue
    return []

async def save_provider_setting(
    provider: str,
    selected_llm: str,
    selected_embedding: str,
    api_key: Optional[str] = None,
    ollama_base_url: Optional[str] = None,
) -> Dict[str, Any]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        encrypted = encrypt_api_key(api_key) if api_key else None
        target_ollama_url = ollama_base_url or get_ollama_base_url()

        # Deactivate previous active settings
        cursor.execute("UPDATE user_settings SET is_active = FALSE")
        
        cursor.execute(
            """
            INSERT INTO user_settings (provider, selected_llm, selected_embedding, encrypted_api_key, ollama_base_url, is_active, updated_at)
            VALUES (%s, %s, %s, %s, %s, TRUE, NOW())
            ON CONFLICT (provider) 
            DO UPDATE SET 
                selected_llm = EXCLUDED.selected_llm,
                selected_embedding = EXCLUDED.selected_embedding,
                encrypted_api_key = COALESCE(EXCLUDED.encrypted_api_key, user_settings.encrypted_api_key),
                ollama_base_url = EXCLUDED.ollama_base_url,
                is_active = TRUE,
                updated_at = NOW()
            RETURNING id, provider, selected_llm, selected_embedding, encrypted_api_key, ollama_base_url, is_active, updated_at
            """,
            (provider, selected_llm, selected_embedding, encrypted, target_ollama_url)
        )
        row = cursor.fetchone()
        conn.commit()
        cursor.close()

        decrypted = decrypt_api_key(row[4]) if row[4] else ""
        return {
            "id": row[0],
            "provider": row[1],
            "selected_llm": row[2],
            "selected_embedding": row[3],
            "api_key_masked": mask_api_key(decrypted),
            "has_api_key": bool(decrypted),
            "ollama_base_url": row[5],
            "is_active": row[6],
            "updated_at": row[7].isoformat() if row[7] else None,
        }
    finally:
        release_db_connection(conn)

async def get_active_setting() -> Dict[str, Any]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, provider, selected_llm, selected_embedding, encrypted_api_key, ollama_base_url, is_active, updated_at FROM user_settings WHERE is_active = TRUE LIMIT 1")
        row = cursor.fetchone()
        cursor.close()

        if not row:
            return {
                "id": 0,
                "provider": "local",
                "selected_llm": "rule-based-auditor",
                "selected_embedding": "sentence-transformers/all-mpnet-base-v2",
                "api_key_masked": "",
                "has_api_key": False,
                "ollama_base_url": get_ollama_base_url(),
                "is_active": True,
                "updated_at": None,
            }

        decrypted = decrypt_api_key(row[4]) if row[4] else ""
        return {
            "id": row[0],
            "provider": row[1],
            "selected_llm": row[2],
            "selected_embedding": row[3],
            "api_key_masked": mask_api_key(decrypted),
            "has_api_key": bool(decrypted),
            "ollama_base_url": row[5],
            "is_active": row[6],
            "updated_at": row[7].isoformat() if row[7] else None,
        }
    finally:
        release_db_connection(conn)
