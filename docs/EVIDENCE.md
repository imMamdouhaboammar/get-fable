# Evidence & Proof Semantics

## Core Requirements
- **Freshness**: `verifiedGeneration === mutationGeneration`.
- **Workspace ownership**: completion evidence must carry the same content-safe `workspaceId` as the state it supports. Foreign records are invalid; legacy unbound records are historical only. Migrated security evidence is subject to this same owner match before it can satisfy completion.
- **Task-scope authority**: when a canonical routing decision exists, its mutually consistent `selectedSkill`, `selectedPack`, and `taskShape` determine whether security evidence can complete the task. `currentSkill` describes the current execution stage and cannot widen that authority. Legacy state may fall back to a canonical security `currentSkill` only when the routing decision is absent, not malformed.
- **Failure precedence**: a newer current-generation failure in a behavior or security check supersedes an older completion pass. "Newer" means later in persisted evidence-array order within the current mutation generation. Generic work must produce new behavior-appropriate proof after that failure; a later security pass alone cannot clear a functional gate.
- **Causal Verification**: Observed terminal outputs, exit codes, or pixel checks.
- **Independent Oracles**: Verification oracles must not share assumptions or code paths with the deliverable under test.
