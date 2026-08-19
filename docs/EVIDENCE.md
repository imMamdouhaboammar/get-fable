# Evidence & Proof Semantics

## Core Requirements
- **Freshness**: `verifiedGeneration === mutationGeneration`.
- **Causal Verification**: Observed terminal outputs, exit codes, or pixel checks.
- **Independent Oracles**: Verification oracles must not share assumptions or code paths with the deliverable under test.
