# Docusage ⚖️

**Autonomous Multi-Agent Contract Compliance & Policy Governance Engine with Checkpointed Human-in-the-Loop Arbitration, Passwordless Email+OTP, and Hierarchical Seniority-Based RBAC**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black.svg?logo=next.js&logoColor=white)](https://nextjs.org)
[![LangGraph](https://img.shields.io/badge/LangGraph-1.2+_Multi--Agent_CRAG-orange.svg)](https://github.com/langchain-ai/langgraph)
[![HuggingFace](https://img.shields.io/badge/HuggingFace-Llama--3.3--70B_%26_Qwen2.5--72B-FFD21E.svg?logo=huggingface&logoColor=black)](https://huggingface.co)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15_pgvector-336791.svg?logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![Resend](https://img.shields.io/badge/Resend-Email_OTP_Delivery-black.svg)](https://resend.com)
[![Celery](https://img.shields.io/badge/Celery-5.3-37814A.svg?logo=celery&logoColor=white)](https://docs.celeryq.dev)
[![Docker](https://img.shields.io/badge/Docker-Compose_Ready-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com)
[![Tests](https://img.shields.io/badge/Tests-67_Pytest_%26_18_Vitest_Passing-brightgreen.svg)](#testing--verification)

---

## Executive Overview

**Docusage** is an enterprise-grade contract compliance and legal risk assessment platform designed to audit legal agreements (Commercial MSAs, NDAs, Institutional MoUs, Vendor Contracts) against corporate policies, covenants, and regulatory guidelines.

Combining **LangGraph 1.2+** multi-agent state machines, **Corrective RAG (CRAG)** retrieval grading, open-weights **Hugging Face** LLMs (`Llama-3.3-70B-Instruct`, `Qwen2.5-72B-Instruct`), **PostgreSQL `pgvector`** dense embeddings, structure-aware hierarchical document chunking, sparse BM25 Reciprocal Rank Fusion (RRF), a **Next.js 16** legal reviewer workbench, and a **mathematical Priority-Based RBAC engine**, Docusage automates legal auditing bottlenecks while keeping legal counsel firmly in control via deterministic human-in-the-loop (HITL) breakpoints, verbatim citation verification, and strict document access barriers.

```
                  ┌────────────────────────────────────────┐
                  │       Next.js 16 App Router UI         │
                  │  (Titanium & Zinc Clinical Minimalism) │
                  └──────────────────┬─────────────────────┘
                                     │ REST / Streaming (Bearer JWT)
                                     ▼
                  ┌────────────────────────────────────────┐
                  │            FastAPI Gateway             │
                  │ (Auth, RBAC, Multi-Tenant, Telemetry)  │
                  └──────┬──────────────────────────┬──────┘
                         │                          │
           Tasks Enqueue │            State Machine │ Interrupt / Resume
                         ▼                          ▼
               ┌───────────────────┐      ┌───────────────────────────┐
               │   Celery Worker   │      │     LangGraph Engine      │
               │ (Chunk & Embed)   │      │ (CRAG Grader & Auditor)   │
               └─────────┬─────────┘      └─────────────┬─────────────┘
                         │                              │
                         │              HuggingFace API │ Llama-3.3-70B / Qwen2.5-72B
                         │              Ollama / OpenAI │
                         │                              ▼
                         │                     ┌───────────────────┐
                         │                     │  Model Providers  │
                         │                     │  (CRAG Auditor)   │
                         │                     └─────────┬─────────┘
                         └───────────┬───────────────────┘
                                     ▼
               ┌───────────────────────────────────────────┐
               │         PostgreSQL 15 + pgvector          │
               │ (Contracts, Roles, Grants, Policies, ACL) │
               └───────────────────────────────────────────┘
```

---

## Key Capabilities

- **Multi-Agent Corrective RAG (CRAG)**:
  - **Retrieval Quality Grading**: Grader model classifies chunk context into `CORRECT`, `AMBIGUOUS`, or `INCORRECT` with confidence scoring.
  - **Knowledge Strip & Recompose**: Irrelevant or peripheral noise is filtered out before audit synthesis.
  - **Verbatim Quote Sanitization (`sanitize_citations`)**: Guarantees a **Zero-Hallucination Invariant** by verifying that every cited phrase exists verbatim in the source document.
  - **Explicit Covenant Absence**: If a covenant rule is unmentioned in the document, CRAG flags `MISSING_COVENANT` with 0 fake citations.
  - **Counsel Waiver Synthesis**: Counsel feedback during HITL review can waive or modify deviations (`WAIVED_BY_COUNSEL`) with dynamic risk score recalculation.

- **Checkpointed Human-in-the-Loop (HITL) State Machine**:
  - Implemented with **LangGraph 1.2+** using state checkpoints (`MemorySaver`).
  - Automatically pauses execution before `human_review` whenever contract risk score exceeds threshold ($> 0.3$).
  - Supports iterative refinement loops (`approve`, `reject`, `revise`) up to configurable safety limits (`max_iterations = 3`).

- **Hierarchical Seniority-Based RBAC & Multi-Tenancy**:
  - Roles and members possess numerical priority rankings ($1 - 100$).
  - **Top-Down Visibility**: Senior employees ($P_{\text{user}} \ge P_{\text{creator}}$) automatically see documents created by juniors.
  - **Bottom-Up Restriction**: Junior employees ($P_{\text{user}} < P_{\text{creator}}$) are strictly blocked (HTTP 403 Forbidden) from viewing senior agreements.
  - **Granular Delegation Grants**: Contract creators or partners can issue explicit time-bound access grants (`contract_access_grants`) allowing junior review.
  - **Multi-Tenant Isolation**: Enforces tenant boundaries (`contract.org_id == user.org_id`), blocking cross-organization data leakage.

- **Hybrid Dense pgvector + Sparse BM25 RRF Retrieval**:
  - 768-dimensional dense vector embeddings generated via `sentence-transformers/all-mpnet-base-v2`.
  - Sparse BM25 keyword matching with **2.5x numerical boosting** for exact percentages, financial caps, and jurisdictional clauses.
  - Reciprocal Rank Fusion (RRF with $k=60.0$) merges dense and sparse rankings.
  - Native PostgreSQL cosine distance operator (`<=>`) backed by in-memory NumPy fallback.

- **Multi-Vector Parent-Child Document Hierarchy**:
  - Ingestion parser extracts high-level sections into `parent_documents` (500–1500 tokens).
  - Sub-clauses are indexed into `clauses` (100–300 tokens) with parent document pointers for full contextual retrieval.

- **Enterprise Defense-in-Depth Security**:
  - **Zero Unauthenticated Fallback**: Strict Bearer token validation rejecting unauthenticated calls with HTTP 401.
  - **Centralized Dependency Guards**: `get_current_user`, `require_admin`, `get_accessible_contract_id`, `get_admin_contract_id` eliminate boilerplate and route drift.
  - **SSRF Prevention**: Strict validation on Ollama base URLs blocking cloud metadata endpoints (`169.254.169.254`, `metadata.google.internal`), link-local IPs, and invalid schemes.
  - **ReportLab XML Injection Prevention**: Full `html.escape` sanitation on all dynamic strings prior to PDF certificate compilation.
  - **Prompt Injection Defense**: Human feedback delimited within XML tags (`<counsel_feedback>`) and guarded by system prompt directives.
  - **Celery Path Traversal Containment**: Enforces that ingested file paths resolve strictly inside `data/contracts/`.
  - **File Upload Limits**: Whitelists extensions (`.pdf`, `.docx`, `.txt`) and caps upload sizes at 25MB.
  - **Prometheus Route Normalization**: Endpoints mapped to route templates (`endpoint=route.path` or `"unmatched"`) preventing metric cardinality DoS.
  - **CORS Hardening**: Explicit allowed origins configured via `CORS_ORIGINS` (disallowing `*` with credentials).
  - **Production Secret Validation**: Raises `RuntimeError` on startup in production if `JWT_SECRET` or `SECRET_KEY` is missing.

- **Passwordless Authentication & Token Family Rotation**:
  - One-Time Password (OTP) generation and email delivery powered by **Resend**.
  - Dual tokens: **30-minute Access JWT** and **7-day Refresh JWT**.
  - Token family rotation with automatic invalidation upon reuse (replay attack detection).

- **Multi-Provider AI Model Manager & AES-256 Vault**:
  - Dynamic runtime provider selection: **Hugging Face Serverless Inference**, **Local Ollama**, **OpenAI**, **Anthropic**, and **Google Gemini**.
  - Provider API keys stored encrypted using Fernet (AES-256-CBC) and masked in the UI.

- **Audit Reporting & Export Engine**:
  - Autonomous generation of **Legal Compliance Certificates**.
  - Dual export formats: Machine-readable structured JSON (`GET /contracts/{id}/export?format=json`) and formatted ReportLab PDF (`GET /contracts/{id}/export?format=pdf`).

- **Interactive Next.js 16 Reviewer Workbench**:
  - Titanium & Zinc clinical dark/light themes.
  - Split-screen document viewer with page divider badges (`Document Page X`), section headers, deep-linked quotation highlights, and real-time LangGraph state diagrams.
  - Floating **Decision Dock** for quick counsel arbitration (`Approve`, `Reject`, `Request Revision`).
  - Access Delegation modal and Role Management matrix.

---

## System Topology

```
docusage/
├── backend/                       # Python 3.12 FastAPI & LangGraph AI Service
│   ├── Dockerfile                 # Python 3.12 slim container build
│   ├── pytest.ini                 # Pytest runner configuration
│   ├── requirements.txt           # Backend Python dependencies
│   ├── src/backend/
│   │   ├── agents/
│   │   │   ├── analyzer.py        # LangGraph StateGraph, HITL engine, nodes
│   │   │   └── retriever.py       # Clause vector retrieval interface
│   │   ├── app/
│   │   │   ├── main.py            # FastAPI entry point, lifespan, CORS, metrics
│   │   │   ├── config.py          # Pydantic BaseSettings environment config
│   │   │   ├── routes/            # auth, admin, contracts, policies, settings, metrics
│   │   │   ├── services/          # auth, rbac, crag, contracts, policies, export, provider_manager
│   │   │   ├── models/            # Pydantic request/response schemas
│   │   │   └── utils/             # jwt, security (AES-256), db, logging, metrics, tracking
│   │   └── worker/
│   │       ├── celery_app.py      # Celery broker & result backend initialization
│   │       └── tasks.py           # Ingestion tasks (chunking, embeddings, path checks)
│   └── tests/                     # 67 Pytest test suites (unit, property, CRAG, SSRF, RBAC)
│
├── frontend/                      # Next.js 16 (App Router) TypeScript Client
│   ├── Dockerfile                 # Production Next.js multi-stage container
│   ├── package.json               # Next.js 16, React 19, Tailwind, Vitest
│   ├── tailwind.config.ts         # Titanium & Zinc theme design tokens
│   ├── src/
│   │   ├── app/                   # App Router pages (/login, /contracts, /policies, /admin/roles, /evals)
│   │   ├── components/            # Reviewer, DecisionDock, AccessGrantModal, SettingsModal
│   │   ├── lib/                   # Typed API client (api.ts) & helpers
│   │   └── types/                 # TypeScript data contracts
│   └── tests/                     # 18 Vitest unit tests & workflows
│
├── scripts/
│   ├── setup_db.sql               # PostgreSQL pgvector schema, roles, members, grants, seed
│   └── migrate_to_multi_vector.py # Multi-vector parent-child migration script
├── data/
│   └── contracts/                 # Secure document storage
├── docker-compose.yml             # Complete containerized multi-service stack
├── requirements.txt               # Root dependencies specification
├── ARCHITECTURE.md                # Comprehensive technical specification
└── README.md                      # Primary project documentation
```

---

## Quickstart: Running Locally

### Option A: Complete Stack via Docker Compose (Recommended)

Start all services (Frontend UI, Backend API, Celery Worker, PostgreSQL with `pgvector`, and Redis) with a single command:

```bash
docker compose up --build -d
```

Verify service health:
```bash
docker compose ps
```

| Service | Endpoint | Description |
|---|---|---|
| **Frontend UI** | [http://localhost:3000](http://localhost:3000) | Next.js Legal Reviewer & Dashboard |
| **Backend API Gateway** | [http://localhost:8000](http://localhost:8000) | FastAPI Core API Service |
| **API Documentation** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive Swagger / OpenAPI UI |
| **Prometheus Metrics** | [http://localhost:8000/metrics](http://localhost:8000/metrics) | Prometheus Scraping Endpoint |
| **PostgreSQL Database** | `localhost:5432` | PostgreSQL 15 + `pgvector` (`docusage`) |
| **Redis Broker** | `localhost:6379` | Celery message broker & result backend |

To stop the stack:
```bash
docker compose down
```

---

### Option B: Local Native Development

#### 1. Infrastructure Services (PostgreSQL & Redis)
Ensure Docker is running to host the database and message broker:
```bash
docker compose up postgres redis -d
```

Initialize the database schema:
```bash
psql -h localhost -U docusage -d docusage -f scripts/setup_db.sql
```

#### 2. Backend API & Celery Worker
Requires **Python 3.12+** and `uv`:

```bash
# Create virtual environment and install dependencies
uv pip install -r requirements.txt

# Terminal 1: Launch FastAPI Backend Gateway
uvicorn src.backend.app.main:app --reload --port 8000 --app-dir backend

# Terminal 2: Launch Celery Background Worker
celery -A src.backend.worker.celery_app worker --workdir backend --loglevel=info
```

#### 3. Frontend Next.js Application
Requires **Node.js 20+** and `npm`:

```bash
# Terminal 3: Launch Next.js App
cd frontend
npm install
npm run dev
```

Access the interface at [http://localhost:3000](http://localhost:3000).

---

## Configuration & Environment Variables

Copy `.env.example` to `.env` and configure your environment:

```bash
cp .env.example .env
```

| Variable | Default Value | Description |
|---|---|---|
| `POSTGRES_USER` | `docusage` | PostgreSQL database user |
| `POSTGRES_PASSWORD` | `yourpassword` | PostgreSQL database password |
| `POSTGRES_DB` | `docusage` | PostgreSQL database name |
| `DB_HOST` | `localhost` (`postgres` in docker) | Database host address |
| `DB_PORT` | `5432` | Database port |
| `REDIS_HOST` | `localhost` (`redis` in docker) | Redis host address |
| `REDIS_PORT` | `6379` | Redis port |
| `HF_TOKEN` | `your_hf_token` | Hugging Face user access token for CRAG models |
| `CELERY_BROKER_URL` | `redis://localhost:6379/0` | Celery broker connection string |
| `CELERY_RESULT_BACKEND` | `redis://localhost:6379/0` | Celery result backend connection string |
| `EMBEDDING_MODEL_NAME` | `sentence-transformers/all-mpnet-base-v2` | SentenceTransformers model for dense embeddings |
| `RESEND_API_KEY` | `your_resend_api_key` | Resend API key for passwordless email OTP |
| `RESEND_FROM_EMAIL` | `Docusage Security <onboarding@resend.dev>` | Email sender identity |
| `DOCUSAGE_ENV` | `development` | Environment mode (`development` or `production`) |
| `SECRET_KEY` | `dev-master-encryption-key-32bytes-secret!` | AES-256 master key for Vault storage |
| `JWT_SECRET` | `dev-secure-jwt-secret-key-2026-production!` | Secret signing key for Access and Refresh JWTs |
| `ENABLE_DEV_OTP` | `true` | Exposes `dev_otp` in response (disabled in production) |
| `CORS_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Comma-separated list of allowed CORS origins |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Default local Ollama server address |

---

## Complete API Reference

All requests modifying or accessing documents, policies, and settings require an `Authorization: Bearer <access_token>` header unless explicitly noted.

### 1. Authentication (`/auth`)
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `POST` | `/auth/otp/request` | No | Dispatches a 6-digit OTP to user's email via Resend |
| `POST` | `/auth/otp/verify` | No | Validates OTP and issues 30-min Access Token & 7-day Refresh Token |
| `POST` | `/auth/refresh` | No | Exchanges refresh token for new token pair with family rotation |
| `GET` | `/auth/me` | Yes (User) | Returns current user profile, organization role, and seniority priority |

### 2. Organization Administration & RBAC (`/admin`)
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/admin/org/roles` | Yes (Admin) | Lists organization roles and numerical priority rankings ($1-100$) |
| `PUT` | `/admin/org/roles/{role_id}` | Yes (Admin) | Updates role seniority priority ranking or description |
| `GET` | `/admin/org/members` | Yes (Admin) | Lists employees with effective seniority and overrides |
| `PUT` | `/admin/org/members/{user_id}` | Yes (Admin) | Reassigns employee role or custom priority override |
| `GET` | `/admin/contracts/{contract_id}/grants` | Yes (View Access) | Lists active access delegation grants for a contract |
| `POST` | `/admin/contracts/{contract_id}/grants` | Yes (Admin) | Grants explicit contract access to a junior employee |
| `DELETE` | `/admin/contracts/{contract_id}/grants/{user_id}` | Yes (Admin) | Revokes explicit contract access from an employee |

### 3. Contract Governance & Ingestion (`/contracts`)
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `POST` | `/contracts/upload` | Yes (User) | Multipart upload (`.pdf`, `.docx`, `.txt`) with 25MB validation and Celery dispatch |
| `GET` | `/contracts/` | Yes (User) | Lists contracts accessible to caller based on seniority priority and tenant |
| `GET` | `/contracts/{contract_id}` | Yes (View Access) | Returns contract metadata (enforces 403 Forbidden for unauthorized juniors) |
| `DELETE` | `/contracts/{contract_id}` | Yes (Admin Access) | Deletes contract, parent sections, and extracted clauses |
| `GET` | `/contracts/{contract_id}/evals` | Yes (View Access) | Retrieves compliance and risk evaluation history |
| `GET` | `/contracts/{contract_id}/clauses` | Yes (View Access) | Fetches extracted document clauses with page dividers and section headers |
| `GET` | `/contracts/tasks/{task_id}` | Yes (User) | Polls Celery background ingestion task status |
| `POST` | `/contracts/{contract_id}/graph/start/{policy_id}` | Yes (View Access) | Triggers LangGraph multi-agent review state machine |
| `GET` | `/contracts/graph/{thread_id}` | Yes (User) | Fetches live LangGraph thread checkpoint and next executable nodes |
| `POST` | `/contracts/graph/{thread_id}/review` | Yes (User) | Submits human decision (`approve`, `reject`, `revise`) with qualitative feedback |
| `POST` | `/contracts/{contract_id}/analyze/{policy_id}` | Yes (View Access) | Synchronous contract audit execution |
| `GET` | `/contracts/{contract_id}/export` | Yes (View Access) | Exports compliance certificate in `json` or ReportLab `pdf` format |

### 4. Policy Management (`/policies`)
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `POST` | `/policies/` | Yes (Admin) | Creates new compliance policy with rule covenants and thresholds |
| `GET` | `/policies/` | Yes (User) | Lists all available compliance policies |
| `GET` | `/policies/{policy_id}` | Yes (User) | Retrieves policy details and covenant definitions |
| `DELETE` | `/policies/{policy_id}` | Yes (Admin) | Deletes a compliance policy |

### 5. AI Model Settings & Vault (`/settings`)
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/settings/providers` | Yes (User) | Lists supported LLM and embedding model providers |
| `GET` | `/settings/ollama/models` | Yes (Admin) | Discovers active Ollama models (with SSRF protection; query param `url`) |
| `GET` | `/settings/` | Yes (User) | Returns active provider configuration and masked API key |
| `POST` | `/settings/` | Yes (Admin) | Stores provider configuration with AES-256 key encryption |

### 6. System & Observability
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/health` | No | System health check and service status |
| `GET` | `/` | No | API root information and link to documentation |
| `GET` | `/metrics` | No | Prometheus telemetry metrics exposition |

---

## Testing & Verification

The codebase maintains comprehensive test suites covering unit logic, property-based invariants, security guards, and frontend workflows:

```bash
# 1. Run all backend test suites (67 tests)
.venv/bin/python -m pytest backend/tests/ -v

# 2. Run property-based invariant suites (Hypothesis)
.venv/bin/python -m pytest backend/tests/test_properties.py backend/tests/test_rbac_properties.py -v

# 3. Run security & settings test suite (SSRF, AES-256, Auth guards)
.venv/bin/python -m pytest backend/tests/test_security_and_settings.py -v

# 4. Run export resilience suite (ReportLab XML injection)
.venv/bin/python -m pytest backend/tests/test_export.py -v

# 5. Run frontend Vitest test suites (18 tests)
cd frontend && npm test -- --run

# 6. Run Next.js production build verification
cd frontend && npm run build
```

---

## License

Distributed under the MIT License. See `LICENSE` for details.
