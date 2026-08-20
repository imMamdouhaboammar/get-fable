---
name: fable-run
description: Launch and drive live applications to verify end-to-end runtime behavior. Use when starting development servers, testing live CLI binaries, or driving browser smoke tests.
version: 1.3.0
pack: system
inputs:
  - app_target
requires:
  - built_artifact
produces:
  - runtime_evidence
  - smoke_proof
gates:
  - process_clean_exit
  - status_200
fallback: fable-recover
mutatesWorkspace: false
parallelSafe: false
neural_links:
  precursors:
    - fable-dataviz
    - fable-execute
  continuations:
    - fable-verify
    - fable-release
  lateral_peers:
    - fable-verify
  recovery: fable-recover
---

# Fable Run

Execute the real artifact in a bounded environment and collect runtime evidence without confusing "process started" with "application works."

## Mission
Runtime work needs lifecycle ownership: exact command/artifact, working directory, environment, ports, readiness criteria, output bounds, timeout, and cleanup.

A server PID, HTTP 200 from the wrong process, or CLI exit 0 that never exercised the feature is not sufficient proof.

## Activate When
- a server/service must run to verify behavior;
- a built/published CLI or executable needs a smoke test;
- browser/runtime integration requires a live process;
- a runtime path differs materially from unit-test/source execution;
- verification needs empirical entrypoint/lifecycle evidence.

## Do Not Activate When
- unit/integration tests can prove behavior without a persistent live process (`fable-verify`);
- code still needs implementation (`fable-execute`);
- repeated runtime failure/staleness needs diagnosis (`fable-recover`);
- launching the process would cause an unauthorized/destructive external side effect.

## Runtime Classification
| Target | Important controls |
| --- | --- |
| one-shot CLI | cwd/env/args, exit, stdout/stderr, side effects |
| HTTP server | port ownership, readiness, health vs feature probe, cleanup |
| worker/daemon | startup readiness, queue/input fixture, termination |
| browser app | server URL, browser readiness, console/network errors |
| packaged binary | exact artifact/version/path, clean environment |
| multi-service | dependency startup order, ports, teardown, correlation |

## Protocol
### Stage 1 — Identify the exact artifact
Record:
- command/binary path;
- version/hash/build if relevant;
- cwd;
- required environment/config;
- expected process type;
- safe input/probe;
- destructive/external side effects to avoid.

Do not assume `foo` on PATH is the artifact just built—resolve it when identity matters.

### Stage 2 — Establish resource ownership
Before launch determine:
- requested/available port;
- whether an existing process owns it;
- temp directories/files;
- child-process behavior;
- timeout/budget;
- cleanup method.

Never kill an unrelated process merely to acquire a preferred port.

### Stage 3 — Launch with bounded observation
Capture PID/process handle, stdout/stderr, startup errors, and timestamps. Use output/timeout limits so a noisy/hung service cannot consume unbounded resources.

### Stage 4 — Distinguish startup from readiness
A successful spawn only means the OS accepted the process.

Readiness may require:
- port accepting connections;
- health endpoint with expected payload;
- dependency initialization complete;
- CLI command reaches expected branch;
- browser page loads without fatal console/runtime errors.

Use a bounded readiness loop with backoff rather than a fixed arbitrary sleep when possible.

### Stage 5 — Probe the behavior that matters
Health 200 proves health only. If the changed feature is `/checkout`, probe the smallest safe checkout behavior/contract rather than concluding from `/healthz` alone.

Record request/input and relevant response/side effect.

### Stage 6 — Detect wrong/stale process
If output contradicts source/build expectations, check:
- resolved executable/import path;
- process start time;
- port owner PID;
- build/artifact hash;
- cwd/env;
- old server still running.

Route repeated ambiguity to recovery before changing product logic.

### Stage 7 — Terminate cleanly
Stop only processes/resources owned by this run. Wait for clean exit where feasible, escalate termination only within the owned process tree, and remove temporary resources.

### Stage 8 — Record runtime evidence narrowly
State what the run proves: entrypoint launches, endpoint behavior observed, shutdown clean, etc. Hand broader correctness to `fable-verify`.

## Decision Rules
- Port conflict with unknown process → choose another safe port or inspect owner; do not indiscriminately kill it.
- Spawn success without readiness → keep waiting/probing within budget, not PASS.
- Health success without changed-feature probe → only health claim passes.
- Fixed sleep for readiness is weaker than bounded condition polling; prefer observable readiness.
- Runtime output unchanged after source change → prove artifact/process identity before another code mutation.
- One-shot CLI that intentionally exits nonzero can still be a valid tested error path; compare exit/output to expected contract rather than requiring 0 universally.
- External production-like side effect requires explicit safe scope/authorization; prefer local fixture/sandbox when available.
- Background processes must have ownership and cleanup even if the test itself fails.

## Invariants
- Exact runtime artifact/process identity is knowable when used as evidence.
- No unrelated process is killed.
- Spawn, readiness, behavior, and shutdown are separate claims.
- Runtime probes are bounded by time/output/resources.
- Owned background resources are cleaned on success and failure.
- Evidence does not claim more than the actual probe exercised.

## Failure Taxonomy
### Spawn failure
Executable missing, permission/config/startup error. Inspect command/artifact/env before retry.

### Readiness failure
Process alive but service never becomes usable. Capture startup logs/dependencies and diagnose.

### Wrong-process evidence
Port/path points to an older/unrelated process. Resolve identity, do not mutate product.

### Feature probe failure
Runtime is ready but target behavior is wrong. Return to verify/execute/recover based on clarity.

### Hang/leak
Process or child does not terminate. Inspect lifecycle/cleanup; force only owned tree within bounds.

### Environmental mismatch
Behavior depends on cwd/env/OS/runtime version. Record and reconcile rather than treating as product fact universally.

## Anti-Patterns
- `sleep 5 && curl /healthz` as universal runtime proof;
- assuming PID created means ready;
- using 200 from health endpoint to prove unrelated feature;
- killing whatever owns port 3000;
- leaving server running after failure;
- testing a PATH-installed old binary instead of candidate artifact;
- ignoring stderr because process stayed alive;
- unbounded log capture or polling;
- performing real destructive transactions for a smoke test without need.

## Runtime Packet
```text
Artifact/command/version:
CWD/env/config:
Owned resources/PID/port:
Readiness condition/result:
Behavior probe/result:
Stdout/stderr highlights:
Artifact/process identity checks:
Termination/cleanup:
What this proves:
What remains for verify:
```

## Completion Criteria
Runtime execution completes when:
- exact candidate process/artifact was launched under known context;
- readiness was observed, not assumed;
- relevant behavior was probed or evidence scope is explicitly limited;
- stale/wrong process ambiguity is resolved;
- owned processes/resources are cleaned;
- evidence is handed to verification without overclaiming.

## Progressive Resources
- Deep guide: `references/process-lifecycle-and-readiness.md`
- Existing protocol: `references/runtime-process-management.md`
- Example: `examples/live-server-smoke-check.md`
