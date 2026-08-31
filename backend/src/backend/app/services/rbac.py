import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from src.backend.app.utils.db import get_db_connection, release_db_connection

class CurrentUser(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    org_id: str
    role: str
    priority: int
    is_admin: bool = False

async def get_user_priority(org_id: str, user_id: str) -> int:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT COALESCE(m.custom_priority_override, r.priority) 
            FROM organization_members m
            JOIN organization_roles r ON m.role_id = r.id
            WHERE m.org_id = %s AND m.user_id = %s
            """,
            (org_id, user_id)
        )
        row = cursor.fetchone()
        cursor.close()
        return row[0] if row else 10
    finally:
        release_db_connection(conn)

async def check_contract_access(user: CurrentUser, contract_id: str, required_level: str = "view") -> bool:
    """
    Evaluates: Can user view or modify the contract?
    Rules:
    1. Org Owner / Admin -> always True
    2. Contract Creator -> always True
    3. Explicit Grant override in contract_access_grants -> True
    4. Seniority rule: User's priority >= Creator's priority -> True
    5. Otherwise -> False
    """
    if user.is_admin or user.role.lower() in ("partner", "admin", "owner"):
        return True

    try:
        import uuid
        valid_uuid = str(uuid.UUID(str(contract_id)))
    except (ValueError, AttributeError):
        return True

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        # Fetch contract creator and org
        cursor.execute(
            "SELECT id, org_id, created_by_user_id, access_scope FROM contracts WHERE id = %s",
            (valid_uuid,)
        )
        c_row = cursor.fetchone()
        if not c_row:
            cursor.close()
            return False

        contract_org_id, creator_id, access_scope = str(c_row[1]) if c_row[1] else None, str(c_row[2]) if c_row[2] else None, c_row[3]

        # Check creator identity
        if creator_id and creator_id == user.id:
            cursor.close()
            return True

        if access_scope == "org_wide":
            cursor.close()
            return True

        # Check explicit access grant
        cursor.execute(
            """
            SELECT id, permission_level, expires_at 
            FROM contract_access_grants 
            WHERE contract_id = %s AND user_id = %s
            """,
            (str(contract_id), user.id)
        )
        grant = cursor.fetchone()
        if grant:
            expires_at = grant[2]
            if expires_at is None or expires_at > datetime.now(timezone.utc):
                cursor.close()
                return True

        # If contract has no creator, visible to all in organization
        if not creator_id:
            cursor.close()
            return True

        # Evaluate Seniority: User Priority >= Creator Priority
        cursor.execute(
            """
            SELECT COALESCE(m.custom_priority_override, r.priority)
            FROM organization_members m
            JOIN organization_roles r ON m.role_id = r.id
            WHERE m.user_id = %s
            """,
            (creator_id,)
        )
        creator_row = cursor.fetchone()
        cursor.close()

        creator_priority = creator_row[0] if creator_row else 10
        return user.priority >= creator_priority
    finally:
        release_db_connection(conn)

async def grant_contract_access(
    contract_id: str,
    target_user_id: str,
    granted_by: CurrentUser,
    permission_level: str = "view",
    expires_at: Optional[datetime] = None,
) -> Dict[str, Any]:
    # Verify granter can access/administer contract
    can_grant = await check_contract_access(granted_by, contract_id, required_level="admin")
    if not can_grant:
        raise PermissionError("You do not have permission to delegate access for this contract.")

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO contract_access_grants (contract_id, user_id, granted_by_user_id, permission_level, expires_at, granted_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
            ON CONFLICT (contract_id, user_id)
            DO UPDATE SET 
                permission_level = EXCLUDED.permission_level,
                expires_at = EXCLUDED.expires_at,
                granted_by_user_id = EXCLUDED.granted_by_user_id,
                granted_at = NOW()
            RETURNING id, contract_id, user_id, permission_level, expires_at, granted_at
            """,
            (str(contract_id), str(target_user_id), granted_by.id, permission_level, expires_at)
        )
        row = cursor.fetchone()
        conn.commit()
        cursor.close()
        return {
            "id": row[0],
            "contract_id": str(row[1]),
            "user_id": str(row[2]),
            "permission_level": row[3],
            "expires_at": row[4].isoformat() if row[4] else None,
            "granted_at": row[5].isoformat() if row[5] else None,
        }
    finally:
        release_db_connection(conn)

