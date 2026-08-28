from celery import Celery
from src.backend.app.config import settings

celery_app = Celery(
    "docusage",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["src.backend.worker.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)