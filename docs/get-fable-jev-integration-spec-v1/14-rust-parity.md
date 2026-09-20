# Rust parity and native boundary

## Decision

Jev does not enter `fable-core` Rust in v1.

The Rust engine remains the deterministic, offline, canonical routing implementation.

## Why

- current parity is a valuable invariant
- Jev is a network/provider concern
- no official Rust SDK is required for this integration
- putting network inference inside native core would contaminate deterministic tests and offline use
- TypeScript already owns host/provider integration surfaces

## New parity definition

Existing parity remains:

```text
TypeScript deterministic route == Rust deterministic route
```

New hybrid behavior is tested separately:

```text
Deterministic core decision
+ normalized ReflexAdvice fixture
+ same pure fusion policy
= expected final resolution
```

## Future option

If hybrid authority proves materially useful, the pure fusion policy can be ported to Rust while Jev advice arrives as an external typed input. Rust still does not need to perform the network call.

Possible future native API:

```rust
fn fuse_route(
    deterministic: RoutingDecision,
    policy: HardPolicy,
    advice: Option<ReflexAdvice>,
    mode: ReflexMode,
) -> RouteResolution
```

This preserves provider independence.
