from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from src.backend.app.routes.contracts import router as contracts_router
from src.backend.app.routes.metrics import router as metrics_router
from src.backend.app.routes.policies import router as policies_router
from src.backend.app.utils.db import close_db_connection
from src.backend.app.utils.logging import logger
from src.backend.app.utils.metrics import http_requests_total

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Docusage API application...")
    yield
    logger.info("Shutting down Docusage API and releasing database connections...")
    close_db_connection()

app = FastAPI(
    title="Docusage API",
    description="Intelligent Contract Analysis & Policy Compliance Engine",
    version="0.1.0",
    lifespan=lifespan
)

class PrometheusMetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        try:
            http_requests_total.labels(
                method=request.method,
                endpoint=request.url.path,
                status=str(response.status_code)
            ).inc()
        except Exception:
            pass
        return response

app.add_middleware(PrometheusMetricsMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from src.backend.app.routes.settings import router as settings_router

app.include_router(contracts_router, prefix="/contracts", tags=["contracts"])
app.include_router(metrics_router)
app.include_router(policies_router, prefix="/policies", tags=["policies"])
app.include_router(settings_router, prefix="/settings", tags=["settings"])

@app.get("/health", tags=["system"])
async def health_check():
    return {"status": "healthy", "service": "docusage"}

@app.get("/", tags=["system"])
async def root():
    return {"message": "Welcome to Docusage API", "docs_url": "/docs"}
