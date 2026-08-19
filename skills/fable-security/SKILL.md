---
name: fable-security
description: Route security-sensitive work to threat modeling, diff review, repository audit, or finding validation. Use for auth, secrets, untrusted inputs, permissions, or vulnerability analysis.
version: 1.2.0
pack: proof
inputs:
  - security_scope
requires:
  - threat_boundary
produces:
  - security_evidence
  - threat_boundary_verdict
gates:
  - threat_surface_checked
  - no_exposed_secrets
fallback: fable-plan
mutatesWorkspace: false
parallelSafe: true
neural_links:
  precursors:
    - fable-verify
    - fable-review
  continuations:
    - fable-release
  lateral_peers:
    - fable-review
  recovery: fable-recover
---

# fable-security

Threat modeling, vulnerability assessment, and secret hygiene engine.

## Purpose
Protect trust boundaries, audit security-critical code paths, and prevent secret exposure across the repository.

## When to Use
- Implementing authentication, authorization, or token validation logic.
- Handling untrusted user inputs, file uploads, or external webhooks.
- Performing repository-wide credential scans and vulnerability audits.

## When NOT to Use
- Running functional application unit tests (use `fable-verify`).
- General non-security code refactoring (use `fable-simplify`).

## Inputs
- **`security_scope`**: Target subsystem, endpoint, or diff to audit.

## Expected Outputs
- **`security_evidence`**: Threat model analysis and sanitization report.
- **`threat_boundary_verdict`**: Pass/fail security attestation.

## Procedure
1. Map trust boundaries, privileged operations, and data flows.
2. Audit inputs for injection, path traversal, and authorization bypass.
3. Verify that zero private keys, tokens, or credentials are hardcoded.
4. Record typed `security` evidence in `.fable/state.json`.

## Decision Rules
- Never output raw secret keys or tokens in terminal logs or documentation.
- Security approval does not prove functional correctness.

## Tool Policy
- Use static analysis and grep search; do not execute unsafe payloads.

## Evidence Requirements
- Zero high/critical vulnerabilities and clean secret scan report.

## Failure Handling
- If a vulnerability is found, create an immediate bounded fix card for `fable-execute`.

## Completion Criteria
- Threat boundaries are verified and all security gates are satisfied.

## Progressive Resources
- Matrix: `references/threat-modeling-matrix.md`
- Sanitization: `references/secret-sanitization.md`
- Example: `examples/security-audit-walkthrough.md`
