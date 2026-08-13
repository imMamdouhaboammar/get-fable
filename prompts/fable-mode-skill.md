---
name: fable-mode
description: Compatibility alias for the modular get-fable workflow. Use when a user explicitly asks for fable mode or when the current project is already armed with .fable state. The canonical workflow lives in the get-fable and fable-* skills.
triggers:
  - "fable mode"
  - "fable-mode"
  - "use fable mode"
  - "work like Fable 5"
  - "rigorous mode"
  - "fable 模式"
  - "开 fable-mode"
  - "像 Fable 5 一样做"
  - "严谨模式"
---

# fable-mode compatibility adapter

`fable-mode` is retained for existing installations. New workflow behavior is defined by the canonical skill pack installed beside this file.

## Canonical route

Use `get-fable` as the entry skill. Its ordered specialists are:

1. `fable-discover` for load-bearing evidence and current facts
2. `fable-plan` for bounded decomposition and acceptance criteria
3. `fable-execute` for one accepted implementation card
4. `fable-verify` for adversarial proof and fresh evidence
5. `fable-recover` for repeated failure, stale execution, or contradictory evidence

Recovery takes precedence over another blind retry. Verification takes precedence over a completion claim. Discovery takes precedence over architecture when important facts remain unknown.

## Durable state

When `.fable/state.json` exists, follow its phase and failure state. Keep human-readable task context in `docs/SPEC.md`, `.fable/LEDGER.md`, and `.fable/PROGRESS.md` without replacing unrelated user-owned content.

## Completion rule

For substantial work, do not claim completion until the affected behavior has fresh passing evidence. If the host cannot invoke the canonical skills directly, follow their contracts inline.

## Capability boundary

This workflow can improve planning, context hygiene, verification, and recovery behavior. It does not change model weights, reproduce a proprietary model, expose hidden reasoning, or guarantee equivalent benchmark performance.
