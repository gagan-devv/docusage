import pytest
from fastapi.testclient import TestClient
from src.backend.agents.analyzer import (
    create_contract_analysis_graph,
    ContractAnalysisEngine,
    ContractAnalysisState
)
from src.backend.app.main import app

client = TestClient(app)


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


def test_graph_api_endpoints_full_lifecycle():
    """Verify FastAPI endpoints for starting review, querying status, and posting review."""
    # 1. Start review
    start_resp = client.post("/contracts/500/graph/start/1")
    assert start_resp.status_code == 200
    data = start_resp.json()
    thread_id = data["thread_id"]
    assert data["is_interrupted"] is True

    # 2. Get status
    status_resp = client.get(f"/contracts/graph/{thread_id}")
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert status_data["thread_id"] == thread_id
    assert status_data["is_interrupted"] is True

    # 3. Submit human approval
    review_payload = {
        "action": "approve",
        "feedback": "Approved via REST API test"
    }
    review_resp = client.post(f"/contracts/graph/{thread_id}/review", json=review_payload)
    assert review_resp.status_code == 200
    review_data = review_resp.json()
    assert review_data["is_interrupted"] is False
    assert review_data["state"]["status"] == "APPROVED_BY_LEGAL"
