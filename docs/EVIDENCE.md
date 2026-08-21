# Evidence & Proof Semantics

## Core Requirements
- **Freshness**: `verifiedGeneration === mutationGeneration`.
- **Workspace ownership**: completion evidence must carry the same content-safe `workspaceId` as the state it supports. Foreign records are invalid; legacy unbound records are historical only.
- **Causal Verification**: Observed terminal outputs, exit codes, or pixel checks.
- **Independent Oracles**: Verification oracles must not share assumptions or code paths with the deliverable under test.
