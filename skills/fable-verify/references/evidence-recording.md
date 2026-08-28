# Evidence Recording & Verification Schema

## Purpose
Specification for recording typed verification evidence in `.fable/state.json`, binding test outputs to mutation generations, and ensuring evidence integrity.

## The Evidence Data Schema
Every evidence entry recorded in state must conform to schema version 3:

```json
{
  "kind": "test",
  "command": "bun test test/auth.test.ts",
  "generation": 3,
  "passed": true,
  "details": "14 tests passed, 0 failures",
  "timestamp": "2026-08-28T09:30:00.000Z"
}
```

## Evidence Validity Rules
- **Generation Binding**: Evidence is valid only if `evidence.generation === state.mutationGeneration`. Any subsequent file edit increments `mutationGeneration`, immediately invalidating prior evidence.
- **Completion Gate**: Substantial tasks cannot transition to `complete` unless the newest completion-capable evidence belongs to the current mutation generation and has `passed: true`.
