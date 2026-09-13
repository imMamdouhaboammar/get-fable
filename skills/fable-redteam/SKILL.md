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

## Mission
Active offensive testing proves whether defensive architecture holds against real-world attack vectors. `fable-redteam` enables any AI agent to probe applications within strictly authorized scopes (local/staging), verify business logic and authentication boundaries, and immediately generate remediation cards for `$fable-plan` and `$fable-tdd`.

## Safety Invariant
All penetration scans MUST be explicitly authorized and within scope. The engine defaults to `safe-mode`, preventing destructive database mutations or denial-of-service payloads.

## Scan Profiles
- `passive`: Non-intrusive header, TLS, and leaked configuration checks.
- `api-logic`: Contextual auth bypass, token corruption, and cross-tenant BOLA/IDOR validation.
- `comprehensive`: Complete OWASP API Security and web vulnerability assessment.

## Usage
Run via CLI:
```bash
get-fable redteam --target http://localhost:3000 --profile passive
get-fable redteam --target https://staging.example.com --profile api-logic --token "Bearer test-jwt"
```
Or programmatically through get-fable's agentic tools.
