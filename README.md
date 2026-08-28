# Docusage ⚖️

**Autonomous Multi-Agent Contract Compliance & Policy Governance Engine with Checkpointed Human-in-the-Loop Arbitration**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16.0-black.svg?logo=next.js&logoColor=white)](https://nextjs.org)
[![LangGraph](https://img.shields.io/badge/LangGraph-Multi--Agent_HITL-orange.svg)](https://github.com/langchain-ai/langgraph)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15_pgvector-336791.svg?logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![Celery](https://img.shields.io/badge/Celery-5.3-37814A.svg?logo=celery&logoColor=white)](https://docs.celeryq.dev)
[![Docker](https://img.shields.io/badge/Docker-Compose_Ready-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com)
[![Tests](https://img.shields.io/badge/Tests-Pytest_%26_Vitest_Passing-brightgreen.svg)](#testing--verification)

---

## Executive Overview

**Docusage** is an enterprise-grade contract compliance platform designed to audit legal agreements against corporate policies and regulatory mandates. Combining **LangGraph** multi-agent state machines, native **PostgreSQL `pgvector`** semantic retrieval, **Celery** distributed ingestion queues, and a **Next.js 14 App Router** legal reviewer, Docusage eliminates manual contract auditing bottlenecks while keeping legal counsel firmly in control via deterministic human-in-the-loop (HITL) breakpoints.

```
                  ┌────────────────────────────────────────┐
                  │       Next.js 14 App Router UI         │
                  │  (Titanium & Zinc Clinical Minimalism) │
                  └──────────────────┬─────────────────────┘
                                     │ REST / Streaming
                                     ▼
                  ┌────────────────────────────────────────┐
                  │            FastAPI Gateway             │
                  │     (CRUD, Evaluation & Telemetry)     │
                  └──────┬──────────────────────────┬──────┘
                         │                          │
           Tasks Enqueue │            State Machine │ Interrupt / Resume
                         ▼                          ▼
               ┌───────────────────┐      ┌───────────────────┐
               │   Celery Worker   │      │ LangGraph Engine  │
               │ (Chunk & Embed)   │      │  (Review Graph)   │
               └─────────┬─────────┘      └─────────┬─────────┘
                         │                          │
                         └───────────┬──────────────┘
                                     ▼
               ┌───────────────────────────────────────────┐
               │         PostgreSQL 15 + pgvector          │
               │   (Contracts, Clauses, Policies, Evals)   │
               └───────────────────────────────────────────┘
```

---

## Key Capabilities

- **Stateful Multi-Agent LangGraph Workflow**: Autonomous pipeline (`retriever` $\rightarrow$ `auditor` $\rightarrow$ `human_review` $\rightarrow$ `refine` $\rightarrow$ `finalize`) with conditional routing. High-risk contracts trigger an automatic breakpoint (`interrupt_before=["human_review"]`), pausing execution until legal counsel approves, rejects, or requests iterations.
- **Dense Vector Search with Fallback**: Encodes text into 768-dimensional dense vectors using `sentence-transformers/all-mpnet-base-v2`. Queries leverage PostgreSQL native cosine distance operator (`<=>`), backed by zero-downtime in-memory NumPy fallback.
- **Asynchronous Ingestion Queue**: Processes multi-format documents (`.pdf` with table extraction via `pdfplumber`, `.docx`, `.txt`) in background Celery workers backed by Redis, generating deterministic chunk embeddings without blocking API requests.
- **Interactive Legal Reviewer**: Split-screen workbench pairing an in-browser clause viewer with interactive deviation highlights, live LangGraph state graphs, and a floating **Decision Dock** for legal counsel review.
- **Enterprise Observability**: Real-time Prometheus metrics exposition (`/metrics`) tracking request volumes, evaluation statuses, and RAG search latencies, integrated with MLflow experiment logging.
- **Isolated Monorepo Architecture**: Clean separation between `backend/` and `frontend/` with dedicated Dockerfiles, unified Docker Compose orchestration, and isolated dependency management.

---

## System Topology

```
docusage/
├── backend/                  # FastAPI & LangGraph Core Engine
│   ├── Dockerfile            # Python 3.12 slim container
│   ├── requirements.txt      # Backend Python dependencies
│   ├── pytest.ini            # Local test runner config
│   ├── src/backend/
│   │   ├── agents/           # LangGraph StateGraph & Analysis Engine
│   │   ├── app/              # FastAPI routes, services, models, utils
│   │   └── worker/           # Celery application & ingestion tasks
│   └── tests/                # 32 Pytest, Hypothesis, and CRUD test suites
│
├── frontend/                 # Next.js 14 Web Application
│   ├── Dockerfile            # Multi-stage production container
│   ├── package.json          # Next.js, React 18, Tailwind, Vitest, Playwright
│   ├── tailwind.config.ts    # Titanium & Zinc theme design tokens
│   ├── src/                  # App router pages, reviewer components, API client
│   └── tests/                # 12 Vitest unit tests + Playwright browser flows
│
├── scripts/
│   └── setup_db.sql          # Postgres schema, pgvector, and policy seed
├── data/                     # Persistent contract document storage
├── docker-compose.yml        # Multi-service production stack
├── pytest.ini                # Root test runner pointing to backend/tests
└── ARCHITECTURE.md           # Deep technical specification
```

---

## Quickstart: Running Locally

### Option A: Complete Stack via Docker Compose (Recommended)

Start all services (Frontend, Backend API, Celery Worker, PostgreSQL with `pgvector`, and Redis) with one command:

```bash
docker compose up --build -d
```

Verify service health:
```bash
docker compose ps
```

| Service | Address | Description |
|---|---|---|
| **Frontend UI** | [http://localhost:3000](http://localhost:3000) | Next.js Legal Workspace |
| **Backend API** | [http://localhost:8000](http://localhost:8000) | FastAPI Gateway |
| **Interactive API Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | OpenAPI / Swagger UI |
| **Prometheus Metrics** | [http://localhost:8000/metrics](http://localhost:8000/metrics) | Prometheus Scraping Endpoint |
| **PostgreSQL Database** | `localhost:5432` | pgvector vector store (`docusage`) |
| **Redis Broker** | `localhost:6380` | Celery message queue |

To shut down:
```bash
docker compose down
```

---

### Option B: Local Native Development

#### 1. Start Infrastructure (PostgreSQL & Redis)
```bash
docker compose up postgres redis -d
```

#### 2. Backend & Celery Worker
Ensure Python 3.12+ and `uv` are available:
```bash
# Create virtual environment and install backend dependencies
uv venv .venv
source .venv/bin/activate
uv pip install -r backend/requirements.txt

# Terminal 1: Launch FastAPI Gateway
cd backend
uvicorn src.backend.app.main:app --reload --port 8000

# Terminal 2: Launch Celery Worker
cd backend
celery -A src.backend.worker.celery_app worker --loglevel=info
```

#### 3. Frontend Next.js Application
```bash
# Terminal 3: Launch Next.js App
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## API Reference

### System
- `GET /health`: Service health check (`{"status": "healthy"}`).
- `GET /metrics`: Prometheus metrics exposition format.

### Contract Governance (`/contracts`)
- `POST /contracts/upload`: Multipart upload (`.pdf`, `.docx`, `.txt`) and Celery ingestion dispatch.
- `GET /contracts/`: List contracts with pagination (`skip`, `limit`).
- `GET /contracts/{contract_id}`: Retrieve contract metadata by ID.
- `DELETE /contracts/{contract_id}`: Cascade delete contract and extracted clauses.
- `GET /contracts/{contract_id}/evals`: List compliance and risk scores logged for this contract.
- `GET /contracts/tasks/{task_id}`: Poll Celery background ingestion task status.

### Policy Management (`/policies`)
- `POST /policies/`: Register a new policy with custom rule covenants and thresholds.
- `GET /policies/`: List registered policies.
- `GET /policies/{policy_id}`: Retrieve policy definition and rules.
- `DELETE /policies/{policy_id}`: Delete a policy definition.

### Multi-Agent LangGraph Workflow (`/contracts/.../graph`)
- `POST /contracts/{contract_id}/graph/start/{policy_id}`: Initializes and triggers the LangGraph state machine. Pauses at `human_review` breakpoint if risk score exceeds threshold.
- `GET /contracts/graph/{thread_id}`: Fetches active thread state snapshot and next executable nodes.
- `POST /contracts/graph/{thread_id}/review`: Submits counsel decision (`approve`, `reject`, `revise`) with qualitative feedback to resume or iterate the graph.

---

## Testing & Verification

The repository enforces strict testing guarantees spanning unit, property-based, and browser-level checks:

```bash
# 1. Backend Pytest & Hypothesis property tests (32 tests)
.venv/bin/pytest -v

# 2. Frontend Vitest unit & workflow tests (12 tests)
cd frontend && npm test

# 3. End-to-end Playwright browser flows & Chrome DevTools profiling
cd frontend && npm run test:e2e
```

---

## Technical Documentation

For an in-depth analysis of the LangGraph state machine, data models, vector indexing mathematics, and human-in-the-loop checkpoint mechanisms, read [`ARCHITECTURE.md`](ARCHITECTURE.md).

---

## License

Distributed under the MIT License. See `LICENSE` for details.
