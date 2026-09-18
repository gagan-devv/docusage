from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Response
from src.backend.app.services.contracts import save_contract, get_contract
from src.backend.app.models.contracts import ContractCreate, ContractResponse, EvalResponse
from src.backend.app.routes.auth import get_current_user, get_accessible_contract_id, get_admin_contract_id
from src.backend.app.services.rbac import CurrentUser
from typing import List, Optional, Literal
from pydantic import BaseModel
from src.backend.agents.analyzer import ContractAnalysisEngine
import uuid
import os

router = APIRouter()
engine = ContractAnalysisEngine()

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}
MAX_UPLOAD_SIZE = 25 * 1024 * 1024  # 25 MB

class HumanReviewRequest(BaseModel):
    action: Literal["approve", "reject", "revise"]
    feedback: Optional[str] = None

@router.post("/upload", response_model=ContractResponse)
async def upload_contract(file: UploadFile = File(...), user: CurrentUser = Depends(get_current_user)):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds maximum allowed upload size (25MB)")

    contract_id = str(uuid.uuid4())
    file_path = f"data/contracts/{contract_id}{ext}"

    os.makedirs("data/contracts/", exist_ok=True)
    with open(file_path, "wb") as f:
        f.write(content)

    contract = await save_contract(
        name=file.filename or f"contract{ext}",
        file_path=file_path,
        metadata={'size': len(content)},
        contract_id=contract_id,
        org_id=user.org_id,
        created_by_user_id=user.id,
    )
    # ponytail: try celery task first, silent fallback to local ingest if worker offline
    try:
        from src.backend.worker.tasks import ingest_contract_task
        ingest_contract_task.delay(contract.id, file_path)
    except Exception:
        try:
            from src.backend.worker.tasks import ingest_contract
            ingest_contract(contract.id, file_path)
        except Exception:
            pass

    return contract

@router.get("/", response_model=List[ContractResponse])
async def get_all_contracts(skip: int = 0, limit: int = 50, user: CurrentUser = Depends(get_current_user)):
    from src.backend.app.services.contracts import list_contracts
    return await list_contracts(skip=skip, limit=limit, user_id=user.id, is_admin=user.is_admin, org_id=user.org_id)

@router.get("/tasks/{task_id}")
async def get_task_status(task_id: str, user: CurrentUser = Depends(get_current_user)):
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
async def get_contract_by_id(contract_id: str = Depends(get_accessible_contract_id)):
    contract = await get_contract(contract_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    return contract

@router.get("/{contract_id}/evals", response_model=List[EvalResponse])
async def get_evals_for_contract(contract_id: str = Depends(get_accessible_contract_id)):
    from src.backend.app.services.contracts import get_contract_evals
    return await get_contract_evals(contract_id)

@router.get("/{contract_id}/clauses")
async def get_clauses_for_contract(contract_id: str = Depends(get_accessible_contract_id)):
    from src.backend.app.services.contracts import get_contract_clauses_list
    return await get_contract_clauses_list(contract_id)

@router.delete("/{contract_id}", status_code=204)
async def remove_contract(contract_id: str = Depends(get_admin_contract_id)):
    from src.backend.app.services.contracts import delete_contract
    deleted = await delete_contract(contract_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Contract not found")
    return None

@router.post("/{contract_id}/graph/start/{policy_id}")
async def start_graph_analysis(
    policy_id: int,
    thread_id: Optional[str] = None,
    contract_id: str = Depends(get_accessible_contract_id)
):
    session_id = thread_id or f"contract-{contract_id}-policy-{policy_id}-{uuid.uuid4().hex[:6]}"
    return engine.start_review(contract_id=contract_id, policy_id=policy_id, thread_id=session_id)

@router.get("/graph/{thread_id}")
async def get_graph_status(thread_id: str, user: CurrentUser = Depends(get_current_user)):
    state = engine.get_state(thread_id)
    if not state:
        raise HTTPException(status_code=404, detail="Graph thread not found")
    return state

@router.post("/graph/{thread_id}/review")
async def submit_graph_review(
    thread_id: str,
    review: HumanReviewRequest,
    user: CurrentUser = Depends(get_current_user)
):
    try:
        return engine.submit_human_decision(thread_id, action=review.action, feedback=review.feedback)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{contract_id}/analyze/{policy_id}")
async def analyze_contract(policy_id: int, contract_id: str = Depends(get_accessible_contract_id)):
    session_id = f"sync-{contract_id}-{policy_id}-{uuid.uuid4().hex[:6]}"
    return engine.start_review(contract_id=contract_id, policy_id=policy_id, thread_id=session_id)

@router.get("/{contract_id}/export")
async def export_contract_audit(
    policy_id: Optional[int] = 1,
    format: Optional[str] = "json",
    contract_id: str = Depends(get_accessible_contract_id)
):
    from src.backend.app.services.export import generate_audit_json_data, generate_audit_pdf_bytes

    if format and format.lower() == "pdf":
        pdf_bytes = await generate_audit_pdf_bytes(contract_id, policy_id)
        filename = f"Docusage_Audit_{contract_id[:8]}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    return await generate_audit_json_data(contract_id, policy_id)
