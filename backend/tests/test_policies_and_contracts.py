import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from src.backend.app.main import app
from src.backend.app.models.policies import PolicyCreate, PolicyResponse

client = TestClient(app)

# ----------------------------------------------------------------------
# Policy Model & Validation Tests
# ----------------------------------------------------------------------

def test_policy_create_and_response_models():
    policy_data = {
        "name": "Standard Vendor Terms",
        "rules": [
            {"name": "governing_law", "query": "New York law"},
            {"name": "liability", "threshold": 1.0}
        ]
    }
    policy_create = PolicyCreate(**policy_data)
    assert policy_create.name == "Standard Vendor Terms"
    assert len(policy_create.rules) == 2

    response_data = {"id": 1, **policy_data}
    policy_resp = PolicyResponse(**response_data)
    assert policy_resp.id == 1
    assert policy_resp.name == "Standard Vendor Terms"


# ----------------------------------------------------------------------
# Policy API Routes Tests (with DB Mocking)
# ----------------------------------------------------------------------

@patch("src.backend.app.routes.policies.create_policy")
def test_create_policy_endpoint(mock_create):
    mock_create.return_value = PolicyResponse(
        id=1,
        name="Security Policy",
        rules=[{"name": "data_retention", "query": "delete within 30 days"}]
    )

    response = client.post(
        "/policies/",
        json={"name": "Security Policy", "rules": [{"name": "data_retention", "query": "delete within 30 days"}]}
    )
    assert response.status_code == 201
    assert response.json()["id"] == 1
    assert response.json()["name"] == "Security Policy"


@patch("src.backend.app.routes.policies.list_policies")
def test_list_policies_endpoint(mock_list):
    mock_list.return_value = [
        PolicyResponse(id=1, name="Policy A", rules=[]),
        PolicyResponse(id=2, name="Policy B", rules=[])
    ]

    response = client.get("/policies/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["id"] == 1
    assert data[1]["id"] == 2


@patch("src.backend.app.routes.policies.get_policy")
def test_get_policy_by_id_endpoints(mock_get):
    mock_get.return_value = PolicyResponse(id=42, name="Compliance Policy", rules=[])

    resp = client.get("/policies/42")
    assert resp.status_code == 200
    assert resp.json()["id"] == 42

    mock_get.return_value = None
    resp404 = client.get("/policies/9999")
    assert resp404.status_code == 404


@patch("src.backend.app.routes.policies.delete_policy")
def test_delete_policy_endpoint(mock_delete):
    mock_delete.return_value = True
    resp = client.delete("/policies/1")
    assert resp.status_code == 204

    mock_delete.return_value = False
    resp404 = client.delete("/policies/999")
    assert resp404.status_code == 404


# ----------------------------------------------------------------------
# Contract Extended Routes Tests (List, Delete, Tasks)
# ----------------------------------------------------------------------

@patch("src.backend.app.services.contracts.list_contracts")
def test_list_contracts_endpoint(mock_list):
    from src.backend.app.models.contracts import ContractResponse
    from datetime import datetime

    mock_list.return_value = [
        ContractResponse(
            id=1,
            name="MSA.pdf",
            file_path="data/contracts/1.pdf",
            metadata={"size": 1024},
            created_at=datetime.utcnow()
        )
    ]

    resp = client.get("/contracts/")
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["name"] == "MSA.pdf"


@patch("src.backend.app.services.contracts.delete_contract")
def test_delete_contract_endpoint(mock_del):
    mock_del.return_value = True
    resp = client.delete("/contracts/1")
    assert resp.status_code == 204

    mock_del.return_value = False
    resp404 = client.delete("/contracts/999")
    assert resp404.status_code == 404


def test_get_task_status_endpoint():
    resp = client.get("/contracts/tasks/dummy-task-id-12345")
    assert resp.status_code == 200
    assert "status" in resp.json()
    assert resp.json()["task_id"] == "dummy-task-id-12345"


@patch("src.backend.app.services.contracts.get_contract_evals")
def test_get_contract_evals_endpoint(mock_get_evals):
    from src.backend.app.models.contracts import EvalResponse
    from datetime import datetime, timezone

    mock_get_evals.return_value = [
        EvalResponse(
            id=1,
            contract_id=42,
            metric_name="compliance_score",
            value=0.95,
            timestamp=datetime.now(timezone.utc)
        ),
        EvalResponse(
            id=2,
            contract_id=42,
            metric_name="risk_score",
            value=0.05,
            timestamp=datetime.now(timezone.utc)
        )
    ]

    resp = client.get("/contracts/42/evals")
    assert resp.status_code == 200
    evals = resp.json()
    assert len(evals) == 2
    assert evals[0]["metric_name"] == "compliance_score"
    assert evals[0]["value"] == 0.95
    assert evals[1]["metric_name"] == "risk_score"
    assert evals[1]["value"] == 0.05
