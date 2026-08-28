# Hermes Agent — get-fable Working Rules

Nous Research Hermes Agent lifecycle governance.

## Invariants

1. **State & Routing**: Route intent to get-fable specialists (`get-fable route "<task>"`).
2. **Mutation Awareness**: Register file modifications to invalidate older verification.
3. **Evidence Gating**: Every completion requires fresh passing test evidence.
4. **Recovery Protocol**: On 2+ consecutive failures, halt mutations and enter `fable-recover`.
5. **Spark Prediction**: Query `get-fable spark` for next-action recommendations.
