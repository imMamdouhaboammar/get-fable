# Evidence Policy

## Core Principle
Claims without causal observed outputs are unverified assertions.

## Rules
1. **Independent Oracles**: Self-authored comparisons against reference scripts configured the same way as the deliverable prove nothing. Oracles must be independent (repository test suites, golden fixtures, second methods).
2. **Causal Evidence Matrix**: For interactive and visual deliverables, record rows of `public user action → expected outcome → causal observation`.
3. **Pixel Inspection for Visuals**: Image-reading tools must inspect captured screenshot pixels before claiming visual correctness.
