---
name: fable-tdd
description: Implement a testable feature or bug fix through a red-green cycle. Use when behavior can be specified through a durable automated check before or alongside the implementation.
---

# Fable TDD

Make the behavior observable before trusting the implementation.

## Contract

1. Restate the behavior contract and choose the narrowest durable test surface that proves it.
2. Add or identify a test that fails for the intended reason. Record the red observation.
3. Change only enough production code to satisfy that behavior.
4. Run the focused test until it passes, then run the nearest relevant regression gate.
5. Cleanup is allowed only while the behavior remains green and scope stays inside the accepted card.
6. If the test cannot be made meaningfully red, stop and route to `fable-discover` or `fable-plan` instead of writing a test that merely mirrors the implementation.
7. Repeated or contradictory failure routes to `fable-recover`.

## Exit condition

The behavior has an observed red state, a passing implementation, and a focused regression check tied to the accepted contract. Route the complete affected path to `fable-verify`.
