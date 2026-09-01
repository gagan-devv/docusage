from prometheus_client import Counter, Histogram, REGISTRY, generate_latest, CONTENT_TYPE_LATEST
from typing import Sequence, Optional, Dict, Any


class SafeCounter(Counter):
    """A Counter that allows direct inc() calls using default label values
    if initialized with labels, while still supporting standard .labels() calls.
    """

    def inc(self, amount: float = 1.0) -> None:
        if self._is_parent() and self._labelnames:
            defaults = {k: "default" for k in self._labelnames}
            return self.labels(**defaults).inc(amount)
        return super().inc(amount)


def get_or_create_counter(
    name: str,
    documentation: str,
    labelnames: Sequence[str] = (),
    registry=REGISTRY
) -> Counter:
    """Retrieve an existing Counter or register a new SafeCounter idempotently."""
    if name in registry._names_to_collectors:
        return registry._names_to_collectors[name]
    total_name = f"{name}_total"
    if total_name in registry._names_to_collectors:
        return registry._names_to_collectors[total_name]
    try:
        return SafeCounter(name, documentation, labelnames, registry=registry)
    except ValueError:
        return registry._names_to_collectors.get(name, registry._names_to_collectors.get(total_name))


def get_or_create_histogram(
    name: str,
    documentation: str,
    labelnames: Sequence[str] = (),
    buckets: Sequence[float] = (0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
    registry=REGISTRY
) -> Histogram:
    """Retrieve an existing Histogram or register a new one idempotently."""
    if name in registry._names_to_collectors:
        return registry._names_to_collectors[name]
    try:
        return Histogram(name, documentation, labelnames, buckets=buckets, registry=registry)
    except ValueError:
        return registry._names_to_collectors[name]


# Metric Definitions
http_requests_total = get_or_create_counter(
    name="http_requests_total",
    documentation="Total count of HTTP requests processed by endpoint and status code",
    labelnames=("method", "endpoint", "status")
)

contract_evaluations_total = get_or_create_counter(
    name="contract_evaluations_total",
    documentation="Total count of contract evaluations completed or processed",
    labelnames=("status",)
)

audit_exports_total = get_or_create_counter(
    name="audit_exports_total",
    documentation="Total count of audit report exports downloaded by format",
    labelnames=("format",)
)

rag_search_duration_seconds = get_or_create_histogram(
    name="rag_search_duration_seconds",
    documentation="Duration of RAG clause retrieval and vector searches in seconds",
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0)
)

# Uppercase aliases for conventional naming
HTTP_REQUESTS_TOTAL = http_requests_total
CONTRACT_EVALUATIONS_TOTAL = contract_evaluations_total
AUDIT_EXPORTS_TOTAL = audit_exports_total
RAG_SEARCH_DURATION_SECONDS = rag_search_duration_seconds


def get_metrics_content() -> bytes:
    """Generate Prometheus exposition format representation."""
    return generate_latest(REGISTRY)
