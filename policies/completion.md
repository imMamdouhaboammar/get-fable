# Completion Policy

## Core Principle
Completion is an evidence-backed state transition, not an agent declaration.

## Rules
1. **Fresh Evidence Gate**: Substantial changes (`substantial = true`) cannot transition to `complete` unless fresh passing evidence (`verifiedGeneration === mutationGeneration`) is recorded.
2. **Deterministic Mutation Invalidation**: Any workspace file edit increments `mutationGeneration` and invalidates previous verification proofs.
3. **No Unfinished Promises**: If the final response contains promises or unexecuted next steps ("I will now run...", "Next we must..."), the agent must execute them before concluding.
