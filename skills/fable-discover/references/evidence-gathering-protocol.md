# Evidence Gathering Protocol & Codebase Investigation

## Purpose
Standardized protocol for gathering concrete, verifiable evidence about unfamiliar codebases, runtime execution paths, and component boundaries without getting lost in exploratory rabbit holes.

## The 3 Truth Levels
When recording codebase observations, every fact must be explicitly tagged with its certainty level:
1. `[measured]`: Directly verified by reading source code, executing a command, or inspecting an active AST/schema.
2. `[inferred]`: Reasonably deduced from conventions, config defaults, or indirect calls, but not directly observed in runtime execution.
3. `[unresolved]`: An open unknown that has not yet been verified. If load-bearing, it blocks architectural decisions until resolved.

## Investigation Protocol

### Step 1: Topology & Root Inspection
Identify the foundation before reading implementation files:
- Inspect `package.json`, `Cargo.toml`, `pyproject.toml`, or `go.mod` for declared dependencies and entry points.
- Identify the build tool and test runner (`bun`, `vite`, `jest`, `cargo`, `pytest`).
- Check workspace configurations and multi-package layouts.

### Step 2: Entry Point & Flow Tracing
Trace execution from the observable outside boundary:
- CLI tools: Locate binary scripts in `bin/` or `src/cli.ts`.
- HTTP APIs: Locate router declarations and middleware chains.
- Background jobs: Locate queue listeners and worker loops.

### Step 3: Dynamic Dispatch & Plugin Resolution
When direct symbol references disappear:
- Check dynamic imports (`import()`, `require()`).
- Inspect plugin registers, hook tables, and reflection mechanisms.
- Look for code generation scripts and build artifacts in `dist/` or `generated/`.

### Step 4: Stop Condition
Stop discovery when all load-bearing questions needed for the next work card are answered with `[measured]` evidence. Do not continue exploring adjacent subsystems that are out of scope.
