# Decomposition Rules for Implementation Cards

## Principles
1. **Single Responsibility**: Each card touches only one cohesive subsystem.
2. **Machine-Checkable Acceptance**: Every card defines an automated test or command that proves completion.
3. **Disjoint Ownership**: If parallelizing, files touched by Card A must not overlap with Card B.
4. **Zero Hidden Invariants**: Document non-obvious constraints directly in the card.
