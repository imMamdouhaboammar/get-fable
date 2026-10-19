# ADR 0009: Get-Fable Commercial Suite Boundary, Daily-First Prioritization, and BYOA/BYOLLM Model

## Status
Accepted

## Decision Owner
Mamdouh Aboammar / Fable Engineering Team

## Date
2026-10-15

## Context
`get-fable` is an open-source (GNU AGPLv3) agent lifecycle harness featuring 42 canonical skills, 32 supported host environments, deterministic state machines, and evidence-gated verification.
To commercialize `get-fable` as an enterprise-grade Software Factory while maintaining the integrity and trust of the open-source community, we require an architectural contract separating commercial operational capabilities from the core harness.

Commercialization introduces two primary demands:
1. Daily team operations: GitHub App integration, organization-level policy enforcement, immutable check runs, and bounded MCP tools.
2. Enterprise autonomous reliability: Sentry error ingestion, test-driven reproduction, and automated draft pull requests.

## Decisions

### 1. Daily-First Delivery Sequence (ADR-P01)
We prioritize Fable Daily (Milestones D0 through D7) before implementing Enterprise remote execution workers. Daily delivers immediate commercial value to engineering teams through GitHub check runs, team policy enforcement, and permission-scoped MCP tools without requiring hosted execution sandboxes or LLM token margins.

### 2. Commercial Workspace Isolation (ADR-P02, AC-021)
Commercial code lives outside open-source distribution pathways. The commercial codebase resides in an isolated workspace (`commercial/`) and is strictly excluded from `.fable-public-manifest.json`, the public export cut pipeline (`scripts/export-public-cut.ts`), and public Git hooks. Open-source core remains fully functional and independently maintainable.

### 3. Architecture: Unified Control Plane with PostgreSQL Outbox (ADR-P03)
The Daily control plane is built with Bun TypeScript, exposing authenticated HTTP and MCP endpoints. PostgreSQL serves as the relational database and transactional outbox for webhook event deduplication and job dispatching. We avoid premature distributed brokers until measured scale requires it.

### 4. Bring Your Own Agent (BYOA) and Bring Your Own LLM (BYOLLM) (ADR-P04, ADR-P09)
Enterprise automation does not host a multi-tenant remote code-execution cloud. Customers run workers on their own infrastructure (self-hosted runners or customer cloud VPCs) using their own model credentials. Pi is adopted as the primary reference adapter via a subprocess RPC contract, followed by generic CLI adapters.

### 5. Least-Privilege GitHub App Integration (ADR-P05)
The GitHub App requests minimal baseline permissions (Contents read, Checks write, Pull requests read). Workflow dispatching is restricted to allowlisted existing customer Actions workflows with strict input schema validation.

### 6. Authority of Native Fable Evidence (ADR-P06)
Native Fable state (`.fable/state.json`) and mutation generations remain the single source of truth for repository verification. Commercial check runs evaluate freshness directly against the head commit SHA. No synthetic or forged evidence records are permitted.

### 7. Human-in-the-Loop Merge Authorization (ADR-P10)
All privileged repository modifications pass through human approval gates. The Sentry-to-PR pipeline generates draft pull requests with attached test reproduction proofs. Automated production deployments and force-merges are prohibited by default.

## Consequences
- Open-source core remains clean, lightweight, and legally distinct.
- Accidental leakage of commercial code is prevented by automated anti-leak tests.
- Unit economics are protected against variable LLM inference costs.
- Enterprise customers retain complete custody over source code, production logs, and API credentials.
