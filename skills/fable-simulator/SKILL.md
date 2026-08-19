---
name: fable-simulator
description: Verify code changes with independent oracles, contract derivation, headless UI testing, and workspace safety. Use when complex verification requires independent reference models or headless browser checks.
version: 1.2.0
pack: system
inputs:
  - verification_target
requires:
  - independent_oracle
produces:
  - oracle_evidence
  - causal_verification_matrix
gates:
  - oracle_independent
  - untracked_files_preserved
fallback: fable-verify
mutatesWorkspace: false
parallelSafe: false
neural_links:
  precursors:
    - fable-verify
  continuations:
    - fable-verify
    - fable-review
  lateral_peers:
    - fable-verify
  recovery: fable-recover
---

# fable-simulator

Independent oracle verification, contract simulation, and UI playthrough specialist.

## Purpose
Establish independent testing oracles, derive contracts from repository call sites, and conduct headless UI playthroughs with causal evidence.

## When to Use
- Verifying complex algorithmic rewrites against independent reference oracles.
- Deriving implicit contracts by analyzing caller types and error shapes across the repo.
- Conducting headless browser UI walkthroughs with pixel and interaction verification.

## When NOT to Use
- Running standard unit tests (use `fable-verify`).
- Writing initial production code (use `fable-execute` or `fable-tdd`).

## Inputs
- **`verification_target`**: Code, API, or UI component under test.

## Expected Outputs
- **`oracle_evidence`**: Verification matrix comparing candidate output against independent oracle.
- **`causal_verification_matrix`**: Action -> Observable Outcome -> Causal Evidence trace.

## Procedure
1. Derive complete contract from existing caller sites and tests across repository.
2. Establish independent oracle (golden fixtures, reference model, or secondary method).
3. Execute candidate and oracle across test corpus; assert 0 diffs.
4. For UI: execute headless browser playthrough and record evidence rows.

## Decision Rules
- An oracle sharing assumptions with the code under test is invalid.
- Never delete or modify untracked user files during simulation runs.

## Tool Policy
- Use headless browsers and isolated sandbox runners.

## Evidence Requirements
- Zero-diff comparison against independent oracle across representative inputs.

## Failure Handling
- If divergence is detected, identify whether candidate or oracle broke contract.

## Completion Criteria
- Candidate output matches independent oracle with 100% causal proof.

## Progressive Resources
- Guide: `references/oracle-derivation-guide.md`
- Example: `examples/independent-oracle-verification.md`
