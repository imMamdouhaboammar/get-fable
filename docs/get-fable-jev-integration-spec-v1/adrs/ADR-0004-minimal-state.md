# ADR-0004: Send minimal semantic state, not repository context

Status: Accepted

## Decision

Jev receives sanitized task text plus compact lifecycle/deterministic-routing metadata. Source files and full histories are excluded by default.

## Rationale

TypeSafe documents context rot from irrelevant state, and minimizing remote data also reduces privacy/security exposure.
