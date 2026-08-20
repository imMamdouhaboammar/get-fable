# Resumability and Context Compaction

A useful handoff preserves **decision state**, not conversation volume.

## What survives compaction
Keep information when losing it would cause one of these:
- rediscovery of repository/runtime facts;
- repetition of a failed hypothesis;
- accidental overwrite of user work;
- use of stale evidence;
- wrong branch/PR/release target;
- architectural decision being reopened without reason;
- next action being impossible to execute.

Everything else is a candidate for omission.

## Evidence freshness
Never write `tests pass` without enough identity to know what they proved. Prefer:

```text
bun test test/auth.test.ts → 8 pass, 0 fail
fresh for mutation generation 12 / commit abc123
```

If code changed after that, preserve the old result as historical evidence but mark it stale.

## Failure memory
High-value failure memory has three parts:
1. hypothesis/action attempted;
2. observation;
3. conclusion.

Example:

```text
Hypothesis: source change is not loaded because CLI runs stale dist
Probe: compared source/dist hash and invoked each entrypoint
Observation: hashes identical; both show same behavior
Conclusion: stale-dist theory falsified; do not repeat clean/rebuild as next diagnosis
```

This is more valuable than ten lines of stack trace.

## Dirty workspace
List intentional and protected changes separately. A receiving agent should know what it may modify, what belongs to the user/another task, and whether `.fable` state or generated output should remain uncommitted.

## External state
For work that crosses the repository boundary, record exact state rather than intent:
- PR open/merged + number;
- CI run + failing job/reason;
- tag exists/absent + target SHA;
- GitHub Release draft/public;
- registry version visible/not visible;
- marketplace submitted/pending/published.

## Secret-safe continuation
Never include the credential itself. Record only:
- which authenticated capability is needed;
- preferred secure mechanism (`gh auth`, secret manager, CI OIDC, connector);
- whether authentication was confirmed.

## Compression test
Before finalizing, imagine the next agent receives only the handoff and repository access. If it must ask "which branch?", "what failed?", "is that test current?", "what should I do first?", or "which files must I not touch?", the handoff is still too lossy.