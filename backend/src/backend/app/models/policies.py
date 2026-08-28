from pydantic import BaseModel
from typing import List, Dict, Any

class PolicyCreate(BaseModel):
    name: str
    rules: List[Dict[str, Any]]

class PolicyResponse(BaseModel):
    id: int
    name: str
    rules: List[Dict[str, Any]]
