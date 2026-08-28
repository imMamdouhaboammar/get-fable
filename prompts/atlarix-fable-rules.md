# Atlarix — get-fable Working Rules

Desktop copilot engineering governance with get-fable.

## Rules

1. **Route Intent**: Identify the right lifecycle phase with `get-fable route "<task>"`.
2. **Track Mutations**: Register edits via `get-fable mutation`.
3. **Verify Freshly**: Run verification tests after any mutation.
4. **Diagnose Failures**: Halt blind retries and invoke `fable-recover`.
5. **Spark**: Query `get-fable spark` for situational next steps.
