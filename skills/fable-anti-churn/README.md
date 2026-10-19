# fable-anti-churn

Deterministic duplicate-work prevention, evidence reuse, and promotion gating for agent coding loops.

## Overview

`fable-anti-churn` eliminates redundant work across agent sessions:
- Prevents re-running identical tests or commands without code changes
- Blocks repeated deterministic failures until local fixes are made
- Reuses cryptographically verified passing evidence
- Validates candidate promotion proofs before delivery
- Enforces typed invalidations (`candidate_changed`, `requirements_changed`, etc.)

## Architecture

- **Native Rust Engine**: `crates/fable-anti-churn` provides sub-millisecond execution, JCS canonical sorting, SHA-256 digests, and atomic receipts locking.
- **Python Fallback & Scripts**: `scripts/churn_control.py` maintains 100% behavioral parity across all 23 corpus fixtures.
- **Lifecycle Integration**: Intercepts actions at `SessionStart`, `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, and `Stop`.

## Quick Start

```bash
# Evaluate an action event
bun ./bin/get-fable.js anti-churn decide event.json

# Record accepted evidence
bun ./bin/get-fable.js anti-churn accept <receipt-id> <evidence-digest> pass

# Verify ledger
bun ./bin/get-fable.js anti-churn verify

# Run test corpus
bun ./bin/get-fable.js anti-churn self-test
```
