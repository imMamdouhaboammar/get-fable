---
name: get-fable
description: Repository-local adapter to the canonical get-fable workflow for evidence, planning, bounded execution, verification, and recovery.
---

# get-fable repository adapter

The canonical workflow lives in the root `skills/` directory. Do not maintain a second independent workflow definition here.

## Source of truth

- `skills/registry.json`
- `skills/get-fable/SKILL.md`
- `skills/fable-discover/SKILL.md`
- `skills/fable-plan/SKILL.md`
- `skills/fable-execute/SKILL.md`
- `skills/fable-verify/SKILL.md`
- `skills/fable-recover/SKILL.md`

When this host cannot follow those files directly, apply the same routing order:

1. recovery for repeated or stale failure
2. verification for review or completion proof
3. discovery for load-bearing unknowns
4. planning for broad architecture or decomposition
5. execution for an already bounded change

Use Bun for this repository's TypeScript tests. Follow root `AGENTS.md` for repository rules and capability boundaries.
