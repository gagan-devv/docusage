import json
from typing import List, Optional, Dict, Any
from src.backend.app.utils.db import get_db_connection, release_db_connection
from src.backend.app.models.policies import PolicyResponse

async def create_policy(name: str, rules: List[Dict[str, Any]]) -> PolicyResponse:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO policies (name, rules) VALUES (%s, %s) RETURNING id, name, rules",
            (name, json.dumps(rules))
        )
        row = cursor.fetchone()
        conn.commit()
        cursor.close()
        return PolicyResponse(id=row[0], name=row[1], rules=row[2] if isinstance(row[2], list) else json.loads(row[2]))
    finally:
        release_db_connection(conn)

async def get_policy(policy_id: int) -> Optional[PolicyResponse]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, rules FROM policies WHERE id = %s", (policy_id,))
        row = cursor.fetchone()
        cursor.close()
        if not row:
            return None
        rules = row[2] if isinstance(row[2], list) else json.loads(row[2]) if row[2] else []
        return PolicyResponse(id=row[0], name=row[1], rules=rules)
    finally:
        release_db_connection(conn)

async def list_policies(skip: int = 0, limit: int = 50) -> List[PolicyResponse]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, name, rules FROM policies ORDER BY id LIMIT %s OFFSET %s",
            (limit, skip)
        )
        rows = cursor.fetchall()
        cursor.close()
        results = []
        for r in rows:
            rules = r[2] if isinstance(r[2], list) else json.loads(r[2]) if r[2] else []
            results.append(PolicyResponse(id=r[0], name=r[1], rules=rules))
        return results
    finally:
        release_db_connection(conn)

async def delete_policy(policy_id: int) -> bool:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM policies WHERE id = %s", (policy_id,))
        deleted = cursor.rowcount > 0
        conn.commit()
        cursor.close()
        return deleted
    finally:
        release_db_connection(conn)
