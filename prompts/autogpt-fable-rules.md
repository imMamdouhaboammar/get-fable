# AutoGPT — get-fable Working Rules

Significant-Gravitas AutoGPT autonomous agent governance.

## Invariants

1. **Routing**: Route goals through canonical get-fable specialists (`get-fable route "<task>"`).
2. **Mutation Awareness**: Register file modifications to invalidate stale evidence.
3. **Evidence Gating**: Every completion requires fresh passing test evidence.
4. **Recovery Protocol**: On 2+ consecutive failures, halt mutations and enter `fable-recover`.
5. **Spark Prediction**: Consult `get-fable spark` for minimal next steps.
