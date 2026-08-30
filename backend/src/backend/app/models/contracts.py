from pydantic import BaseModel
from typing import Dict, Any, Union
from datetime import datetime

class ContractCreate(BaseModel):
    name: str
    file_path: str
    metadata: Dict[str, Any]

class ContractResponse(BaseModel):
    id: Union[str, int]
    name: str
    file_path: str
    metadata: Dict[str, Any]
    created_at: datetime

class EvalResponse(BaseModel):
    id: int
    contract_id: Union[str, int]
    metric_name: str
    value: float
    timestamp: datetime