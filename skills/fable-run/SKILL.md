---
name: fable-run
description: Launch and drive the live application (CLI, Server, TUI, Electron, Browser) to verify changes in a real runtime environment.
---

# fable-run

Specialist skill for executing runtime verification, launching application processes, and confirming changes work in reality.

## When to Use
- Running, starting, or driving the application to verify behavior beyond static unit tests.
- Performing HTTP health checks, smoke tests, and command-line execution tests.
- Capturing runtime logs and execution proofs for `get-fable evidence pass runtime`.

## Core Rules & Invariants
1. **Isolated & Safe Execution**:
   - Run servers on isolated non-conflicting ports or test environments.
   - Clean up background processes and temporary subprocesses upon completion.
2. **Concrete Proof Collection**:
   - Collect stdout/stderr logs and verify expected HTTP status codes or CLI outputs.
   - Record runtime evidence into Fable state.
