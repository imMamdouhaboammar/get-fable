# Example: Live Server Smoke Check

## Steps
1. Start dev server in background on port 8085.
2. Curl `http://localhost:8085/healthz` -> Check status 200 OK.
3. Terminate background server.
4. Record runtime evidence: `evidence pass runtime "curl /healthz" "Server started and responded 200"`.
