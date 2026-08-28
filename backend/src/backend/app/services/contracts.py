import json
import psycopg2
from typing import Optional
from src.backend.app.config import settings
from src.backend.app.utils.db import get_db_connection, release_db_connection
from src.backend.app.models.contracts import ContractResponse, EvalResponse

async def save_contract(name: str, file_path: str, metadata: dict) -> ContractResponse:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO contracts (name, file_path, metadata) VALUES (%s, %s, %s) RETURNING *",
            (name, file_path, json.dumps(metadata))
        )
        contract = cursor.fetchone()
        conn.commit()
        cursor.close()

        raw_meta = contract[3]
        parsed_meta = raw_meta if isinstance(raw_meta, dict) else json.loads(raw_meta) if raw_meta else {}

        return ContractResponse(
            id=contract[0],
            name=contract[1],
            file_path=contract[2],
            metadata=parsed_meta,
            created_at=contract[4]
        )
    finally:
        release_db_connection(conn)

async def get_contract(contract_id: int) -> Optional[ContractResponse]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM contracts WHERE id = %s", (contract_id,))
        contract = cursor.fetchone()
        cursor.close()

        if contract:
            raw_meta = contract[3]
            parsed_meta = raw_meta if isinstance(raw_meta, dict) else json.loads(raw_meta) if raw_meta else {}
            return ContractResponse(
                id=contract[0],
                name=contract[1],
                file_path=contract[2],
                metadata=parsed_meta,
                created_at=contract[4]
            )
        return None
    finally:
        release_db_connection(conn)

async def list_contracts(skip: int = 0, limit: int = 50) -> list[ContractResponse]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM contracts ORDER BY id DESC LIMIT %s OFFSET %s", (limit, skip))
        rows = cursor.fetchall()
        cursor.close()
        return [
            ContractResponse(
                id=r[0],
                name=r[1],
                file_path=r[2],
                metadata=r[3] if isinstance(r[3], dict) else json.loads(r[3]) if r[3] else {},
                created_at=r[4]
            )
            for r in rows
        ]
    finally:
        release_db_connection(conn)

async def delete_contract(contract_id: int) -> bool:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        # Delete associated clauses first
        cursor.execute("DELETE FROM clauses WHERE contract_id = %s", (contract_id,))
        cursor.execute("DELETE FROM evals WHERE contract_id = %s", (contract_id,))
        cursor.execute("DELETE FROM contracts WHERE id = %s", (contract_id,))
        deleted = cursor.rowcount > 0
        conn.commit()
        cursor.close()
        return deleted
    finally:
        release_db_connection(conn)

async def get_contract_evals(contract_id: int) -> list[EvalResponse]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, contract_id, metric_name, value, timestamp FROM evals WHERE contract_id = %s ORDER BY timestamp DESC",
            (contract_id,)
        )
        rows = cursor.fetchall()
        cursor.close()
        return [
            EvalResponse(
                id=r[0],
                contract_id=r[1],
                metric_name=r[2],
                value=r[3],
                timestamp=r[4]
            )
            for r in rows
        ]
    finally:
        release_db_connection(conn)