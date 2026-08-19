---
name: fable-mode
description: Compatibility alias for the canonical get-fable coding lifecycle. Use when the user explicitly asks for Fable mode or when an existing installation invokes this legacy skill name.
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

`fable-mode` is a legacy entry name. New behavior belongs to the canonical `get-fable` skill pack and `skills/get-fable/registry.json`.

When the canonical pack is reachable, route there instead of maintaining a second workflow here.

If the host cannot invoke canonical skills directly, preserve these invariants inline:

- route by missing evidence or decision
- resolve repository unknowns and current external facts before they influence architecture
- use bounded plans for broad work and red-green checks for testable behavior changes
- delegate only disjoint work with explicit ownership and acceptance
- treat review, security, release, handoff, evaluation, and recovery as distinct jobs
- advance mutation state after workspace changes
- require fresh current-generation completion evidence after the final mutation
- change the diagnosis before another repair after repeated failure

Evidence types stay narrow: research supports decisions, receipts support execution provenance, handoffs support continuity, and none of them substitutes for behavior verification.

This workflow changes process around a model. It does not change model weights, reproduce a proprietary model, expose hidden reasoning, or guarantee equivalent capability.
