import pytest
from fastapi.testclient import TestClient
from src.backend.agents.analyzer import (
    create_contract_analysis_graph,
    ContractAnalysisEngine,
    ContractAnalysisState
)
from src.backend.app.main import app

from unittest.mock import patch, AsyncMock
from src.backend.app.utils.jwt import create_access_token

client = TestClient(app)

ADMIN_TOKEN = create_access_token(
    user_id="00000000-0000-0000-0000-000000000001",
    email="admin@docusage.ai",
    org_id="11111111-1111-1111-1111-111111111111",
    role="Partner",
    priority=100,
    is_admin=True,
)
ADMIN_HEADERS = {"Authorization": f"Bearer {ADMIN_TOKEN}"}


def test_graph_pauses_at_human_review_when_deviations_detected():
    """Verify that detected contract risk causes graph to interrupt before human_review."""
    engine = ContractAnalysisEngine()
    thread_id = "test-thread-pause-001"

    result = engine.start_review(contract_id=999, policy_id=1, thread_id=thread_id)

    assert result["is_interrupted"] is True
    assert "human_review" in result["next_step"]
    assert result["state"]["status"] == "audited"
    assert result["state"]["iteration_count"] == 1


def test_graph_resumes_on_human_approval():
    """Verify that human approval routes through finalize to approved state."""
    engine = ContractAnalysisEngine()
    thread_id = "test-thread-approve-002"

    engine.start_review(contract_id=999, policy_id=1, thread_id=thread_id)
    resume_result = engine.submit_human_decision(
        thread_id=thread_id,
        action="approve",
        feedback="Risk accepted by legal counsel"
    )

    assert resume_result["is_interrupted"] is False
    assert len(resume_result["next_step"]) == 0
    assert resume_result["state"]["status"] == "APPROVED_BY_LEGAL"
    assert resume_result["state"]["human_action"] == "approve"


def test_graph_resumes_on_human_rejection():
    """Verify that human rejection routes through finalize to rejected state."""
    engine = ContractAnalysisEngine()
    thread_id = "test-thread-reject-003"

    engine.start_review(contract_id=999, policy_id=1, thread_id=thread_id)
    resume_result = engine.submit_human_decision(
        thread_id=thread_id,
        action="reject",
        feedback="Indemnity clause unacceptable"
    )

    assert resume_result["is_interrupted"] is False
    assert resume_result["state"]["status"] == "REJECTED_BY_LEGAL"
    assert resume_result["state"]["human_action"] == "reject"


def test_graph_iterative_refinement_loop():
    """Verify that 'revise' triggers the refinement loop back to auditor."""
    engine = ContractAnalysisEngine()
    thread_id = "test-thread-revise-004"

    step1 = engine.start_review(contract_id=999, policy_id=1, thread_id=thread_id)
    assert step1["is_interrupted"] is True
    initial_iter = step1["state"]["iteration_count"]

    # Human requests revision with guidance
    step2 = engine.submit_human_decision(
        thread_id=thread_id,
        action="revise",
        feedback="Waived liability clause to 1x contract value"
    )

    # State iterated through refine -> auditor, increasing iteration count
    assert step2["state"]["iteration_count"] > initial_iter
    assert step2["state"]["human_action"] == "revise"


@patch("src.backend.app.routes.auth.check_contract_access", new_callable=AsyncMock)
def test_graph_api_endpoints_full_lifecycle(mock_access):
    """Verify FastAPI endpoints for starting review, querying status, and posting review."""
    mock_access.return_value = True
    cid = "00000000-0000-0000-0000-000000000500"

    # Unauthenticated rejected
    assert client.post(f"/contracts/{cid}/graph/start/1").status_code == 401

    # 1. Start review with auth
    start_resp = client.post(f"/contracts/{cid}/graph/start/1", headers=ADMIN_HEADERS)
    assert start_resp.status_code == 200
    data = start_resp.json()
    thread_id = data["thread_id"]
    assert data["is_interrupted"] is True

    # 2. Get status (unauthenticated rejected)
    assert client.get(f"/contracts/graph/{thread_id}").status_code == 401

    status_resp = client.get(f"/contracts/graph/{thread_id}", headers=ADMIN_HEADERS)
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert status_data["thread_id"] == thread_id
    assert status_data["is_interrupted"] is True

    # 3. Submit human approval (unauthenticated rejected)
    review_payload = {
        "action": "approve",
        "feedback": "Approved via REST API test"
    }
    assert client.post(f"/contracts/graph/{thread_id}/review", json=review_payload).status_code == 401

    review_resp = client.post(f"/contracts/graph/{thread_id}/review", json=review_payload, headers=ADMIN_HEADERS)
    assert review_resp.status_code == 200
    review_data = review_resp.json()
    assert review_data["is_interrupted"] is False
    assert review_data["state"]["status"] == "APPROVED_BY_LEGAL"
