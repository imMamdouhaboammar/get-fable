---
name: fable-redteam
description: "Execute native agentic ethical penetration testing and automated security audits against staging or authorized application targets. Discovers API logic flaws, BOLA/IDOR vulnerabilities, missing authentication, sensitive file exposures, and security misconfigurations within bounded scope. Produces verified security findings with reproduction PoCs and automatic Fable remediation work cards."
version: 1.0.0
pack: proof
inputs:
  - target_url
  - scan_profile
requires:
  - target_in_scope
produces:
  - redteam_findings
  - remediation_cards
gates:
  - scope_verified
  - non_destructive_mode
fallback: fable-security
mutatesWorkspace: false
parallelSafe: true
neural_links:
  precursors:
    - fable-security
    - fable-verify
  continuations:
    - fable-plan
    - fable-tdd
  lateral_peers:
    - fable-security
    - fable-review
  recovery: fable-recover
---

# Fable RedTeam

Execute safe, bounded, agentic ethical penetration testing and active vulnerability discovery.

## Purpose
Provide an automated, reproducible offensive security audit engine to prove whether application defenses withstand real-world attack vectors. `fable-redteam` verifies API authentication, authorization boundaries, object isolation, and sensitive exposures in authorized staging/local environments, producing immediate remediation cards for implementation.

## When to Use
- Active security testing is needed for local, staging, or authorized test targets.
- Verifying whether API endpoints enforce authentication and authorization (BOLA/IDOR).
- Testing for CORS misconfigurations, missing security headers, or leaked `.env` files.
- Simulating attacker-controlled requests against staging endpoints before release.
- Validating whether a previously applied security patch truly eliminates the vulnerability.

## When NOT to Use
- Pure static code review or threat modeling without live target endpoints (use `fable-security`).
- Functional test runs or assertion checking without security probing (use `fable-verify`).
- Unauthorized public targets outside the explicitly configured scope.
- Stress testing or denial-of-service simulations (strictly out of scope).

## Inputs
- `target`: Target HTTP/HTTPS URL.
- `profile`: Scan depth (`passive`, `api-logic`, `comprehensive`).
- `scopeConfig`: Optional custom scope JSON (defaults to `.fable/redteam.json` or local safe defaults).
- `authToken`: Optional Bearer token for authenticated API probes.

## Expected Outputs
- `redteam_findings`: Array of validated vulnerability findings with CWE IDs, descriptions, and reproduction curl commands.
- `docs/security/REDTEAM_REPORT.md`: Comprehensive Markdown audit report.
- `remediation_cards`: Actionable Fable work cards ready for `.fable/LEDGER.md`.

## Procedure
1. **Scope Preflight:** Verify the target URL against allowed host patterns, ports, and excluded paths. Fail closed immediately if target is out of scope.
2. **Reconnaissance & Passive Probing:** Inspect security headers, CORS origin reflections with credentials, and sensitive file exposures (`.env`, `.git/HEAD`).
3. **API Logic & Auth Boundary Testing:** When `authToken` is provided, test endpoint behavior under token absence, token tampering, and privilege transitions.
4. **Evidence Synthesis:** For each detected vulnerability, capture status codes, response headers, and generate a reproducible `curl` command.
5. **Work Card Generation:** Convert validated findings into structured remediation cards for `$fable-plan` and `$fable-tdd`.

## Decision Rules
- If a target host does not match `allowedHosts` or loopback defaults, refuse execution immediately without network calls.
- If `safe-mode` is active, never execute database-dropping SQL payloads or unbounded fuzz loops.
- If a critical exposure (e.g. leaked `.env`) is discovered, flag with CRITICAL severity and prioritize immediate reverse-proxy blocking.
- When all findings are resolved, transition to `fable-verify` or `fable-release`.

## Tool Policy
- Use native TS HTTP probe (`src/core/redteam/probe.ts`) for zero-dependency execution across any host.
- Optional external tools (Nuclei, Nmap, FFuf) may be invoked via the tool adapter when installed.
- Never write credentials or sensitive data into git-tracked files or public logs.

## Evidence Requirements
- Findings must include the exact target URL, HTTP status code, and reproducible `curl` commands.
- Repaired vulnerabilities require a negative re-scan proving the attack vector now returns 401/403/404.

## Failure Handling
- On network connection errors or target timeouts, record the failure as an unresolved endpoint rather than a false negative.
- If rate limits are encountered, throttle request frequency or pause execution.

## Completion Criteria
- Complete execution of the selected scan profile.
- Generated Markdown report at `docs/security/REDTEAM_REPORT.md`.
- Remediation work cards formatted for `.fable/LEDGER.md`.
