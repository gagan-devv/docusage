from webbrowser import get

from pydantic_core.core_schema import none_schema

from src.backend.app.config import settings
from src.backend.app.utils.db import get_db_connection
import psycopg2
from typing import Optional
from src.backend.app.models.contracts import ContractResponse

async def save_contract(name: str, file_path: str, metadata: dict) -> ContractResponse:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO contracts (name, file_path, metadata) VALUES (%s, %s, %s) RETURNING *", (name, file_path, metadata))
    contract = cursor.fetchone()
    conn.commit()
    cursor.close()

    return ContractResponse(
        id=contract[0],
        name=contract[1],
        file_path=contract[2],
        metadata=contract[3],
        created_at=contract[4]
    )

async def get_contract(contract_id: int) -> Optional[ContractResponse]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM contracts WHERE id = %s", (contract_id,))
    contract = cursor.fetchone()
    cursor.close()

    if contract:
        return ContractResponse(
            id=contract[0],
            name=contract[1],
            file_path=contract[2],
            metadata=contract[3],
            created_at=contract[4]
        )
    return None