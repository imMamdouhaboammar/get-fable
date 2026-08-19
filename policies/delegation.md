# Delegation Policy

## Core Principle
Parallel execution requires explicit scope isolation and disjoint file ownership.

## Rules
1. **Disjoint Ownership**: No two subagents may edit the same file or resource concurrently.
2. **Explicit Contracts**: Every delegation must declare inputs, outputs, acceptance criteria, and timeouts.
3. **No Unmonitored Spawning**: The delegating agent remains accountable for reviewing and verifying all subagent results.
