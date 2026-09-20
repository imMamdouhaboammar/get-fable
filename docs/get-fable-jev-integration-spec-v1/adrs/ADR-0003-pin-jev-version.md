# ADR-0003: Pin Jev model versions for guarded routing

Status: Accepted

## Decision

Shadow exploration may use `jev-latest` when explicitly requested. Guarded or authority routing must use an approved versioned model id, initially evaluated against `jev-1.13.0`.

## Rationale

TypeSafe aliases can move. Confidence thresholds and calibration evidence are model-version dependent.
