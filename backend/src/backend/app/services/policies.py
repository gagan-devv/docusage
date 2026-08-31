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

DEFAULT_POLICIES = [
    {
        "name": "Corporate Commercial MSA Policy",
        "rules": [
            {"name": "Limitation of Liability Cap", "query": "limitation of liability cap aggregate liability", "threshold": 0.8},
            {"name": "Governing Law (New York)", "query": "governing law jurisdiction New York", "threshold": 0.85},
            {"name": "Mutual Indemnification", "query": "indemnify hold harmless mutual third party claims", "threshold": 0.75}
        ]
    },
    {
        "name": "Institutional MoU & Event Policy",
        "rules": [
            {"name": "Governing Law (India / Gwalior)", "query": "governing law jurisdiction dispute resolution India Gwalior Madhya Pradesh", "threshold": 0.8},
            {"name": "Force Majeure Rescheduling", "query": "force majeure act of God rescheduling performance advance refund", "threshold": 0.8},
            {"name": "Cancellation & Logistics Reimbursement", "query": "cancellation unspent advances logistics non-recoverable refund", "threshold": 0.75},
            {"name": "Authorized Signatories", "query": "authorized signatory Director President SAC Cultural Associate Dean", "threshold": 0.7}
        ]
    },
    {
        "name": "Budget & Financial Allocation Policy",
        "rules": [
            {"name": "Advance Disbursement Cap (<= 70%)", "query": "advance payment percentage 70% booking confirm arrangements", "threshold": 0.8},
            {"name": "Itemized Expenditure Breakdown", "query": "item description amount budget allocation production banners decor sound", "threshold": 0.8},
            {"name": "Post-Event Documentation & Bills", "query": "expenses documented bills submitted post-event account reconciliation", "threshold": 0.75},
            {"name": "Dean & Faculty Approval", "query": "approval support FiC Dean Student Affairs Associate Dean SAC", "threshold": 0.75}
        ]
    },
    {
        "name": "NDA & Bilateral Confidentiality Policy",
        "rules": [
            {"name": "Definition of Confidential Information", "query": "confidential information trade secrets proprietary technical commercial", "threshold": 0.8},
            {"name": "Non-Disclosure & Standard of Care", "query": "non-disclosure reasonable care protect third party unauthorized access", "threshold": 0.8},
            {"name": "Term & Survival Duration", "query": "term of agreement years survival obligation return destroy materials", "threshold": 0.75}
        ]
    }
]


def ensure_default_policies_seeded(cursor):
    """Seed all 4 enterprise policies if not already present."""
    for p in DEFAULT_POLICIES:
        cursor.execute("SELECT id FROM policies WHERE name = %s", (p["name"],))
        if not cursor.fetchone():
            cursor.execute(
                "INSERT INTO policies (name, rules) VALUES (%s, %s)",
                (p["name"], json.dumps(p["rules"]))
            )


async def list_policies(skip: int = 0, limit: int = 50) -> List[PolicyResponse]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        ensure_default_policies_seeded(cursor)
        conn.commit()

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
