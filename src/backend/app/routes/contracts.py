from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from src.backend.app.services.contracts import save_contract, get_contract
from src.backend.app.models.contracts import ContractCreate, ContractResponse
from typing import List
import uuid
import os

router = APIRouter()

@router.post("/upload", response_model=ContractResponse)
async def upload_contract(file: UploadFile = File(...)):
    contract_id = str(uuid.uuid4())
    file_path = f"data/contracts/{contract_id}.pdf"

    os.makedirs("data/contracts/", exist_ok=True)
    with open(file_path, "wb") as f:
        f.write(await file.read())

    contract = await save_contract(
        name=file.filename,
        file_path=file_path,
        metadata={'size': file.size}
    )
    return contract

@router.get("/{contract_id}", response_model=ContractResponse)
async def get_contract_by_id(contract_id: str):
    contract = await get_contract(contract_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    return contract
