# Process Lifecycle and Readiness

Live-process evidence is trustworthy only when you know which process/artifact produced it and when the service became ready.

## Four separate runtime claims
Do not collapse these:

1. **Spawned** — process creation succeeded.
2. **Ready** — service initialized and can accept intended work.
3. **Behavior correct** — target probe produced expected result.
4. **Cleaned up** — owned process/resources terminated safely.

Each may fail independently.

## Process identity
When staleness is possible capture:
- executable/import path;
- version/hash;
- PID/start time;
- cwd;
- port owner;
- build artifact path.

A request to localhost can accidentally hit a server from a previous run. Verify ownership before treating output as current evidence.

## Readiness loops
Prefer bounded polling of a meaningful readiness condition over fixed sleeps.

Useful loop properties:
- finite deadline;
- modest backoff;
- captures last error/status;
- stops early on process exit;
- distinguishes connection refused from wrong payload;
- cleans up after timeout.

## Health vs feature probes
A health endpoint usually proves dependencies/startup, not the feature under test. Pair it with the narrowest safe feature probe when the verification claim concerns a route, CLI mode, plugin, UI path, or queue behavior.

## Port conflicts
Do not kill an unknown process. Inspect it or choose an isolated port. A fixed canonical port is useful only when the application contract requires it.

## CLI runs
For one-shot commands record:
- args/stdin;
- exit code;
- stdout/stderr separately;
- filesystem/network side effects;
- working directory and env.

Nonzero can be correct for an expected error-path test.

## Cleanup
Track child processes and temporary resources. On test failure, cleanup still runs. Escalate from graceful signal to forced termination only for the process tree you own.

## Evidence scope
Examples:
- `GET /healthz = 200` → server became healthy.
- `POST /checkout invalid card = 422 body ...` → that error contract observed.
- `CLI --help exits 0` → CLI entrypoint and help path start; it does not prove every command.

Write the narrow claim instead of saying "runtime verified."