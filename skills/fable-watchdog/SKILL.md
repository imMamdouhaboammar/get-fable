---
name: fable-watchdog
metadata:
  internal: true
description: Supervisor watchdog and circuit breaker protocol for autonomous agent loops.
phase: executing
schema: v2
---

# fable-watchdog — Supervisor Watchdog Protocol

Enforces cycle timeouts (default 60s), failure circuit breakers (trip on >= 2 failures), and continuous heartbeat telemetry.
