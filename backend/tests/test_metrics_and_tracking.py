import pytest
from fastapi.testclient import TestClient
from prometheus_client import CONTENT_TYPE_LATEST
import mlflow

from src.backend.app.main import app
from src.backend.app.config import settings
from src.backend.app.utils.metrics import (
    http_requests_total,
    contract_evaluations_total,
    rag_search_duration_seconds,
    get_metrics_content
)
from src.backend.app.utils.tracking import (
    track_contract_evaluation,
    safe_mlflow_run,
    log_param,
    log_metric,
    is_tracking_enabled
)
from src.backend.agents.analyzer import ContractAnalysisEngine

client = TestClient(app)


def test_metrics_endpoint_returns_prometheus_format():
    """Verify that /metrics returns HTTP 200 with Prometheus exposition format."""
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "text/plain" in response.headers.get("content-type", "")

    body = response.text
    assert "http_requests_total" in body
    assert "contract_evaluations_total" in body
    assert "rag_search_duration_seconds" in body


def test_metrics_middleware_increments_http_requests():
    """Verify that HTTP requests increment the http_requests_total counter via middleware."""
    # Send request to /health
    health_resp = client.get("/health")
    assert health_resp.status_code == 200

    # Fetch /metrics and check counter for /health
    metrics_resp = client.get("/metrics")
    assert metrics_resp.status_code == 200
    body = metrics_resp.text
    assert 'http_requests_total' in body
    assert 'endpoint="/health"' in body


def test_metric_objects_safe_counter_and_histogram():
    """Verify counters and histograms can be incremented and observed safely."""
    # Test safe increment without explicit labels
    contract_evaluations_total.inc()
    http_requests_total.inc()

    # Test increment with explicit labels
    contract_evaluations_total.labels(status="APPROVED_TEST").inc(2)
    http_requests_total.labels(method="POST", endpoint="/test", status="200").inc(1)

    # Test histogram observation
    rag_search_duration_seconds.observe(0.045)

    metrics_text = get_metrics_content().decode("utf-8")
    assert 'status="APPROVED_TEST"' in metrics_text
    assert 'rag_search_duration_seconds_count' in metrics_text


def test_mlflow_tracking_safe_when_disabled(monkeypatch):
    """Verify MLflow tracking gracefully skips when disabled in settings."""
    monkeypatch.setattr(settings, "mlflow_enabled", False)
    assert is_tracking_enabled() is False

    run_id = track_contract_evaluation(
        contract_id=888,
        policy_id=1,
        metrics={"compliance_score": 0.95, "risk_score": 0.05}
    )
    assert run_id is None
    assert log_param("test_param", 123) is False
    assert log_metric("test_metric", 1.0) is False


def test_mlflow_tracking_safe_when_unreachable(monkeypatch):
    """Verify MLflow tracking catches exceptions gracefully when tracking server is unreachable."""
    monkeypatch.setattr(settings, "mlflow_enabled", True)
    # Point to an unreachable address
    monkeypatch.setattr(settings, "mlflow_tracking_uri", "http://127.0.0.1:59999")

    # Should safely catch exception and return None without raising
    run_id = track_contract_evaluation(
        contract_id=777,
        policy_id=2,
        metrics={"compliance_score": 0.8, "risk_score": 0.2},
        params={"category": "vendor"}
    )
    assert run_id is None

    # Context manager should also safely yield None without raising
    with safe_mlflow_run(run_name="unreachable_test") as run:
        assert run is None


def test_mlflow_tracking_successful_with_local_store(monkeypatch, tmp_path):
    """Verify MLflow logs parameters and metrics accurately when tracking backend is available."""
    db_path = tmp_path / "mlflow_test.db"
    uri = f"sqlite:///{db_path}"

    monkeypatch.setattr(settings, "mlflow_enabled", True)
    monkeypatch.setattr(settings, "mlflow_tracking_uri", uri)
    monkeypatch.setattr(settings, "mlflow_experiment_name", "test-docusage-metrics")

    run_id = track_contract_evaluation(
        contract_id=1234,
        policy_id=5,
        metrics={"compliance_score": 0.92, "risk_score": 0.08},
        params={"contract_type": "NDA"}
    )
    assert run_id is not None
    assert isinstance(run_id, str)

    # Verify run details in MLflow
    client = mlflow.tracking.MlflowClient(tracking_uri=uri)
    run_data = client.get_run(run_id).data
    assert run_data.metrics["compliance_score"] == pytest.approx(0.92)
    assert run_data.metrics["risk_score"] == pytest.approx(0.08)
    assert run_data.params["contract_type"] == "NDA"
    assert run_data.params["contract_id"] == "1234"


def test_analyzer_graph_completion_executes_metrics_and_tracking():
    """Verify that completing contract analysis graph executes finalizer metrics and tracking safely."""
    engine = ContractAnalysisEngine()
    thread_id = "test-metrics-tracking-graph-run"

    # Start review and immediately approve
    engine.start_review(contract_id=999, policy_id=1, thread_id=thread_id)
    resume_result = engine.submit_human_decision(
        thread_id=thread_id,
        action="approve",
        feedback="Legal counsel sign-off"
    )

    assert resume_result["is_interrupted"] is False
    assert resume_result["state"]["status"] == "APPROVED_BY_LEGAL"

    # Check that contract_evaluations_total counter has been recorded for this status
    metrics_text = get_metrics_content().decode("utf-8")
    assert 'contract_evaluations_total{status="APPROVED_BY_LEGAL"}' in metrics_text
