# Subagent Delegation Contracts

## Requirements for Safe Delegation
1. **Disjoint Ownership**: Worker A owns files X and Y; Worker B owns files Z and W. No shared mutable files.
2. **Explicit Verification Command**: Worker must run their local verification command before returning.
3. **Structured Outcome**: Worker returns `outcome`, `filesChanged`, `evidence`, `blockers`.
4. **Parent Integration Gate**: The parent orchestrator inspects the integrated diff before accepting completion.
