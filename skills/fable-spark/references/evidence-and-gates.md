# Evidence-Driven State Transitions & Gate Enforcement

## Purpose
Establishes the formal rules governing evidence evaluation, gate satisfaction, and mutation invalidation within Fable Spark's situational awareness engine.

## Evidence Freshness & Mutation Generations
In Fable's state model, workspace mutations and verification evidence are strictly synchronized through monotonically increasing generation counters:
- **Mutation Generation (\`mutationGeneration\`)**: Incremented every time a mutating file operation (edit, write, refactor) occurs in the workspace.
- **Verified Generation (\`verifiedGeneration\`)**: Records the mutation generation at which the most recent passing verification evidence was gathered.

\`\`\`
State: [Mutation Gen: 3, Verified Gen: 2] ──> STALE EVIDENCE ──> Spark Hint: "verify changes"
State: [Mutation Gen: 3, Verified Gen: 3] ──> FRESH EVIDENCE ──> Spark Hint: "silent"
\`\`\`

## Gate Satisfaction Rules

### 1. The Freshness Gate
Evidence is considered **fresh** if and only if:
\`\`\`
evidence.generation === state.mutationGeneration
\`\`\`
If \`state.mutationGeneration > state.verifiedGeneration\`, any completion, release, or merge action is blocked until fresh verification evidence is produced.

### 2. The Completion Gate
Substantial work cards cannot transition to \`phase: "complete"\` without explicit machine-checkable proof.
- Passing test outputs (\`bun test\`, \`pytest\`) satisfy the completion gate.
- Static typecheck receipts (\`tsc --noEmit\`) satisfy the completion gate.
- Read-only discovery notes and conversational responses **do NOT** satisfy the completion gate.

### 3. Failure Precedence Gate
When \`state.failureStreak >= 2\`, execution is suspended. Spark forces a transition to \`fable-recover\` to diagnose the underlying root cause rather than permitting repeated blind mutation attempts.
