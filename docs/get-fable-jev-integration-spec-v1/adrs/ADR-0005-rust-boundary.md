# ADR-0005: Keep provider inference outside Rust fable-core

Status: Accepted

## Decision

Rust remains deterministic/offline. Jev runs in the TypeScript/Bun integration layer. If needed later, Rust may receive normalized advice as data and implement the same pure fusion rules, but it will not own provider networking in v1.
