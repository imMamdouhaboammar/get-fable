# ADR-0001: Keep deterministic routing and add Jev as a hybrid advisor

Status: Accepted for implementation planning

## Context

get-fable already has a deterministic, synchronous, registry-backed router with hard lifecycle and safety semantics. Jev adds semantic classification and calibrated probabilities but is remote and fallible.

## Decision

Retain deterministic routing as canonical fallback and hard-policy owner. Add Jev through an asynchronous provider-neutral advisory layer and a pure fusion policy.

## Consequences

Positive:

- reversible rollout
- offline behavior preserved
- safety semantics remain code-owned
- Jev can improve semantic ambiguity without rewriting lifecycle core

Negative:

- two routing systems must be evaluated together
- some duplicate semantic criteria exist
- final behavior is more complex than either router alone
