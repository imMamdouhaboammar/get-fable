---
title: Typed failure receipts for explicit updater execution
date: 2026-09-12
category: best-practices
module: updater
problem_type: architecture_pattern
component: service_layer
severity: high
applies_when:
  - "Executing an update plan across package-manager or Git process boundaries"
  - "Returning updater results to CLI or JSON consumers"
tags: [updater, receipts, locking, error-handling, security]
---

# Typed failure receipts for explicit updater execution

## Context

The R2 updater crosses process, filesystem, lock, and installed-version boundaries. A process can exit non-zero, throw before producing a result, fail version verification, or lose the update lock before execution starts. Returning raw exceptions or an open-ended `{ success, message }` object makes those states ambiguous and can leak subprocess output into future CLI or JSON surfaces.

## Guidance

Model the executor result as a discriminated receipt. Success must require a verified installed version. Failures must identify a bounded outcome such as `lock-failure`, `command-failure`, `verification-failure`, or `release-failure` without copying arbitrary stderr or exception text into the public receipt.

Acquire the owner-token lock before process execution. Once acquired, release that exact handle from `finally`; a failed command or failed verification must not skip release. Lock acquisition failure itself is returned as a structured failure and must not run the mutation command. When the lock layer can safely classify contention, use a typed error code to preserve bounded recovery guidance, especially when owner liveness cannot be verified. Do not recover guidance by parsing exception prose. A release failure must also become a structured receipt so a successful process result cannot hide a stale updater lock.

## Why This Matters

The receipt becomes a public safety boundary when the CLI is routed through the R2 engine. Typed outcomes let callers render deterministic text or JSON without parsing prose, while excluding raw process diagnostics prevents credentials or unrelated command output from becoming part of the stable updater contract.

## When to Apply

- Explicit package-manager update execution
- Guarded Git update execution
- Machine-readable updater CLI output
- Any executor that owns a token-checked lock across external process calls

## Examples

A successful receipt carries `outcome: 'success'` and a required `verifiedVersion`. A runner exception becomes `outcome: 'command-failure'`; a mismatched or failed version probe becomes `outcome: 'verification-failure'`. Neither outcome exposes the original exception string by default.

## Related

- Issues #48 and #49
- `docs/specs/updater-announcement-cli-engine-r2.md`
- `src/core/update/executor.ts`
- `src/core/update/types.ts`
