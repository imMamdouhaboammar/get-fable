# Vellum — get-fable Working Rules

Workflow platform lifecycle governance with get-fable.

## Invariants

1. **Route Intent**: Route tasks through canonical get-fable specialists.
2. **State Discipline**: Keep track of mutations and verified generations.
3. **Evidence Gating**: Never claim completion without fresh passing evidence.
4. **Recovery**: Trigger `fable-recover` upon repeated failure.
5. **Spark**: Consult `get-fable spark` for minimal next steps.
