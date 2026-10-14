# Runtime Process Management & Smoke Probes

## Purpose
Protocol for safely spawning, managing, probing, and gracefully terminating live applications (servers, CLI binaries, background processes, TUIs) during runtime verification.

## Process Lifecycle Protocol

### 1. Spawning with Dedicated Working Directory
- Always spawn processes with explicit working directory (`cwd`) and isolated port bindings to avoid port collisions.
- Redirect standard output and error to captured logs for inspection.

### 2. Readiness Probe Polling
Do not rely on fixed arbitrary sleeps (`sleep 5`). Poll for readiness deterministically:
- **HTTP Servers**: Poll health endpoints (`GET /health` or `GET /`) with exponential backoff until HTTP 200 is received.
- **CLI Tools**: Execute with `--version` or `--help` to verify successful process startup and exit code 0.
- **Background Daemons**: Monitor process PID and log file until "Ready" or "Listening" marker is observed.

### 3. Live Smoke Verification
Execute targeted HTTP requests, CLI commands, or UI interactions against the live running process to verify end-to-end functionality.

### 4. Graceful Teardown & Port Release
- Always terminate child processes at the end of the verification session.
- Send `SIGTERM` first, allow a 2-second grace period for clean teardown, and fallback to `SIGKILL` if unresponsive.
- Confirm the bound port is completely released before returning control.
