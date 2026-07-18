from typing import List, Dict, Any
import re

def clean_text(text: str) -> str:
    """Clean and normalize text (e.g., remove extra whitespace, special chars)."""
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'[^\w\s]', '', text)
    return text.strip()

def validate_contract_metadata(metadata: Dict[str, Any]) -> bool:
    """Validate contract metadata."""
    required_keys = ["name", "file_path"]
    return all(key in metadata for key in required_keys)

def chunk_text(text: str, chunk_size: int = 512) -> List[str]:
    """Split text into chunks of a specified size."""
    return [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]