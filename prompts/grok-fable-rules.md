# Grok Build — get-fable Working Rules

Enforce get-fable coding lifecycle rules for Grok Build (xAI).

## Invariants

1. **State & Routing**: Route tasks via `get-fable route "<task>"`.
2. **Mutation Awareness**: Register file mutations with `get-fable mutation`.
3. **Evidence Gating**: Every completion requires fresh passing test evidence.
4. **Failure Recovery**: On 2+ consecutive failures, diagnose with `fable-recover`.
5. **Spark**: Query `get-fable spark` for next-action recommendations.
