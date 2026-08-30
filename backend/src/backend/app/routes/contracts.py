from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from src.backend.app.services.contracts import save_contract, get_contract
from src.backend.app.models.contracts import ContractCreate, ContractResponse, EvalResponse
from typing import List, Optional, Literal
import uuid
import os

router = APIRouter()

@router.post("/upload", response_model=ContractResponse)
async def upload_contract(file: UploadFile = File(...)):
    contract_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1] or ".pdf"
    file_path = f"data/contracts/{contract_id}{ext}"

    os.makedirs("data/contracts/", exist_ok=True)
    with open(file_path, "wb") as f:
        f.write(await file.read())

    contract = await save_contract(
        name=file.filename,
        file_path=file_path,
        metadata={'size': file.size},
        contract_id=contract_id
    )
    # ponytail: try celery task first, silent fallback if worker offline
    try:
        from src.backend.worker.tasks import ingest_contract_task
        ingest_contract_task.delay(contract.id, file_path)
    except Exception:
        pass

    return contract

@router.get("/", response_model=List[ContractResponse])
async def get_all_contracts(skip: int = 0, limit: int = 50):
    from src.backend.app.services.contracts import list_contracts
    return await list_contracts(skip=skip, limit=limit)

@router.get("/tasks/{task_id}")
async def get_task_status(task_id: str):
    try:
        from celery.result import AsyncResult
        from src.backend.worker.celery_app import celery_app
        result = AsyncResult(task_id, app=celery_app)
        return {
            "task_id": task_id,
            "status": result.status,
            "ready": result.ready(),
            "result": result.result if result.ready() and not isinstance(result.result, Exception) else str(result.result) if result.ready() else None
        }
    except Exception as e:
        return {"task_id": task_id, "status": "UNKNOWN", "error": str(e)}

@router.get("/{contract_id}", response_model=ContractResponse)
async def get_contract_by_id(contract_id: str):
    contract = await get_contract(contract_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    return contract

@router.get("/{contract_id}/evals", response_model=List[EvalResponse])
async def get_evals_for_contract(contract_id: str):
    from src.backend.app.services.contracts import get_contract_evals
    return await get_contract_evals(contract_id)

@router.delete("/{contract_id}", status_code=204)
async def remove_contract(contract_id: str):
    from src.backend.app.services.contracts import delete_contract
    deleted = await delete_contract(contract_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Contract not found")
    return None

from pydantic import BaseModel
from src.backend.agents.analyzer import ContractAnalysisEngine

engine = ContractAnalysisEngine()

class HumanReviewRequest(BaseModel):
    action: Literal["approve", "reject", "revise"]
    feedback: Optional[str] = None

@router.post("/{contract_id}/graph/start/{policy_id}")
async def start_graph_analysis(contract_id: str, policy_id: int, thread_id: Optional[str] = None):
    session_id = thread_id or f"contract-{contract_id}-policy-{policy_id}-{uuid.uuid4().hex[:6]}"
    result = engine.start_review(contract_id=contract_id, policy_id=policy_id, thread_id=session_id)
    return result

@router.get("/graph/{thread_id}")
async def get_graph_status(thread_id: str):
    state = engine.get_state(thread_id)
    if not state:
        raise HTTPException(status_code=404, detail="Graph thread not found")
    return state

@router.post("/graph/{thread_id}/review")
async def submit_graph_review(thread_id: str, review: HumanReviewRequest):
    try:
        result = engine.submit_human_decision(thread_id, action=review.action, feedback=review.feedback)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{contract_id}/analyze/{policy_id}")
async def analyze_contract(contract_id: str, policy_id: int):
    session_id = f"sync-{contract_id}-{policy_id}-{uuid.uuid4().hex[:6]}"
    result = engine.start_review(contract_id=contract_id, policy_id=policy_id, thread_id=session_id)
    return result
