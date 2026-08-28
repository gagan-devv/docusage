from fastapi import APIRouter, Response
from prometheus_client import CONTENT_TYPE_LATEST
from src.backend.app.utils.metrics import get_metrics_content

router = APIRouter()


@router.get("/metrics", tags=["observability"])
async def get_metrics():
    """Endpoint exposing Prometheus metrics in text exposition format."""
    return Response(content=get_metrics_content(), media_type=CONTENT_TYPE_LATEST)
