# Codegen — get-fable Working Rules

Platform agent lifecycle rules for Codegen.

## Invariants

1. **Routing**: Route intent to the correct specialist (`get-fable route "<task>"`).
2. **Mutation Awareness**: Register file changes to keep verification fresh.
3. **Evidence Verification**: Record test evidence before closing tasks.
4. **Failure Recovery**: On repeated issues, use `fable-recover`.
5. **Spark Guidance**: Query `get-fable spark` for next-action recommendations.
