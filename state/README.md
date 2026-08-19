# Fable State Management

## Overview
Fable persists durable lifecycle state in `.fable/state.json`.

## Invariants
- `schemaVersion`: 2
- `phase`: idle | discovering | planned | executing | verifying | recovering | complete | blocked
- `mutationGeneration`: increments on every workspace edit
- `verifiedGeneration`: updated when fresh evidence is recorded
