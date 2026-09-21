# Changelog

All notable changes to the Docusage project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to Semantic Versioning.

> **Maintenance Protocol:** Every commit or significant code change MUST update this file with the commit date and time (including timezone), along with categorized descriptions under `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, or `Security`. The `README.md` and `ARCHITECTURE.md` must also be kept synchronized.

---

## [Unreleased] - 2026-09-22 01:26:00 UTC+05:30

### Added
- **BuildKit Acceleration & Cache Mounts**:
  - `backend/Dockerfile`: Integrated official standalone `uv` binary (`ghcr.io/astral-sh/uv:latest`) and `--mount=type=cache,target=/root/.cache/uv` for host-persisted wheel cache, dropping Python package installation time from 3 minutes to ~12 seconds.
  - `frontend/Dockerfile`: Integrated `--mount=type=cache,target=/root/.npm` for package downloads and `--mount=type=cache,target=/app/.next/cache` for Next.js Turbopack compiler cache.
- **Next.js Standalone Runtime Mode**:
  - Added `frontend/next.config.mjs` with `output: "standalone"`, tracing minimal dependencies for deployment.
  - 3-stage multi-stage frontend build (`deps` -> `builder` -> `runner`) with minimal Node Alpine runner image (~120MB vs ~850MB previously).
- **Multi-Stage Backend Container**:
  - Two-stage build isolating `uv venv /opt/venv` in a builder stage and running from a clean `python:3.12-slim` runner stage.
- **Root and Subsystem `.dockerignore` Specifications**:
  - Added root `.dockerignore` and expanded `backend/.dockerignore` and `frontend/.dockerignore` to prevent test suites, caches, and uploaded contract files from streaming across the Docker daemon build context.

### Changed
- **Docker Compose Build Deduplication**:
  - Tagged `backend` and `celery` with shared `image: docusage-backend:latest`, eliminating redundant duplicate image builds for the shared Python codebase.
  - Tagged `frontend` with `image: docusage-frontend:latest`.
- **Container Startup Latency Tuning**:
  - Reduced `backend` healthcheck interval to 5s, timeout to 3s, retries to 3, and start_period to 5s.
  - Reduced `postgres` and `redis` healthcheck intervals to 3s.
  - Configured `frontend.depends_on: { backend: { condition: service_healthy } }` to eliminate cold start HTTP race conditions.

---

## [0.3.0] - 2026-09-22 01:20:00 UTC+05:30

### Added
- **Passwordless Sign-In & Sign-Up Flows (`/login`, `/signup`)**:
  - Reusable, dual-mode `AuthForm` component providing seamless toggle between Sign In and Create Account modes.
  - Dedicated routes `/login` and `/signup` with custom preselected modes, email validation, and 6-digit verification code entry.
  - Quick Persona Selector for development and demo clearance testing (Partner, Senior Counsel, Associate, Junior Analyst).
- **Secure Global Logout Flow (`/logout`)**:
  - Dedicated `/logout` page providing clear confirmation and countdown redirect back to `/login`.
  - Full session revocation with API endpoint `POST /auth/logout` that invalidates active refresh tokens on the backend.
  - Global `Navbar` logout trigger with user dropdown menu and drawer integration that flushes client state and cached session credentials.
- **Executive Legal User Profile Workspace (`/profile`)**:
  - Comprehensive 4-tab executive profile management suite:
    - **Identity & Credentials**: Manage full name, legal executive title, department, contact telephone, and biography.
    - **Jurisdictions & Clearance**: View primary tenant organization, assigned seniority rank ($P1 \dots P100$), administrative clearance badge, and multi-jurisdiction practice tags (US Federal, DE Delaware, NY New York, CA California, UK England & Wales, EU Transatlantic).
    - **Audit & Review Preferences**: Custom toggles for auto-expanding severe covenant deviations, strict verbatim quote verification, high-risk email alerts, and default AI model provider.
    - **Active Device Sessions**: Inspect active sessions with IP addresses, browser agents, login timestamps, and revoke individual sessions or trigger global logout.
- **Backend Authentication & Profile APIs**:
  - `GET /auth/profile`: Retrieve rich user profile with organization details, seniority rank, jurisdictions, and preferences.
  - `PUT /auth/profile`: Update user profile metadata, contact info, jurisdictions, and audit preferences.
  - `POST /auth/logout`: Revoke active refresh token session.
  - `GET /auth/sessions`: List active login sessions and device metadata.
  - `POST /auth/sessions/revoke`: Revoke a specific session by token family.
  - `POST /auth/sessions/revoke-all`: Revoke all active sessions for the authenticated user.
- **Automated Database Schema Migration (`ensure_profile_schema`)**:
  - Added profile columns to `users` table: `title`, `department`, `phone`, `bio`, `jurisdictions` (TEXT[]), `timezone`, and `preferences` (JSONB).
  - Updated `scripts/setup_db.sql` with default columns and executive seed profile data.
- **Stitch MCP UI Prototype Screens**:
  - Screen `5ce739b3` in project `7626343136948846304`: Dual-Mode Authentication Portal.
  - Screen `c88df3c2` in project `7626343136948846304`: Legal Executive Profile Workspace.

### Changed
- **Navbar User Account Experience**: Added interactive executive avatar dropdown menu displaying current user, role badge, seniority rank ($P1 \dots P100$), direct links to Profile, Settings, and immediate Log Out.
- **Next.js Vitest Test Setup**: Added standardized App Router mocks (`useRouter`, `usePathname`, `useSearchParams`) in `tests/setup.ts` to ensure clean testing across all component suites.

### Fixed
- Fixed Vitest router invariant error in `Navbar.tsx` by providing default navigation mocks and safe router handling.
- Fixed `test_crag_pipeline.py` to isolate HuggingFace fallback grading from Jev System 1 fast path.
- Verified all 72 Pytest tests passing and 3 skipped cleanly with `uv`.
- Verified all 23 Vitest frontend unit tests passing across all 7 test files.
- Verified all 13 Next.js routes compile and build in under 1 second.

---

## [0.2.0] - 2026-09-22 00:46:00 UTC+05:30

### Added
- **Bright Mode & Dark Mode Theming**: Full dual-theme architecture powered by CSS custom properties and Stitch design tokens (`Academic Precision` / `IEEE SANKALP` light palette and `Titanium and Zinc` dark palette).
- **Anti-FOUC Theme Initialization**: Zero-flash inline script in `src/app/layout.tsx` that reads user preference from `localStorage` or `prefers-color-scheme` before first paint.
- **Theme Provider & Switcher**: Responsive `ThemeProvider` context and animated `ThemeToggle` (Sun/Moon) component with touch targets $\ge 44\text{px}$.
- **Multi-Device Responsiveness**:
  - Sliding navigation drawer for mobile viewports (`< 768px`) with touch-friendly tap targets and backdrop dismiss.
  - Adaptive 2-segment tab switcher (`Clauses` $\leftrightarrow$ `Findings`) in the legal reviewer for mobile and tablet viewports.
  - Mobile bottom-sheet Decision Dock optimized for thumb-reach ergonomics.
  - Mobile safe-area viewport configuration (`viewport-fit=cover`).
  - Single-DOM responsive table in `ContractTable` with smooth horizontal touch-scrolling.
- **Dedicated Page Separation of Concerns**:
  - `/contracts`: Dedicated searchable, filterable document hub with lifecycle status tabs (`All`, `Pending Review`, `Compliant`, `Archived`).
  - `/policies/new`: Dedicated full-page policy and covenant rule builder, decoupling policy management from rule creation.
  - `/settings`: Dedicated full-page system and AI model provider configuration workspace.
- **Documentation & Changelog Maintenance Protocol**: Institutional requirement in `README.md`, `ARCHITECTURE.md`, and `CHANGELOG.md` requiring synchronized updates on every commit.

### Changed
- **Decluttered Executive Dashboard (`/`)**: Replaced duplicate full contract table with an executive cockpit featuring responsive KPI scorecards (`StatsBar`), an urgent Action Required Queue, a recent activity stream, and a quick ingestion dropzone.
- **Streamlined Legal Reviewer (`/contracts/[id]`)**: Consolidated export actions (PDF, JSON) into a clean dropdown menu and refined policy selector.
- **Cleaned Analytics & Evals (`/evals`)**: Replaced raw database text with clean KPI summary tiles and a searchable contract selector.
- **Simplified Seniority Governance (`/admin/roles`)**: Replaced mathematical formula paragraphs with a clean visual Seniority Ladder and responsive member assignment table.
- **Modernized Settings Modals & Drawers (`SettingsModal`, `AccessGrantModal`, `UploadModal`)**: Updated all modal overlays with semantic theme tokens and accessible focus states.
- **Modern Scrollbars**: Replaced non-standard WebKit scrollbars with standard `scrollbar-width: thin; scrollbar-color: ...` and progressive enhancement fallback.

### Removed
- Removed engineering clutter and buzzwords ("pgvector embeddings", "HUGGINGFACE CRAG • ZERO HALLUCINATIONS", "Table: evals (PostgreSQL)", "Mathematical Guarantee") from all user-facing screens.
- Removed duplicate `ContractTable` from the root Dashboard page.
- Removed hardcoded dark background hex colors (`#09090b`, `#121214`, `#18181b`, `#27272a`) in favor of semantic CSS theme tokens.

### Fixed
- Fixed missing mobile navigation where navigation links were hidden on screens `< 768px` without a fallback menu.
- Fixed layout squishing and horizontal overflow on tablet and mobile viewports.
- Fixed TypeScript property mismatches in `AccessGrantModal` (`m.email`, `g.granted_at`).
- Fixed testing library DOM collisions by eliminating duplicate mobile/desktop elements in `ContractTable`.
- Verified 18/18 Vitest unit tests passing across all 6 suites.
- Verified 10/10 Next.js routes statically generated and compiled via Turbopack in 499ms.
