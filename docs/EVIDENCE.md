# Evidence & Proof Semantics

## Core Requirements
- **Freshness**: `verifiedGeneration === mutationGeneration`.
- **Workspace ownership**: completion evidence must carry the same content-safe `workspaceId` as the state it supports. Foreign records are invalid; legacy unbound records are historical only.
- **Failure precedence**: a newer current-generation failure in a behavior or security check supersedes an older completion pass. Generic work must produce new behavior-appropriate proof after that failure; a later security pass alone cannot clear a functional gate.
- **Causal Verification**: Observed terminal outputs, exit codes, or pixel checks.
- **Independent Oracles**: Verification oracles must not share assumptions or code paths with the deliverable under test.
