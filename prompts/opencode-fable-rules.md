# OpenCode Fable 5 Rules

OpenCode agent governance via **get-fable**.

## Invariants

1. **State Tracking**: Keep state synchronized with `.fable/state.json`.
2. **Mutation Discipline**: Edits advance `mutationGeneration` and stale previous verifications.
3. **Execution Routing**: Follow canonical skills under `.agents/skills/`.
4. **Recovery**: Route 2+ consecutive failures into diagnosis before further code changes.
5. **Spark Prediction**: Observe single atomic next move suggestions.
