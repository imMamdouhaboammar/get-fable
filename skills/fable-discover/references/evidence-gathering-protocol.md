# Evidence Gathering Protocol

## Priority of Investigation
1. **Entry points & manifests**: `package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, CLI definitions.
2. **Architecture & runbooks**: `AGENTS.md`, `README.md`, `docs/ARCHITECTURE.md`.
3. **Execution paths**: Follow imported symbols from router/controller down to database/file layer.
4. **Verification harness**: Existing test files, linters, typecheck configs.

## Evidence Classification
- **[measured]**: Proved by direct tool execution (e.g. `bun test` output or file inspection).
- **[inferred]**: Derived logically from code patterns (must be stated as hypothesis).
- **[unresolved]**: Unknown requiring explicit probe before proceeding.
