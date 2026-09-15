# Fable Eco Master Task Backlog

Legend:
- Priority: P0 release/security blocker, P1 required V1, P2 important follow-up, P3 optional
- Readiness: READY means dependencies are already identified in this plan, BLOCKED means another task must land first
- Effort: S, M, L, XL

## Epic E0: Architecture contracts

### ECO-001 Add `crates/fable-eco` workspace member
Priority: P0 | Effort: S | Readiness: READY
Acceptance:
- workspace builds
- crate exposes schema version and typed error
- no behavior moved out of `fable-core`
Depends on: none

### ECO-002 Define capability identity and manifest Rust types
Priority: P0 | Effort: M | Readiness: BLOCKED
Acceptance:
- canonical `<namespace>/<name>` IDs validate
- kinds, permissions, support tiers, conflicts are typed enums
- TOML round-trip fixtures pass
Depends on: ECO-001

### ECO-003 Add canonical Eco schemas
Priority: P0 | Effort: M | Readiness: BLOCKED
Acceptance:
- capability, profile, policy, lock, plan, contract schemas committed
- valid fixtures pass and malformed fixtures fail
Depends on: ECO-002

### ECO-004 Implement semantic manifest validator
Priority: P0 | Effort: M | Readiness: BLOCKED
Acceptance:
- self-dependencies and self-conflicts rejected
- unknown official driver rejected
- mutable stable revision rejected
- source scheme allowlist enforced
Depends on: ECO-002, ECO-003

### ECO-005 Add catalog loader and deterministic merge
Priority: P0 | Effort: M | Readiness: BLOCKED
Acceptance:
- catalog file order cannot change result
- duplicate ID and illegal official source override fail
- catalog digest is deterministic
Depends on: ECO-004

### ECO-006 Add curated profile model
Priority: P1 | Effort: M | Readiness: BLOCKED
Acceptance:
- profile expansion detects cycles
- experimental entries excluded unless requested
- missing IDs are explicit errors
Depends on: ECO-005

### ECO-007 Add canonical `skills/fable-eco/SKILL.md`
Priority: P1 | Effort: M | Readiness: BLOCKED
Acceptance:
- registry validates
- generated catalogs remain current
- skill scope does not replace canonical task router
Depends on: ECO-001

## Epic E1: Discovery and resolution

### ECO-010 Build typed machine-fact model
Priority: P0 | Effort: M | Readiness: BLOCKED
Acceptance:
- fact states preserve present/absent/unknown/error
- timeouts never become absence
Depends on: ECO-001

### ECO-011 Implement platform and runtime probes
Priority: P0 | Effort: L | Readiness: BLOCKED
Acceptance:
- OS, arch, paths, Git, Bun, Rust, Python/uv and relevant package managers detectable
- all probes side-effect free and timeout bounded
Depends on: ECO-010

### ECO-012 Implement supported-host discovery
Priority: P1 | Effort: L | Readiness: BLOCKED
Acceptance:
- detected host version and config roots are facts, not assumptions
- unsupported/unknown mechanisms represented explicitly
Depends on: ECO-010

### ECO-013 Implement compatibility resolver
Priority: P0 | Effort: L | Readiness: BLOCKED
Acceptance:
- platform/runtime/policy incompatibility reason codes are stable
- deterministic output independent of manifest order
Depends on: ECO-005, ECO-010

### ECO-014 Implement required dependency graph resolver
Priority: P0 | Effort: L | Readiness: BLOCKED
Acceptance:
- required dependencies expand deterministically
- required cycles fail
- shared dependencies deduplicate
Depends on: ECO-013

### ECO-015 Implement conflict resolver
Priority: P0 | Effort: L | Readiness: BLOCKED
Acceptance:
- hard conflicts never survive selected set
- primary-provider conflicts select one configured provider
- context overlap remains installable but activation-bounded
Depends on: ECO-013

### ECO-016 Implement version metadata provider abstraction
Priority: P0 | Effort: M | Readiness: BLOCKED
Acceptance:
- tests use local fixtures
- resolver has no hard dependency on GitHub network
Depends on: ECO-005

### ECO-017 Implement immutable version resolver
Priority: P0 | Effort: L | Readiness: BLOCKED
Acceptance:
- drafts/prereleases filtered on stable channel
- exact pins respected
- mutable branches cannot become committed stable revisions
- package registry identity is explicit
Depends on: ECO-016

