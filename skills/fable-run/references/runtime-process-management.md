# Runtime Process Management

## Protocol
1. **Port Selection**: Use dynamic unreserved ports (>1024) to avoid port collisions.
2. **Graceful Teardown**: Always ensure background servers are terminated cleanly after verification.
3. **Health Check Probing**: Verify `/healthz` or root endpoint returns HTTP 200 before concluding smoke check.
