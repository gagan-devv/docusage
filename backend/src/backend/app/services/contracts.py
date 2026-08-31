import json
import psycopg2
from typing import Optional
from src.backend.app.config import settings
from src.backend.app.utils.db import get_db_connection, release_db_connection
from src.backend.app.models.contracts import ContractResponse, EvalResponse

async def save_contract(
    name: str, 
    file_path: str, 
    metadata: dict, 
    contract_id: Optional[str] = None,
    org_id: Optional[str] = None,
    created_by_user_id: Optional[str] = None,
    access_scope: str = "seniority",
) -> ContractResponse:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        if contract_id:
            cursor.execute(
                """
                INSERT INTO contracts (id, name, file_path, metadata, org_id, created_by_user_id, access_scope) 
                VALUES (%s, %s, %s, %s, %s, %s, %s) 
                RETURNING id, name, file_path, metadata, created_at
                """,
                (contract_id, name, file_path, json.dumps(metadata), org_id, created_by_user_id, access_scope)
            )
        else:
            cursor.execute(
                """
                INSERT INTO contracts (name, file_path, metadata, org_id, created_by_user_id, access_scope) 
                VALUES (%s, %s, %s, %s, %s, %s) 
                RETURNING id, name, file_path, metadata, created_at
                """,
                (name, file_path, json.dumps(metadata), org_id, created_by_user_id, access_scope)
            )
        contract = cursor.fetchone()
        conn.commit()
        cursor.close()

        raw_meta = contract[3]
        parsed_meta = raw_meta if isinstance(raw_meta, dict) else json.loads(raw_meta) if raw_meta else {}

        return ContractResponse(
            id=str(contract[0]),
            name=contract[1],
            file_path=contract[2],
            metadata=parsed_meta,
            created_at=contract[4]
        )
    finally:
        release_db_connection(conn)

async def get_contract(contract_id: str) -> Optional[ContractResponse]:
    try:
        import uuid
        valid_uuid = str(uuid.UUID(str(contract_id)))
    except (ValueError, AttributeError):
        return None

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, file_path, metadata, created_at FROM contracts WHERE id = %s", (valid_uuid,))
        contract = cursor.fetchone()
        cursor.close()

        if contract:
            raw_meta = contract[3]
            parsed_meta = raw_meta if isinstance(raw_meta, dict) else json.loads(raw_meta) if raw_meta else {}
            return ContractResponse(
                id=str(contract[0]),
                name=contract[1],
                file_path=contract[2],
                metadata=parsed_meta,
                created_at=contract[4]
            )
        return None
    finally:
        release_db_connection(conn)

async def list_contracts(
    skip: int = 0, 
    limit: int = 50,
    user_id: Optional[str] = None,
    is_admin: bool = False,
) -> list[ContractResponse]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        if not user_id or is_admin:
            cursor.execute(
                "SELECT id, name, file_path, metadata, created_at FROM contracts ORDER BY created_at DESC LIMIT %s OFFSET %s",
                (limit, skip)
            )
        else:
            # Hierarchical Seniority + Explicit Grants RBAC Query
            cursor.execute(
                """
                SELECT c.id, c.name, c.file_path, c.metadata, c.created_at 
                FROM contracts c
                WHERE (
                    c.created_by_user_id = %s
                    OR c.access_scope = 'org_wide'
                    OR c.created_by_user_id IS NULL
                    OR EXISTS (
                        SELECT 1 FROM contract_access_grants g 
                        WHERE g.contract_id = c.id AND g.user_id = %s 
                        AND (g.expires_at IS NULL OR g.expires_at > NOW())
                    )
                    OR COALESCE((
                        SELECT COALESCE(m.custom_priority_override, r.priority)
                        FROM organization_members m
                        JOIN organization_roles r ON m.role_id = r.id
                        WHERE m.user_id = %s
                    ), 0) >= COALESCE((
                        SELECT COALESCE(m2.custom_priority_override, r2.priority)
                        FROM organization_members m2
                        JOIN organization_roles r2 ON m2.role_id = r2.id
                        WHERE m2.user_id = c.created_by_user_id
                    ), 0)
                )
                ORDER BY c.created_at DESC LIMIT %s OFFSET %s
                """,
                (user_id, user_id, user_id, limit, skip)
            )
        rows = cursor.fetchall()
        cursor.close()
        return [
            ContractResponse(
                id=str(r[0]),
                name=r[1],
                file_path=r[2],
                metadata=r[3] if isinstance(r[3], dict) else json.loads(r[3]) if r[3] else {},
                created_at=r[4]
            )
            for r in rows
        ]
    finally:
        release_db_connection(conn)

async def delete_contract(contract_id: str) -> bool:
    try:
        import uuid
        valid_uuid = str(uuid.UUID(str(contract_id)))
    except (ValueError, AttributeError):
        return False

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM clauses WHERE contract_id = %s", (valid_uuid,))
        cursor.execute("DELETE FROM evals WHERE contract_id = %s", (valid_uuid,))
        cursor.execute("DELETE FROM contracts WHERE id = %s", (valid_uuid,))
        deleted = cursor.rowcount > 0
        conn.commit()
        cursor.close()
        return deleted
    finally:
        release_db_connection(conn)

async def get_contract_evals(contract_id: str) -> list[EvalResponse]:
    try:
        import uuid
        valid_uuid = str(uuid.UUID(str(contract_id)))
    except (ValueError, AttributeError):
        return []

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, contract_id, metric_name, value, timestamp FROM evals WHERE contract_id = %s ORDER BY timestamp DESC",
            (valid_uuid,)
        )
        rows = cursor.fetchall()
        cursor.close()
        return [
            EvalResponse(
                id=r[0],
                contract_id=str(r[1]),
                metric_name=r[2],
                value=r[3],
                timestamp=r[4]
            )
            for r in rows
        ]
    finally:
        release_db_connection(conn)

async def get_contract_clauses_list(contract_id: str) -> list[dict]:
    try:
        import uuid
        valid_uuid = str(uuid.UUID(str(contract_id)))
    except (ValueError, AttributeError):
        return []

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, contract_id, text, clause_type, entities FROM clauses WHERE contract_id = %s ORDER BY id ASC",
            (valid_uuid,)
        )
        rows = cursor.fetchall()
        cursor.close()
        return [
            {
                "id": r[0],
                "contract_id": str(r[1]),
                "text": r[2],
                "clause_type": r[3] or "Clause",
                "entities": r[4] or {},
            }
            for r in rows
        ]
    finally:
        release_db_connection(conn)