### ECO-018 Implement metadata cache and offline mode
Priority: P1 | Effort: M | Readiness: BLOCKED
Acceptance:
- offline makes zero network requests
- stale metadata is reported
- cache metadata includes source and response digest
Depends on: ECO-016

## Epic E2: Plan and transaction engine

### ECO-020 Define install operation DAG
Priority: P0 | Effort: M | Readiness: BLOCKED
Acceptance:
- plan operations have IDs, dependencies, reversibility class, targets, network and privilege facts
- cycles rejected
Depends on: ECO-014, ECO-015, ECO-017

### ECO-021 Implement deterministic plan builder
Priority: P0 | Effort: L | Readiness: BLOCKED
Acceptance:
- same inputs produce same logical plan
- health checks occur before commit operations
- plan generation has no mutation
Depends on: ECO-020

### ECO-022 Add exclusive Eco mutation lock
Priority: P0 | Effort: M | Readiness: READY after ECO-001
Acceptance:
- one mutating transaction per user state root
- bounded wait and clear lock-owner error
Depends on: ECO-001

### ECO-023 Implement write-ahead transaction journal
Priority: P0 | Effort: L | Readiness: BLOCKED
Acceptance:
- rollback data exists before visible mutation
- invalid transition rejected
- corrupted or foreign journal blocks mutation
Depends on: ECO-022

### ECO-024 Implement secure staging root
Priority: P0 | Effort: M | Readiness: BLOCKED
Acceptance:
- transaction-scoped
- exclusive temp creation
- no execution before verification
Depends on: ECO-023

### ECO-025 Implement content-addressed artifact cache
Priority: P0 | Effort: M | Readiness: BLOCKED
Acceptance:
- SHA-256 keyed bytes
- cached bytes reverified
- cache cleanup cannot escape root
Depends on: ECO-024

### ECO-026 Implement secure archive extraction
Priority: P0 | Effort: L | Readiness: BLOCKED
Acceptance:
- rejects traversal, absolute paths, unsafe links, device nodes, size bombs
Depends on: ECO-024

### ECO-027 Define allowlisted install-driver trait
Priority: P0 | Effort: M | Readiness: BLOCKED
Acceptance:
- official manifests cannot select unknown driver
- plan/apply/verify/rollback are separate interfaces
Depends on: ECO-020, ECO-023

### ECO-028 Implement `copy_skill` driver
Priority: P1 | Effort: M | Readiness: BLOCKED
Acceptance:
- exact ownership receipt
- atomic managed-file write
- idempotent install/remove
Depends on: ECO-027

### ECO-029 Implement GitHub release/binary driver
Priority: P1 | Effort: L | Readiness: BLOCKED
Acceptance:
- immutable release asset
- digest verification
- platform asset mapping tests
Depends on: ECO-025, ECO-026, ECO-027

### ECO-030 Implement exact Git revision driver
Priority: P1 | Effort: M | Readiness: BLOCKED
Acceptance:
- committed revision is SHA
- branch name never stored as resolved identity
Depends on: ECO-027

### ECO-031 Implement Bun/npm exact package driver
Priority: P1 | Effort: L | Readiness: BLOCKED
Acceptance:
- explicit registry/package identity
- exact version in argv
- fake package manager integration tests
Depends on: ECO-027

### ECO-032 Implement uv tool driver
Priority: P1 | Effort: L | Readiness: BLOCKED
Acceptance:
- exact source/version
- owned install prefix where supported
Depends on: ECO-027

### ECO-033 Implement Cargo package driver
Priority: P1 | Effort: L | Readiness: BLOCKED
Acceptance:
- exact crate identity/version/revision
- package-name collision tests
Depends on: ECO-027

### ECO-034 Implement health-check runner
Priority: P0 | Effort: M | Readiness: BLOCKED
Acceptance:
- no shell interpolation
- bounded timeout
- typed result parsing
Depends on: ECO-027

### ECO-035 Implement inventory and canonical lock writer
Priority: P0 | Effort: L | Readiness: BLOCKED
Acceptance:
- old committed state remains if health fails
- lock canonical ordering
- exact source revision and digest stored
Depends on: ECO-034

### ECO-036 Implement rollback engine
Priority: P0 | Effort: XL | Readiness: BLOCKED
Acceptance:
- reverse dependency order
- shared dependencies retained
- rollback verifies restored state
Depends on: ECO-023, ECO-027

