# Changelog

All notable changes to the Docusage project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to Semantic Versioning.

> **Maintenance Protocol:** Every commit or significant code change MUST update this file with the commit date and time (including timezone), along with categorized descriptions under `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, or `Security`. The `README.md` and `ARCHITECTURE.md` must also be kept synchronized.

---

## [Unreleased] - 2026-09-22 00:46:00 UTC+05:30

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
