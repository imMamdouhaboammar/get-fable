---
name: get-fable
description: Repository-local adapter to the canonical get-fable coding lifecycle. Use the root skill pack and registry as the semantic source of truth.
---

# get-fable repository adapter

Do not maintain an independent workflow here.

Canonical sources:

- `skills/get-fable/SKILL.md`
- `skills/get-fable/registry.json`
- root `skills/fable-*/SKILL.md`
- root `AGENTS.md`

When direct canonical skill loading is unavailable, preserve the registry-v2 rules: route by missing evidence, keep broad work bounded, use test-first checks for testable behavior, keep delegation ownership explicit, distinguish review/security/release/handoff/eval jobs, record mutation freshness, and diagnose repeated failure before another repair.

Substantial completion requires passing completion-capable evidence for the current mutation generation. Research, receipts, and handoff records cannot substitute for behavior verification.