### ECO-037 Implement crash recovery classifier
Priority: P0 | Effort: XL | Readiness: BLOCKED
Acceptance:
- completed commit can close stale journal
- safe rollback can proceed
- divergent state becomes RECOVERY_REQUIRED
Depends on: ECO-035, ECO-036

## Epic E3: Host integration and CLI

### ECO-040 Define host capability matrix
Priority: P0 | Effort: M | Readiness: BLOCKED
Acceptance:
- supported/unsupported/unknown states
- enforcement grade computed per integration objective
Depends on: ECO-012

### ECO-041 Implement ownership-aware config patch engine
Priority: P0 | Effort: XL | Readiness: BLOCKED
Acceptance:
- structural JSON patch ownership
- text managed block ownership
- precondition digest abort on concurrent edit
- remove preserves non-owned content
Depends on: ECO-023, ECO-040

### ECO-042 Qualify Host Adapter A
Priority: P1 | Effort: L | Readiness: BLOCKED
Acceptance:
- full matrix in `07-host-adapters.md` passes
Depends on: ECO-041

### ECO-043 Qualify Host Adapter B
Priority: P1 | Effort: L | Readiness: BLOCKED
Acceptance:
- full matrix in `07-host-adapters.md` passes
Depends on: ECO-041

### ECO-044 Add native `eco` read-only CLI
Priority: P1 | Effort: M | Readiness: BLOCKED
Acceptance:
- discover/catalog/profiles/plan/status commands
- stable JSON V1 output
Depends on: ECO-021

### ECO-045 Add stable Eco error codes and exit codes
Priority: P0 | Effort: M | Readiness: BLOCKED
Acceptance:
- errors map consistently in JSON and process exit
Depends on: ECO-044

### ECO-046 Add mutating CLI commands
Priority: P1 | Effort: L | Readiness: BLOCKED
Acceptance:
- install/update/remove/repair/recover
- same-invocation plan approval
- open journal blocks unrelated mutation
Depends on: ECO-037, ECO-045

### ECO-047 Build interactive selector state machine
Priority: P1 | Effort: L | Readiness: BLOCKED
Acceptance:
- select/toggle/filter/profile controls tested
- all-compatible excludes blocked and hard-conflicting selections
Depends on: ECO-013, ECO-015

### ECO-048 Build TUI rendering and non-TTY fallback
Priority: P1 | Effort: L | Readiness: BLOCKED
Acceptance:
- no-color
- 80-column
- numbered fallback
- no mutation before plan approval
Depends on: ECO-047

### ECO-049 Implement project bind/unbind
Priority: P1 | Effort: M | Readiness: BLOCKED
Acceptance:
- `.fable/eco.json` contains desired binding only
- missing machine capability yields suggestion, not implicit install
Depends on: ECO-006, ECO-035

### ECO-050 Add Bun native bridge
Priority: P1 | Effort: L | Readiness: BLOCKED
Acceptance:
- validates JSON version
- malformed native output fails safely
- TS does not duplicate resolver/policy logic
Depends on: ECO-044, ECO-045

## Epic E4: Capability runtime

### ECO-060 Define canonical routing input adapter
Priority: P0 | Effort: M | Readiness: BLOCKED
Acceptance:
- consumes minimal existing `RoutingDecision` fields
- existing router fixtures remain unchanged
Depends on: ECO-001

### ECO-061 Add playbook schema/parser
Priority: P0 | Effort: L | Readiness: BLOCKED
Acceptance:
- typed conditions only
- no arbitrary shell or expressions
- minimum enforcement grade represented
Depends on: ECO-003, ECO-060

### ECO-062 Implement runtime candidate filtering
Priority: P0 | Effort: L | Readiness: BLOCKED
Acceptance:
- installed, healthy, compatible, policy-allowed only
Depends on: ECO-040, ECO-061

### ECO-063 Implement minimal provider selection
Priority: P0 | Effort: L | Readiness: BLOCKED
Acceptance:
- minimal set
- local deterministic preferred when equivalent
- context-overlap not co-activated by default
Depends on: ECO-062

### ECO-064 Implement layered runtime policy
Priority: P0 | Effort: XL | Readiness: BLOCKED
Acceptance:
- deny by default
- project cannot override protected higher-layer deny
- security active-testing separately permissioned
Depends on: ECO-003

### ECO-065 Implement execution contract
Priority: P0 | Effort: L | Readiness: BLOCKED
Acceptance:
- schema valid
- includes route digest, versions, steps, grades, permissions, evidence, timeouts, fallbacks
Depends on: ECO-063, ECO-064

