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

# fable-run

Live runtime process execution and interactive smoke testing engine.

## Purpose
Launch live server processes, CLI binaries, and desktop applications to gather empirical runtime evidence and verify end-to-end functionality.

## When to Use
- Starting a dev server to test HTTP API responses or health endpoints.
- Executing compiled CLI binaries with sample arguments.
- Running live smoke tests against running microservices.

## When NOT to Use
- Running headless unit tests that don't need a live server (use `fable-verify`).
- Compiling code without running it (use `fable-execute`).

## Inputs
- **`app_target`**: Server start command or binary path.

## Expected Outputs
- **`runtime_evidence`**: HTTP status codes, process exit codes, stdout captures.
- **`smoke_proof`**: Concrete evidence of successful live execution.

## Procedure
1. Check available ports and start application process.
2. Probe health endpoint (`/healthz` or root) with HTTP client.
3. Validate expected response payload and status code 200.
4. Terminate background process cleanly.

## Decision Rules
- Always terminate spawned background processes after smoke testing.
- Never leave orphaned listener ports open.

## Tool Policy
- Run server processes with bounded timeouts and probe via curl/fetch.

## Evidence Requirements
- Recorded HTTP 200 or clean process exit code 0.

## Failure Handling
- On process crash or port conflict, kill dangling processes and inspect error logs.

## Completion Criteria
- Application starts, responds to probe cleanly, and terminates safely.

## Progressive Resources
- Protocol: `references/runtime-process-management.md`
- Example: `examples/live-server-smoke-check.md`
