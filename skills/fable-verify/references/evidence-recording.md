# Evidence Recording Protocol

## Evidence Types
- `test`: Automated test runner results (`bun test`, `pytest`, `cargo test`).
- `build`: Compiler and bundler outputs (`tsc`, `bun run build`).
- `runtime`: Live process health checks, HTTP status codes, smoke tests.
- `review`: Independent diff verification.
- `security`: Threat boundary analysis, vulnerability scan results.