### ECO-066 Implement host exposure compiler
Priority: P1 | Effort: XL | Readiness: BLOCKED
Acceptance:
- only selected capability instructions/tools exposed
- advisory grade labeled
- permission and stop rules cannot disappear
Depends on: ECO-042 or ECO-043, ECO-065

### ECO-067 Implement structured capability result protocol
Priority: P0 | Effort: M | Readiness: BLOCKED
Acceptance:
- bounded inline output
- raw output digest
- mutation/network flags
Depends on: ECO-065

### ECO-068 Implement evidence adapter framework
Priority: P0 | Effort: XL | Readiness: BLOCKED
Acceptance:
- research cannot become verification
- security cannot close unrelated feature
- mutation freshness semantics preserved
Depends on: ECO-067

### ECO-069 Implement delegated agent provider contract
Priority: P1 | Effort: L | Readiness: BLOCKED
Acceptance:
- bounded subtask
- cannot mutate routing state directly
Depends on: ECO-065

### ECO-070 Add `eco explain-run`
Priority: P1 | Effort: M | Readiness: BLOCKED
Acceptance:
- selection reasons, alternatives, grade, permissions, evidence, fallbacks
- no hidden chain-of-thought
Depends on: ECO-065

## Epic E5: Doctor, security, quality, release

### ECO-080 Implement doctor state integrity checks
Priority: P0 | Effort: L | Readiness: BLOCKED
Acceptance:
- PASS/WARN/FAIL/BLOCKED
- checks journal, inventory, lock, receipts
Depends on: ECO-035, ECO-037

### ECO-081 Implement capability/host/project doctor checks
Priority: P1 | Effort: L | Readiness: BLOCKED
Acceptance:
- detects drift, missing capability, incompatible host, invalid binding
Depends on: ECO-041, ECO-049, ECO-080

### ECO-082 Implement safe repair plan
Priority: P0 | Effort: L | Readiness: BLOCKED
Acceptance:
- no version changes
- owned state only
- repair-plan is read-only
Depends on: ECO-081

### ECO-083 Add redacted structured local logs
Priority: P1 | Effort: M | Readiness: BLOCKED
Acceptance:
- no secret values
- rotating bounded log
Depends on: ECO-001

### ECO-084 Add support bundle
Priority: P1 | Effort: M | Readiness: BLOCKED
Acceptance:
- allowlist contents
- path normalization
- no source code, prompts, env values, credentials
Depends on: ECO-080, ECO-083

### ECO-085 Build adversarial security suite
Priority: P0 | Effort: XL | Readiness: BLOCKED
Acceptance:
- all threat cases in security spec automated
Depends on: ECO-026, ECO-041, ECO-064

### ECO-086 Add fuzz/property targets
Priority: P1 | Effort: L | Readiness: BLOCKED
Acceptance:
- manifest, state, archive path, text patch parsers covered
Depends on: ECO-004, ECO-026, ECO-041

### ECO-087 Add cross-platform CI matrix
Priority: P0 | Effort: L | Readiness: BLOCKED
Acceptance:
- macOS/Linux stable, Windows beta until qualified
- temporary HOME
Depends on: major E2 features

### ECO-088 Add performance benchmarks
Priority: P1 | Effort: M | Readiness: BLOCKED
Acceptance:
- 250/1000 catalog parse
- resolver, lock, runtime planner, doctor benchmarks
Depends on: ECO-063, ECO-080

### ECO-090 Qualify first stable capability set
Priority: P0 | Effort: XL | Readiness: BLOCKED
Acceptance per capability:
- source/license
- exact version strategy
- install/remove/health tests
- permissions/conflicts
- runtime role
- platform record
Depends on: ECO-029 through ECO-034, ECO-068

### ECO-091 Qualify optional/specialized capability set
Priority: P1 | Effort: XL | Readiness: BLOCKED
Acceptance: same as stable set plus specialized policy
Depends on: ECO-090

### ECO-092 Add release-channel gating
Priority: P0 | Effort: M | Readiness: BLOCKED
Acceptance:
- experimental/beta/stable behavior distinct
- stable catalog requires qualification record
Depends on: ECO-090

### ECO-093 Complete production acceptance matrix
Priority: P0 | Effort: XL | Readiness: BLOCKED
Acceptance:
- every checklist item in `15-production-acceptance.md` proven or explicitly removed from V1 by reviewed spec change
Depends on: all P0 V1 tasks
