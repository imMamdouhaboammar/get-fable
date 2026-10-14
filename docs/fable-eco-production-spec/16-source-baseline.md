# Source Baseline Used for This Planning Pack

The planning pack was aligned to the current get-fable repository structure inspected on 2026-09-15

Observed baseline characteristics:
- package version 1.9.0
- Bun-based package and existing CLI/build/test workflow
- Rust workspace already contains `crates/fable-core` and `crates/fable-cli`
- current Rust core already contains router, registry, state, types, and heal modules
- get-fable architecture already defines deterministic routing, canonical skill registry, durable state, typed evidence, mutation-aware verification, and host adapters
- root package already distributes multiple host plugin formats and skill packs

The proposed `fable-eco` architecture intentionally extends these existing boundaries instead of replacing them

Implementation agents must re-read the current repository immediately before changing files because the repository may advance after this pack was generated
