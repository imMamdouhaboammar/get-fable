# Solution: Fable RedTeam Unified Agentic Orchestrator (Production-Grade)

## Overview

We upgraded `fable-redteam` from a prototype security prober into an enterprise-ready, production-grade automated ethical penetration testing and red teaming platform. It unifies 6 offensive security systems with a deep native TypeScript discovery, multi-vector probing, execution envelope throttling, OASIS SARIF v2.1.0 reporting, and closed-loop verification engine.

---

## Production-Grade Capabilities

1. **Automated Surface Discovery & Route Crawler (`src/core/redteam/crawler.ts`):**
   - Discovers application surface by crawling target HTML (extracting `<a href>`, `<form action>`, inline fetch/axios endpoints).
   - Ingests and parses live OpenAPI/Swagger schemas (`/openapi.json`, `/swagger.json`, `/api-docs`, `/v3/api-docs`).
   - Probes `/robots.txt` and common API entrypoints within strict scope boundaries.

2. **Multi-Vector Active Vulnerability Discovery (`src/core/redteam/probe.ts`):**
   - **Active Dual-Token BOLA/IDOR Testing:** Automatically tests parameterized routes (`/documents/:id`, `/users/:id`, `/orders/:id`) using primary (`--token`) and secondary (`--second-token`) auth tokens. Proves broken object-level authorization (CWE-639) when User B accesses User A's object without 403 Forbidden.
   - **Non-Destructive SQL Injection Boundary Probing:** Tests boundary reflection (`'`, `' OR '1'='1`, `1 AND 1=1`) and verifies database syntax error signatures across PostgreSQL, MySQL/MariaDB, SQLite, Oracle, and MSSQL without modifying persistent data.
   - **Server-Side Request Forgery (SSRF):** Tests URL parameters (`url`, `dest`, `target`, `redirect`, `callback`, `webhook`, `feed`) against safe metadata/loopback probes (`http://169.254.169.254`, `http://127.0.0.1:22`).
   - **JWT & Session Integrity Testing:** Tests `alg: "none"` signature bypass, validates expiration (`exp`) presence, flags unencrypted sensitive payload claims, and detects unprotected state-mutating endpoints.
   - **CORS Misconfiguration & Open Redirect:** Probes arbitrary origin reflection with credentials and unvalidated HTTP 301/302 redirects.
   - **Expanded Sensitive Files & Headers:** Checks `.env`, `.git/HEAD`, `docker-compose.yml`, AWS credentials, CSP, XFO, XCTO, HSTS, and server banner leaks.

3. **Tactical Reasoning Playbooks (`src/core/redteam/playbooks/runner.ts`):**
   - Directly executes `CLAUDE_RED_PLAYBOOKS` (`api-logic`, `injection`, `llm-security`, `auth-session`) during comprehensive scans or targeted `--playbook <id>` runs.
   - Non-destructive prompt injection testing for LLM/AI endpoints (`/api/chat`, `/api/agent`).

4. **Production Execution Envelope & Rate-Limiting Client (`src/core/redteam/envelope.ts`):**
   - `EnvelopeHttpClient` implements token bucket rate limiting (`--rate-limit <rps>`, default 25), concurrency pooling (`--concurrency <n>`, default 6), and streaming response cap (`maxResponseBytes`, default 1MB) with abort signal to prevent scanner memory exhaustion.
   - Exponential backoff on HTTP 429 (Too Many Requests) and automatic retries on transient network drops.

5. **Closed-Loop Verification & Replay Engine (`src/core/redteam/verify.ts`):**
   - `get-fable redteam verify`: Re-tests previously reported findings against the target URL to verify that security patches actually closed vulnerabilities.
   - Distinguishes `verified-fixed` from persistent `regression-failed` items.
   - Generates executable Bun test suites (`test/security/redteam-regression.test.ts`) so CI (`bun test`) automatically protects against security regressions.

6. **Enterprise OASIS SARIF v2.1.0 Reporting (`src/core/redteam/sarif.ts`):**
   - Outputs full OASIS SARIF v2.1.0 format (`--format sarif` or `--sarif`), enabling native ingestion into GitHub Advanced Security Code Scanning, GitLab Security Dashboard, and SonarQube.
   - Supports custom report persistence via `--output <path>`.

---

## Safety & Governance Invariants

- **Colima Prohibition:** Explicit detection of Colima sockets, binary paths, or active processes in `get-fable redteam setup`. Aborts immediately with a policy notice if Colima is detected, enforcing workspace container rules (Docker Desktop, OrbStack, Podman).
- **Fail-Closed Scope Governor:** All probes and scans strictly require target origin authorization in `.fable/redteam.json`.
- **Non-Destructive Safe-Mode:** By default, all operations enforce `safeMode: true` with strict rate limiting, zero data destruction (`DROP`, `DELETE`), and non-disruptive payloads.
- **Closed-Loop Remediation:** High and critical severity findings can be immediately converted into `.fable/LEDGER.md` work cards via `get-fable redteam fix`, enabling automated TDD remediation.

---

## Verification & Quality Gates

- **Unit & Integration Tests:** 71 tests across 16 RedTeam test suites:
  - `redteam-crawler.test.ts`
  - `redteam-playbook-runner.test.ts`
  - `redteam-sarif.test.ts`
  - `redteam-verify.test.ts`
  - `redteam-lab-orchestration.test.ts`
  - `redteam-live-functional.test.ts`
  - `redteam-probe.test.ts`
  - `redteam-cli.test.ts`
  - `redteam-envelope.test.ts`
  - `redteam-correlation.test.ts`
  - `redteam-orchestration.test.ts`
  - `redteam-remediation.test.ts`
  - `redteam-reporter.test.ts`
  - `redteam-scope.test.ts`
  - `redteam-setup.test.ts`
  - `redteam-adapters.test.ts`
- **Repository Gates:**
  - `bun run typecheck` (0 errors)
  - `bun test test/redteam*.test.ts` (71 pass, 0 fail)
  - `bun run build` (Clean host & client bundle)
  - `bun run check:generated` && `bun run check:llms` (Clean)
  - `get-fable doctor --json` (`ok: true`, 0 errors)
