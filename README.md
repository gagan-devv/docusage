# Docusage ⚖️

**Autonomous Multi-Agent Contract Compliance & Policy Governance Engine with Checkpointed Human-in-the-Loop Arbitration, Passwordless Email+OTP, and Hierarchical Seniority-Based RBAC**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black.svg?logo=next.js&logoColor=white)](https://nextjs.org)
[![LangGraph](https://img.shields.io/badge/LangGraph-Multi--Agent_HITL-orange.svg)](https://github.com/langchain-ai/langgraph)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15_pgvector-336791.svg?logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![Resend](https://img.shields.io/badge/Resend-Email_OTP_Delivery-black.svg)](https://resend.com)
[![Celery](https://img.shields.io/badge/Celery-5.3-37814A.svg?logo=celery&logoColor=white)](https://docs.celeryq.dev)
[![Docker](https://img.shields.io/badge/Docker-Compose_Ready-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com)
[![Tests](https://img.shields.io/badge/Tests-48_Pytest_%26_14_Vitest_Passing-brightgreen.svg)](#testing--verification)

---

## Executive Overview

**Docusage** is an enterprise-grade contract compliance platform designed to audit legal agreements against corporate policies and regulatory mandates. Combining **LangGraph** multi-agent state machines, native **PostgreSQL `pgvector`** semantic retrieval, **Celery** distributed ingestion queues, a **Next.js 16** legal reviewer, and a **Custom Seniority-Based RBAC engine**, Docusage eliminates manual contract auditing bottlenecks while keeping legal counsel firmly in control via deterministic human-in-the-loop (HITL) breakpoints and strict document access barriers.

```
                  ┌────────────────────────────────────────┐
                  │       Next.js 16 App Router UI         │
                  │  (Titanium & Zinc Clinical Minimalism) │
                  └──────────────────┬─────────────────────┘
                                     │ REST / Streaming (Bearer JWT)
                                     ▼
                  ┌────────────────────────────────────────┐
                  │            FastAPI Gateway             │
                  │ (Auth, RBAC, CRUD, Evals & Telemetry)  │
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
               │ (Contracts, Roles, Grants, Policies, ACL) │
               └───────────────────────────────────────────┘
```

---

## Key Capabilities

- **Passwordless Email + OTP Authentication (Resend)**: Passwordless verification codes dispatched via Resend API. Dual-token issuance: **30-minute Access Tokens** and **7-day Refresh Tokens** with replay-detection family rotation.
- **Hierarchical Seniority-Based RBAC**: Numerical ranking ($1 - 100$) per role or member. Seniors ($P_{\text{user}} \ge P_{\text{creator}}$) automatically see documents created by juniors (Top-Down Visibility); juniors ($P_{\text{user}} < P_{\text{creator}}$) are blocked from seniors' contracts (Bottom-Up Restriction) unless explicit, revocable delegation grants are issued.
- **Stateful Multi-Agent LangGraph Workflow**: Autonomous pipeline (`retriever` $\rightarrow$ `auditor` $\rightarrow$ `human_review` $\rightarrow$ `refine` $\rightarrow$ `finalize`) with conditional routing. High-risk contracts trigger an automatic breakpoint (`interrupt_before=["human_review"]`), pausing execution until legal counsel approves, rejects, or requests iterations.
- **Dense Vector Search with Fallback**: Encodes text into 768-dimensional dense vectors using `sentence-transformers/all-mpnet-base-v2`. Queries leverage PostgreSQL native cosine distance operator (`<=>`), backed by zero-downtime in-memory NumPy fallback.
- **Provider Manager & AES-256 Vault**: Dynamic model provider selection (Local Ollama, OpenAI, Anthropic, Gemini) with Fernet AES-256 encrypted key storage and UI key masking.
- **Interactive Legal Reviewer & Access Delegation**: Split-screen workbench pairing an in-browser clause viewer with interactive deviation highlights, live LangGraph state graphs, a floating **Decision Dock**, and an **Access Delegation Modal**.
- **Enterprise Observability**: Real-time Prometheus metrics exposition (`/metrics`) tracking request volumes, evaluation statuses, and RAG search latencies, integrated with MLflow experiment logging.

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
│   │   │   ├── routes/       # auth, admin, contracts, policies, settings, metrics
│   │   │   ├── services/     # auth, rbac, provider_manager, contracts, policies
│   │   │   └── utils/        # jwt, security (AES-256), db, logging, metrics
│   │   └── worker/           # Celery application & ingestion tasks
│   └── tests/                # 48 Pytest, Hypothesis, and CRUD test suites
│
├── frontend/                 # Next.js 16 Web Application
│   ├── Dockerfile            # Multi-stage production container
│   ├── package.json          # Next.js, React 19, Tailwind, Vitest
│   ├── tailwind.config.ts    # Titanium & Zinc theme design tokens
│   ├── src/                  # App router pages, reviewer components, API client
│   │   ├── app/              # login, admin/roles, contracts, policies, evals
│   │   └── components/       # AccessGrantModal, SettingsModal, DecisionDock, etc.
│   └── tests/                # 14 Vitest unit tests + auth/admin workflows
│
├── scripts/
│   └── setup_db.sql          # Postgres schema, roles, members, grants, seed
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
| **Frontend UI** | [http://localhost:3000](http://localhost:3000) | Next.js Legal Workspace & Login |
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

### Authentication (`/auth`)
- `POST /auth/otp/request`: Request a 6-digit email OTP (dispatches email via Resend).
- `POST /auth/otp/verify`: Verify OTP and receive a 30-min Access Token and 7-day Refresh Token.
- `POST /auth/refresh`: Rotate and issue new dual-tokens with single-use replay protection.
- `GET /auth/me`: Retrieve authenticated user profile, organization role, and seniority priority.

### Organization Administration & RBAC (`/admin`)
- `GET /admin/org/roles`: List organization roles and numerical priority rankings ($1-100$).
- `PUT /admin/org/roles/{role_id}`: Update role seniority priority or description.
- `GET /admin/org/members`: List employees with effective seniority and custom overrides.
- `PUT /admin/org/members/{user_id}`: Reassign employee role or custom priority override.
- `GET /admin/contracts/{contract_id}/grants`: List active access delegation overrides for a document.
- `POST /admin/contracts/{contract_id}/grants`: Grant explicit document access to a junior employee.
- `DELETE /admin/contracts/{contract_id}/grants/{user_id}`: Revoke explicit document access.

### Contract Governance (`/contracts`)
- `POST /contracts/upload`: Multipart upload (`.pdf`, `.docx`, `.txt`) and Celery ingestion dispatch (tagged with creator and org).
- `GET /contracts/`: List contracts filtered by user's hierarchical seniority priority.
- `GET /contracts/{contract_id}`: Retrieve contract metadata (enforces seniority barrier: 403 Forbidden for unauthorized juniors).
- `DELETE /contracts/{contract_id}`: Cascade delete contract and extracted clauses.
- `GET /contracts/{contract_id}/evals`: List compliance and risk scores logged for this contract.
- `GET /contracts/tasks/{task_id}`: Poll Celery background ingestion task status.

### Model Settings & Vault (`/settings`)
- `GET /settings/providers`: List available LLM and embedding model providers.
- `GET /settings/ollama/models`: Discover locally running Ollama models in real time.
- `GET /settings/`: Retrieve active provider and masked API key.
- `POST /settings/`: Encrypt (AES-256) and store provider configuration.

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
# 1. Backend Pytest & Hypothesis property tests (48 tests)
uv run pytest -v

# 2. Frontend Vitest unit & workflow tests (14 tests)
cd frontend && npm test -- --run

# 3. Next.js production build verification
cd frontend && npm run build
```

---

## License

Distributed under the MIT License. See `LICENSE` for details.