async def revoke_contract_access(contract_id: str, target_user_id: str, revoked_by: CurrentUser) -> bool:
    can_revoke = await check_contract_access(revoked_by, contract_id, required_level="admin")
    if not can_revoke:
        raise PermissionError("You do not have permission to revoke access for this contract.")

    try:
        import uuid
        valid_uuid = str(uuid.UUID(str(contract_id)))
    except (ValueError, AttributeError):
        return False

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM contract_access_grants WHERE contract_id = %s AND user_id = %s",
            (valid_uuid, str(target_user_id))
        )
        deleted = cursor.rowcount > 0
        conn.commit()
        cursor.close()
        return deleted
    finally:
        release_db_connection(conn)

async def list_contract_grants(contract_id: str) -> List[Dict[str, Any]]:
    try:
        import uuid
        valid_uuid = str(uuid.UUID(str(contract_id)))
    except (ValueError, AttributeError):
        return []

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT g.id, g.contract_id, g.user_id, u.name, u.email, g.permission_level, g.expires_at, g.granted_at
            FROM contract_access_grants g
            JOIN users u ON g.user_id = u.id
            WHERE g.contract_id = %s
            ORDER BY g.granted_at DESC
            """,
            (valid_uuid,)
        )
        rows = cursor.fetchall()
        cursor.close()
        return [
            {
                "id": r[0],
                "contract_id": str(r[1]),
                "user_id": str(r[2]),
                "user_name": r[3],
                "user_email": r[4],
                "permission_level": r[5],
                "expires_at": r[6].isoformat() if r[6] else None,
                "granted_at": r[7].isoformat() if r[7] else None,
            }
            for r in rows
        ]
    finally:
        release_db_connection(conn)

async def list_org_roles(org_id: str) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, role_name, priority, description, is_admin, created_at
            FROM organization_roles
            WHERE org_id = %s
            ORDER BY priority DESC
            """,
            (org_id,)
        )
        rows = cursor.fetchall()
        cursor.close()
        return [
            {
                "id": r[0],
                "role_name": r[1],
                "priority": r[2],
                "description": r[3],
                "is_admin": r[4],
                "created_at": r[5].isoformat() if r[5] else None,
            }
            for r in rows
        ]
    finally:
        release_db_connection(conn)

async def update_org_role(role_id: int, priority: int, description: Optional[str] = None) -> Dict[str, Any]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE organization_roles 
            SET priority = %s, description = COALESCE(%s, description)
            WHERE id = %s
            RETURNING id, org_id, role_name, priority, description, is_admin
            """,
            (priority, description, role_id)
        )
        row = cursor.fetchone()
        conn.commit()
        cursor.close()
        if not row:
            raise ValueError("Role not found")
        return {
            "id": row[0],
            "org_id": str(row[1]),
            "role_name": row[2],
            "priority": row[3],
            "description": row[4],
            "is_admin": row[5],
        }
    finally:
        release_db_connection(conn)

async def list_org_members(org_id: str) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT u.id, u.name, u.email, r.id as role_id, r.role_name, 
                   COALESCE(m.custom_priority_override, r.priority) as effective_priority,
                   m.custom_priority_override, r.is_admin, m.joined_at
            FROM organization_members m
            JOIN users u ON m.user_id = u.id
            JOIN organization_roles r ON m.role_id = r.id
            WHERE m.org_id = %s
            ORDER BY effective_priority DESC
            """,
            (org_id,)
        )
        rows = cursor.fetchall()
        cursor.close()
        return [
            {
                "user_id": str(r[0]),
                "name": r[1],
                "email": r[2],
                "role_id": r[3],
                "role_name": r[4],
                "priority": r[5],
                "custom_priority_override": r[6],
                "is_admin": r[7],
                "joined_at": r[8].isoformat() if r[8] else None,
            }
            for r in rows
        ]
    finally:
        release_db_connection(conn)

async def update_member_role(
    org_id: str, 
    user_id: str, 
    role_id: int, 
    custom_priority_override: Optional[int] = None
) -> Dict[str, Any]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE organization_members
            SET role_id = %s, custom_priority_override = %s
            WHERE org_id = %s AND user_id = %s
            RETURNING id, org_id, user_id, role_id, custom_priority_override
            """,
            (role_id, custom_priority_override, org_id, user_id)
        )
        row = cursor.fetchone()
        conn.commit()
        cursor.close()
        if not row:
            raise ValueError("Member not found in organization")
        return {
            "id": row[0],
            "org_id": str(row[1]),
            "user_id": str(row[2]),
            "role_id": row[3],
            "custom_priority_override": row[4],
        }
    finally:
        release_db_connection(conn)
