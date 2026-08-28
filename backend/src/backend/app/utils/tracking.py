import os
from typing import Dict, Any, Optional
from contextlib import contextmanager
import mlflow
from src.backend.app.config import settings
from src.backend.app.utils.logging import logger


def is_tracking_enabled() -> bool:
    """Check whether MLflow tracking is globally enabled in settings."""
    return bool(getattr(settings, "mlflow_enabled", True))


def setup_mlflow() -> bool:
    """Initialize MLflow tracking URI and experiment safely.
    Returns True if setup was successful, False otherwise.
    """
    if not is_tracking_enabled():
        return False

    # Ensure local filesystem store works if configured
    os.environ.setdefault("MLFLOW_ALLOW_FILE_STORE", "true")
    # Quick timeouts so unreachable remote tracking servers fail fast without blocking requests
    os.environ.setdefault("MLFLOW_HTTP_REQUEST_MAX_RETRIES", "1")
    os.environ.setdefault("MLFLOW_HTTP_REQUEST_TIMEOUT", "2")

    try:
        tracking_uri = getattr(settings, "mlflow_tracking_uri", None)
        if tracking_uri:
            mlflow.set_tracking_uri(tracking_uri)

        experiment_name = getattr(settings, "mlflow_experiment_name", "docusage-contract-analysis")
        if experiment_name:
            mlflow.set_experiment(experiment_name)
        return True
    except Exception as e:
        logger.warning(f"MLflow setup failed (unreachable or disabled): {e}")
        return False


def log_param(key: str, value: Any) -> bool:
    """Safely log a single parameter to the active MLflow run."""
    if not is_tracking_enabled():
        return False
    try:
        mlflow.log_param(key, value)
        return True
    except Exception as e:
        logger.warning(f"MLflow log_param failed (safely ignored): {e}")
        return False


def log_params(params: Dict[str, Any]) -> bool:
    """Safely log a dictionary of parameters to the active MLflow run."""
    if not is_tracking_enabled():
        return False
    try:
        mlflow.log_params(params)
        return True
    except Exception as e:
        logger.warning(f"MLflow log_params failed (safely ignored): {e}")
        return False


def log_metric(key: str, value: float, step: Optional[int] = None) -> bool:
    """Safely log a single metric to the active MLflow run."""
    if not is_tracking_enabled():
        return False
    try:
        mlflow.log_metric(key, float(value), step=step)
        return True
    except Exception as e:
        logger.warning(f"MLflow log_metric failed (safely ignored): {e}")
        return False


def log_metrics(metrics: Dict[str, float], step: Optional[int] = None) -> bool:
    """Safely log a dictionary of metrics to the active MLflow run."""
    if not is_tracking_enabled():
        return False
    try:
        mlflow.log_metrics(metrics, step=step)
        return True
    except Exception as e:
        logger.warning(f"MLflow log_metrics failed (safely ignored): {e}")
        return False


@contextmanager
def safe_mlflow_run(
    run_name: Optional[str] = None,
    nested: bool = True,
    tags: Optional[Dict[str, str]] = None
):
    """Context manager for safely executing an MLflow run.
    Yields the active run object, or None if MLflow is disabled or unreachable.
    Never raises an uncaught exception.
    """
    if not is_tracking_enabled():
        yield None
        return

    run = None
    try:
        setup_mlflow()
        run = mlflow.start_run(run_name=run_name, nested=nested)
        if tags and run:
            mlflow.set_tags(tags)
    except Exception as e:
        logger.warning(f"MLflow start_run failed (safely ignored): {e}")
        yield None
        return

    try:
        yield run
    finally:
        if run:
            try:
                mlflow.end_run()
            except Exception as e:
                logger.warning(f"MLflow end_run failed (safely ignored): {e}")


def track_contract_evaluation(
    contract_id: int,
    policy_id: Optional[int] = None,
    metrics: Optional[Dict[str, float]] = None,
    params: Optional[Dict[str, Any]] = None,
    tags: Optional[Dict[str, str]] = None,
    run_name: Optional[str] = None
) -> Optional[str]:
    """Logs evaluation parameters and metrics to MLflow safely.
    If the MLflow tracking server is unreachable, disabled, or throws any error,
    it catches the exception gracefully and returns None without crashing the main flow.
    Returns the MLflow run ID upon successful tracking.
    """
    if not is_tracking_enabled():
        return None

    try:
        if not setup_mlflow():
            return None

        name = run_name or f"contract_eval_{contract_id}"
        with mlflow.start_run(run_name=name, nested=True) as run:
            run_params: Dict[str, Any] = {"contract_id": contract_id}
            if policy_id is not None:
                run_params["policy_id"] = policy_id
            if params:
                run_params.update(params)
            mlflow.log_params(run_params)

            if metrics:
                for metric_name, val in metrics.items():
                    if isinstance(val, (int, float)):
                        mlflow.log_metric(metric_name, float(val))

            eval_tags = {"service": "docusage-backend"}
            if tags:
                eval_tags.update(tags)
            mlflow.set_tags(eval_tags)

            return run.info.run_id
    except Exception as e:
        logger.warning(f"MLflow tracking execution encountered an error (safely handled): {e}")
        return None
