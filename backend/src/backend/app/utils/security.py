import base64
import os
from cryptography.fernet import Fernet
from typing import Optional

# ponytail: deterministic fallback key for dev environment if SECRET_KEY unset
DEFAULT_SALT = b"docusage-secure-vault-salt-2026!"
_FERNET_INSTANCE: Optional[Fernet] = None

def get_fernet_cipher() -> Fernet:
    global _FERNET_INSTANCE
    if _FERNET_INSTANCE is None:
        secret = os.getenv("SECRET_KEY", "docusage-master-encryption-key-32bytes-secret!")
        key_32 = secret.encode("utf-8")[:32].ljust(32, b"0")
        url_safe_key = base64.urlsafe_b64encode(key_32)
        _FERNET_INSTANCE = Fernet(url_safe_key)
    return _FERNET_INSTANCE

def encrypt_api_key(raw_key: str) -> str:
    if not raw_key or not raw_key.strip():
        return ""
    cipher = get_fernet_cipher()
    encrypted_bytes = cipher.encrypt(raw_key.strip().encode("utf-8"))
    return encrypted_bytes.decode("utf-8")

def decrypt_api_key(encrypted_key: str) -> str:
    if not encrypted_key or not encrypted_key.strip():
        return ""
    try:
        cipher = get_fernet_cipher()
        decrypted_bytes = cipher.decrypt(encrypted_key.strip().encode("utf-8"))
        return decrypted_bytes.decode("utf-8")
    except Exception:
        return ""

def mask_api_key(raw_key: str) -> str:
    if not raw_key or len(raw_key) < 6:
        return "••••••••" if raw_key else ""
    prefix = raw_key[:7] if raw_key.startswith("sk-") else raw_key[:3]
    suffix = raw_key[-4:]
    return f"{prefix}••••••••{suffix}"
