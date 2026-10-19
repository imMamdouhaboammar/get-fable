---
name: fable-steward
description: Autonomous perpetual repository steward and continuous builder. Proactively monitors GitHub CI, triages and resolves issues via TDD, audits and verifies PRs, hunts anti-slop code debt, and packages roadmap capabilities in a self-driving perpetual loop. Use when asked to manage a repository autonomously, run continuous maintenance passes, triage issues, review PRs, or build features unattended.
version: 1.0.0
pack: delivery
inputs:
  - repository_context
  - github_events
requires:
  - git_access
  - test_runner
produces:
  - maintenance_diff
  - triage_report
  - pull_request
gates:
  - minimal_diff
  - machine_checked
  - fresh_evidence
fallback: fable-recover
mutatesWorkspace: true
parallelSafe: false
neural_links:
  precursors:
    - get-fable
    - fable-discover
  continuations:
    - fable-tend
    - fable-review
    - fable-tdd
    - fable-execute
    - fable-verify
    - fable-release
  lateral_peers:
    - fable-cowork
    - fable-spark
  recovery: fable-recover
---

# Fable Steward

Operate as an autonomous, perpetual repository steward and continuous builder. Proactively probe GitHub platform health, triage open issues and PRs, execute surgical repairs, and package roadmap capabilities through deterministic 5-tier triage.

## Mission

Transform autonomous agent execution from one-shot requests into a continuous, self-driving engineering loop. The steward independently determines whether the next priority is repairing broken CI, reviewing an open PR, implementing an issue via TDD, or packaging new capabilities.

## Triage Priority Matrix

1. **Tier 1 — Failing Mainline CI**: Mainline stability is priority #1. Repair build or workflow failures via `fable-tend` before adding features.
2. **Tier 2 — Pending Pull Requests**: Audit open PRs with `fable-review` and adversarial assertions (`fable-judge`).
3. **Tier 3 — Open Issues**: Reproduce issue defects with failing test fixtures first, implement native fixes via `fable-tdd`, and submit PRs.
4. **Tier 4 — Code Hygiene & Anti-Slop**: Remediate uncommitted modifications, remove dead code, and prevent swallowed errors (`fable-anti-slop-engineering`).
5. **Tier 5 — Feature Innovation**: Package next high-impact capability from roadmap with full unit/integration coverage (`fable-spark` + `fable-cowork`).

## Safety Invariants

- **Non-Negotiable Merge Gate**: The steward never self-merges mainline PRs without explicit authorization or passing verified evidence gates.
- **Minimal Diff Principle**: CI repairs and bug fixes touch strictly necessary lines.
- **Fresh Evidence Requirement**: Every mutation generation must be verified with real test execution before closing work cards.
