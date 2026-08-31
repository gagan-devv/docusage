import pytest
import uuid
from fastapi.testclient import TestClient
from src.backend.app.main import app
from src.backend.app.utils.jwt import create_access_token
from src.backend.app.services.contracts import save_contract

client = TestClient(app)

ORG_ID = "11111111-1111-1111-1111-111111111111"
ADMIN_USER_ID = "00000000-0000-0000-0000-000000000001"
SENIOR_USER_ID = "00000000-0000-0000-0000-000000000002"
JUNIOR_USER_ID = "00000000-0000-0000-0000-000000000004"

@pytest.fixture
def senior_token():
    return create_access_token(
        user_id=SENIOR_USER_ID,
        email="senior@docusage.ai",
        org_id=ORG_ID,
        role="Senior Counsel",
        priority=70,
        is_admin=False,
    )

@pytest.fixture
def junior_token():
    return create_access_token(
        user_id=JUNIOR_USER_ID,
        email="junior@docusage.ai",
        org_id=ORG_ID,
        role="Junior Analyst",
        priority=20,
        is_admin=False,
    )

@pytest.fixture
def admin_token():
    return create_access_token(
        user_id=ADMIN_USER_ID,
        email="admin@docusage.ai",
        org_id=ORG_ID,
        role="Partner",
        priority=90,
        is_admin=True,
    )

@pytest.mark.anyio
async def test_hierarchical_seniority_and_grant_override_lifecycle(senior_token, junior_token, admin_token):
    # 1. Senior creates a confidential contract
    senior_contract = await save_contract(
        name="Senior_Exclusive_Deal.pdf",
        file_path="data/contracts/senior_deal.pdf",
        metadata={"category": "M&A"},
        org_id=ORG_ID,
        created_by_user_id=SENIOR_USER_ID,
        access_scope="seniority",
    )
    contract_id = senior_contract.id

    # 2. Junior creates a junior contract
    junior_contract = await save_contract(
        name="Junior_Research_Agreement.pdf",
        file_path="data/contracts/junior_research.pdf",
        metadata={"category": "Research"},
        org_id=ORG_ID,
        created_by_user_id=JUNIOR_USER_ID,
        access_scope="seniority",
    )

    # 3. Top-Down Visibility: Senior can view Junior's contract
    resp_senior_sees_junior = client.get(
        f"/contracts/{junior_contract.id}",
        headers={"Authorization": f"Bearer {senior_token}"},
    )
    assert resp_senior_sees_junior.status_code == 200

    # 4. Bottom-Up Restriction: Junior CANNOT view Senior's contract (403 Forbidden)
    resp_junior_forbidden = client.get(
        f"/contracts/{contract_id}",
        headers={"Authorization": f"Bearer {junior_token}"},
    )
    assert resp_junior_forbidden.status_code == 403
    assert "Insufficient seniority priority" in resp_junior_forbidden.json()["detail"]

    # 5. Bottom-Up Filtering: Senior contract is omitted from Junior's list
    resp_junior_list = client.get(
        "/contracts/",
        headers={"Authorization": f"Bearer {junior_token}"},
    )
    assert resp_junior_list.status_code == 200
    junior_visible_ids = [c["id"] for c in resp_junior_list.json()]
    assert junior_contract.id in junior_visible_ids
    assert contract_id not in junior_visible_ids

    # 6. Specific Delegation: Senior grants explicit access to Junior
    grant_resp = client.post(
        f"/admin/contracts/{contract_id}/grants",
        headers={"Authorization": f"Bearer {senior_token}"},
        json={"target_user_id": JUNIOR_USER_ID, "permission_level": "view"},
    )
    assert grant_resp.status_code == 200

    # 7. Junior can now view Senior's contract through the explicit grant!
    resp_junior_now_allowed = client.get(
        f"/contracts/{contract_id}",
        headers={"Authorization": f"Bearer {junior_token}"},
    )
    assert resp_junior_now_allowed.status_code == 200
    assert resp_junior_now_allowed.json()["id"] == contract_id

    # 8. Revocation: Senior revokes grant
    revoke_resp = client.delete(
        f"/admin/contracts/{contract_id}/grants/{JUNIOR_USER_ID}",
        headers={"Authorization": f"Bearer {senior_token}"},
    )
    assert revoke_resp.status_code == 200

    # 9. Junior is immediately blocked again (403 Forbidden)
    resp_junior_blocked_again = client.get(
        f"/contracts/{contract_id}",
        headers={"Authorization": f"Bearer {junior_token}"},
    )
    assert resp_junior_blocked_again.status_code == 403

    # 10. Admin Universal Access: Admin can always view regardless of seniority
    resp_admin = client.get(
        f"/contracts/{contract_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp_admin.status_code == 200
