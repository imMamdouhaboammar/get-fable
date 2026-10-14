# Fable Eco Testing and Quality Strategy

## 1. Development method

Implementation is test-first for resolver semantics, transaction behavior, configuration patching, schema validation, security boundaries, and recovery. Every production behavior introduced by a task has a focused failing test before implementation

## 2. Test layers

### Unit tests

Cover pure models and algorithms:
- manifest validation
- catalog merge precedence
- version selection
- dependency graph
- conflict evaluation
- profile expansion
- policy decisions
- enforcement grade calculation
- execution contract generation
- lock canonicalization
- redaction

### Property tests

Use generated inputs for:
- resolver determinism
- lock serialization round-trip
- no dependency cycle accepted
- no selected hard conflicts
- path normalization never escapes target root
- redaction never leaves known secret sentinel values
- plan topological ordering respects dependencies
- remove after install restores owned model state

### Golden fixtures

Version-controlled fixtures for:
- machine discovery snapshots
- official catalog manifests
- install plans
- JSON CLI envelopes
- host config before/after pairs
- locks
- receipts
- execution contracts

Golden updates require explicit review

### Integration tests

Run fake package managers and local HTTP fixture servers so tests do not depend on public internet. Simulate GitHub release metadata, redirects, wrong checksums, missing assets, timeouts, and prereleases

### End-to-end tests

Use clean temporary home directories. Exercise native CLI from discovery through install, host patch, health, status, repair, remove, and recovery

## 3. Fault injection matrix

Inject failure after each transaction stage:
- after journal open
- during download
- after stage verification
- after first package install
- after host patch write
- before health check
- during health check
- after inventory write before lock write
- after lock write before journal close
- during rollback

Every point has a defined expected next invocation behavior

## 4. Filesystem adversarial tests

- target is symlink
- target becomes symlink between plan and apply where detectable
- target is FIFO or directory when file expected
- temp file already exists
- config file unreadable
- config file changes after plan
- path case differences on case-insensitive platform
- archive traversal
- archive symlink escape
- archive oversized expansion

## 5. Cross-platform CI

Required stable matrix:
- macOS arm64 runner or equivalent dedicated qualification
- macOS x86_64 when supported by CI capacity
- Ubuntu x86_64
- Linux arm64 qualification job or dedicated environment
- Windows x86_64 before Windows support leaves beta

CI jobs use fixtures for third-party tools. A separate scheduled qualification workflow may test real upstream integration against pinned versions

## 6. Official capability contract tests

Every stable catalog capability has tests for:
- manifest schema
- platform map
- version metadata fixture
- install plan
- idempotent reinstall
- health check parse
- removal
- host binding where supported
- execution contract inclusion
- permission policy
- fallback or explicit no-fallback behavior

## 7. Host adapter tests

Per host:
- absent host
- detected host
- malformed version output
- config absent
- config populated
- config malformed
- duplicate prior entry
- user edit after Eco patch
- repeated patch
- repeated removal
- read-only config
- crash recovery receipt

## 8. Performance benchmarks

Criterion-style Rust benchmarks or deterministic timing harnesses cover:
- catalog parse for 250 and 1,000 entries
- resolver for 250 entries and 50 installed
- lock serialization
- runtime planner
- doctor inventory reconciliation

Performance regression threshold in CI should be broad enough to avoid flaky shared-runner failures but alert on 2x or larger regression in deterministic benchmark work units

## 9. Fuzzing

Fuzz targets:
- TOML manifest parser wrapper
- JSON state and lock parser
- archive entry path sanitizer
- host text-block patcher
- semver/source metadata normalization

## 10. Security tests

Security suite is a separate named CI job and includes all cases in `08-security-supply-chain.md`

## 11. Mutation testing

For resolver, policy, and transaction state machine modules, mutation testing is recommended before stable release. Minimum requirement is manual seeded fault tests if mutation tooling is impractical in CI

## 12. Release verification command

Add one aggregate command or CI target that executes:

```text
cargo fmt --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo test --workspace
bun run typecheck
bun test
bun run build
catalog schema validation
fixture/golden validation
security test suite
```

Existing get-fable checks remain required. Eco does not replace them
