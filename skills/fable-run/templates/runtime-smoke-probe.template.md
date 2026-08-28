# Runtime Smoke Verification Probe

## Target Application Specification
- **Process Type**: HTTP Web Server & API
- **Start Command**: `bun ./bin/get-fable.js serve:web --port 8085`
- **Readiness URL**: `http://127.0.0.1:8085/health`
- **Readiness Criteria**: HTTP Status 200 OK with JSON `{"ok": true}`

## Execution & Teardown Log
1. [Spawn Process]: Process spawned with PID [12345]
2. [Probe Attempt 1]: Connection refused (waiting 500ms)
3. [Probe Attempt 2]: HTTP 200 OK received in 512ms
4. [Smoke Test]: Executed GET /api/v1/status -> Received valid payload
5. [Teardown]: Sent SIGTERM to PID [12345]; process exited cleanly (code 0)
