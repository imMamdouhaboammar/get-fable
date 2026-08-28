# Updater, Auto-Update Check, Announcement, and CLI Engine Spec

Status: Proposed for implementation approval

This document defines the required behavior and architecture before production implementation begins. It intentionally contains no production code changes.

## Goal

Replace the current single-path updater with a package-manager-aware update subsystem that can discover published releases, plan updates without mutation, apply explicit updates safely, perform passive background checks without polluting automation, surface data-only announcements, and preserve the existing `get-fable update` user contract.

## Verified current state

The current repository behavior that constrains this design is:

- `package.json` is version `1.5.0`, Bun-first, and has no runtime dependencies.
- `src/core/updater.ts` currently:
  - reads `master/package.json` from GitHub to determine the latest version;
  - caches one `UpdateCheckResult` under `~/.fable/update-cache.json`;
  - updates Git checkouts with `git pull --ff-only` followed by `bun run build`;
  - updates every non-Git installation with `bun install -g get-fable@latest`.
- `src/cli.ts` already supports `get-fable update` and `get-fable update --check`.
- `test/updater.test.ts` covers basic version comparison and one live-network update metadata call, but not installer ownership, rollback/recovery, cache corruption, concurrency, or CLI suppression behavior.
- CI already runs generated-artifact checks, typecheck, Bun tests, coverage, build, CLI lifecycle smoke tests, and npm package inspection.
- `Formula/get-fable.rb` declares version `1.5.0` but downloads `master.tar.gz`, so the source is mutable while the formula version is fixed.
- GitHub Releases publish versioned assets with SHA-256 digests.

## Confirmed decisions

1. Stable published version truth comes from the npm registry `latest` dist-tag, not from the repository branch version.
2. GitHub Releases provide supplemental release metadata such as notes, published time, assets, and integrity information.
3. Update mutation must respect installation ownership. Supported detected methods are:
   - `bun-global`
   - `npm-global`
   - `homebrew`
   - `git-checkout`
   - `unknown`
4. Automatic behavior defaults to passive update checking and notification only.
5. Automatic installation is disabled by default and may only run after explicit opt-in policy is configured.
6. Announcement payloads are data-only. Remote announcement data must never become an executable command surface.
7. Existing `get-fable update` and `get-fable update --check` remain supported.
8. Passive checks must not add unsolicited output or mutation in CI, non-interactive sessions, `--json`, or `--json-v1` execution paths.
9. Homebrew distribution must move to an immutable tag/release source and checksum.
10. Behavior changes follow TDD and are delivered as small independently reviewable changes.

## In scope

- Stable release discovery from npm registry metadata
- Supplemental GitHub release metadata retrieval
- Strict version ordering using Bun's public `semver` API
- Schema-versioned update cache with TTL and atomic writes
- Installation ownership detection
- Pure update planning before mutation
- Explicit package-manager-aware update execution
- Git-checkout preflight and recovery behavior
- Cross-process update lock
- Post-update version verification
- Passive periodic update checks
- CLI update status/plan/apply/doctor/config surfaces
- Data-only announcement retrieval, validation, targeting, expiry, unread/dismissed state, and CLI presentation
- Backward-compatible update command aliases
- Opt-in automatic installation policy
- Homebrew release hardening
- Deterministic unit/integration tests with injected network/process/time dependencies
- Documentation for behavior, policy, and recovery

## Out of scope

- A daemon, background service, launch agent, cron job, or long-running updater process
- Self-modifying plugin or skill content outside the normal package/release update path
- Remote execution of commands contained in announcement feeds
- Automatic major-version installation by default
- Changing the canonical lifecycle semantics, router, hooks, state machine, or skill graph
- Replacing Bun as the project runtime
- Rewriting the whole CLI command router
- A custom package registry or release backend
- Telemetry changes unrelated to update/announcement state

## Selected architecture

The update path is separated into five responsibilities:

```text
Release Intelligence
        |
        v
Installation Detection -> Update Planner
                              |
                              v
                        Update Executor
                              |
                              v
                      Post-Update Verifier

Announcement Source -> Announcement Filter -> CLI Notification

Passive Check Policy controls when discovery/notification may run.
```

The existing `src/core/updater.ts` remains as a compatibility facade during migration so existing imports and CLI behavior do not break while focused modules move under `src/core/update/`.

### Why this shape

The current updater mixes discovery, installation detection, mutation, logging, cache, and verification in one module. Extending that function directly would make passive checks and multiple installation methods harder to test and easier to regress. Focused modules allow release discovery, planning, and execution to be independently tested while preserving the current CLI surface.

## Alternatives considered

### A. Extend the existing `src/core/updater.ts` in place

Gains:
- smallest initial diff;
- no module migration.

Costs:
- network, process execution, cache, policy, and CLI concerns remain coupled;
- difficult deterministic tests;
- installer-specific behavior becomes nested branching inside one function.

Decision: rejected for the complete feature because the requested scope spans multiple trust boundaries.

### B. Always update through Bun

Gains:
- simple command path;
- matches the current Bun-first runtime.

Costs:
- can replace or shadow npm/Homebrew-owned installations;
- does not preserve user-owned installation configuration.

Decision: rejected. The updater must preserve installation ownership.

### C. Add the npm `semver` runtime dependency

Gains:
- mature SemVer implementation.

Costs:
- introduces the first runtime dependency for behavior Bun already exposes.

Decision: rejected for now. Use `Bun.semver.order()` and `Bun.semver.satisfies()` where needed. Revisit only if Bun's API fails a required SemVer case in tests.

## Planned modules and responsibilities

### Existing files

- `src/core/updater.ts`
  - Compatibility facade
  - Re-export stable update APIs while implementation moves to focused modules
  - Preserve current call sites during staged migration

- `src/cli.ts`
  - Parse update/announcement subcommands
  - Reuse existing JSON helpers
  - Invoke passive check only from the top-level interactive path
  - Never own release or installer business logic

- `test/updater.test.ts`
  - Preserve compatibility behavior tests
  - Remove live-network dependence

- `Formula/get-fable.rb`
  - Use immutable release/tag source and SHA-256

- `.github/workflows/ci.yml`
  - Add only the narrow release/distribution assertions that are missing from the current gate

### New files

- `src/core/update/types.ts`
  - Shared `ReleaseMetadata`, `InstallationMethod`, `InstallationInfo`, `UpdateStatus`, `UpdatePlan`, `UpdatePolicy`, and result types

- `src/core/update/release-source.ts`
  - Fetch npm `latest` metadata
  - Optionally fetch matching GitHub Release metadata
  - No filesystem or process mutation

- `src/core/update/cache.ts`
  - Schema-versioned update/announcement cache state
  - TTL checks
  - atomic temp-write + rename
  - corrupted cache fallback

- `src/core/update/install-method.ts`
  - Detect installation ownership from executable path, repository state, package-manager prefixes, and Homebrew metadata
  - Return `unknown` rather than guessing

- `src/core/update/planner.ts`
  - Pure function from status + installation + policy to an `UpdatePlan`
  - No shell, filesystem mutation, or logging side effects

- `src/core/update/lock.ts`
  - Cross-process update lock with stale-lock handling

- `src/core/update/executor.ts`
  - Execute only an already validated `UpdatePlan`
  - Use executable + argv arrays rather than shell strings
  - Run package-manager-specific strategy
  - Emit structured receipts

- `src/core/update/git-strategy.ts`
  - Git-checkout-specific preflight, fast-forward, dependency reconciliation, build, verification, and recovery guidance

- `src/core/update/policy.ts`
  - Load/save passive-check and auto-install policy
  - Determine whether passive checks are allowed for the current invocation context

- `src/core/update/announcements.ts`
  - Fetch/validate data-only announcement feed
  - Filter by version/time
  - Track seen/dismissed IDs
  - No command execution fields

### New tests

- `test/update-release-source.test.ts`
- `test/update-cache.test.ts`
- `test/update-install-method.test.ts`
- `test/update-planner.test.ts`
- `test/update-executor.test.ts`
- `test/update-git-strategy.test.ts`
- `test/update-policy.test.ts`
- `test/announcements.test.ts`
- `test/update-cli.test.ts`
- `test/release-distribution.test.ts`

## Core contracts

### Release metadata

```ts
export type UpdateChannel = 'stable' | 'next' | 'dev';

export interface ReleaseMetadata {
  version: string;
  channel: UpdateChannel;
  source: 'npm';
  publishedAt?: string;
  releaseUrl?: string;
  notesUrl?: string;
  integrity?: string;
}
```

Stable discovery must treat the npm registry dist-tag as authoritative. A GitHub request may enrich metadata but must not override the published stable version.

### Installation ownership

```ts
export type InstallationMethod =
  | 'bun-global'
  | 'npm-global'
  | 'homebrew'
  | 'git-checkout'
  | 'unknown';

export interface InstallationInfo {
  method: InstallationMethod;
  executablePath: string;
  repoRoot?: string;
  packageRoot?: string;
  evidence: string[];
}
```

Detection must be evidence-based. Ambiguous evidence returns `unknown`.

### Update plan

```ts
export interface UpdatePlan {
  currentVersion: string;
  targetVersion: string;
  installation: InstallationInfo;
  strategy: 'bun-global' | 'npm-global' | 'homebrew' | 'git-checkout' | 'notify-only';
  executable?: string;
  argv?: string[];
  requiresConfirmation: boolean;
  allowedByPolicy: boolean;
  reason: string;
}
```

The planner is pure. It never executes the command it describes.

### Update policy

```ts
export interface UpdatePolicy {
  schemaVersion: 1;
  checkIntervalHours: number;
  autoCheck: boolean;
  autoInstall: 'off' | 'patch' | 'minor' | 'all';
}
```

Defaults:

```json
{
  "schemaVersion": 1,
  "checkIntervalHours": 24,
  "autoCheck": true,
  "autoInstall": "off"
}
```

### Announcement

```ts
export interface Announcement {
  id: string;
  type: 'release' | 'security' | 'deprecation' | 'breaking' | 'feature' | 'maintenance' | 'info';
  title: string;
  message: string;
  url?: string;
  minVersion?: string;
  maxVersion?: string;
  startsAt?: string;
  expiresAt?: string;
  display: 'once' | 'until-dismissed' | 'always';
}
```

The schema intentionally contains no executable, script, shell, command, args, hook, or code field.

## Passive check policy

A passive check may run only when all of the following are true:

- policy `autoCheck` is true;
- cached release data is stale;
- invocation is not using `--json` or `--json-v1`;
- process is not detected as CI;
- stdout is interactive;
- the current command is not itself an update/announcement machine-readable operation.

A passive check may perform bounded metadata network I/O and cache writes. It must not install, pull, rebuild, or otherwise mutate the installed package.

Explicit `get-fable update --check` remains allowed to perform a check in non-interactive contexts because the user explicitly requested it.

## CLI contract

Existing compatibility commands remain valid:

```bash
get-fable update
get-fable update --check
```

New canonical commands:

```bash
get-fable update status
get-fable update status --json
get-fable update plan
get-fable update plan --json
get-fable update apply
get-fable update apply --version <version>
get-fable update doctor
get-fable update config
get-fable update config --auto-check on|off
get-fable update config --auto-install off|patch|minor|all
get-fable update config --interval <hours>

get-fable announcements
get-fable announcements list
get-fable announcements list --unread
get-fable announcements show <id>
get-fable announcements dismiss <id>
```

Machine output must use the repository's existing `--json` / `--json-v1` convention and must not include log prefixes or passive-check notifications on stdout.

## Acceptance criteria

AC-01: Stable update discovery reports the npm `latest` dist-tag version even when `master/package.json` contains a different version.

AC-02: GitHub Release metadata may enrich a matching stable release but cannot make an unpublished repository version appear installable.

AC-03: Version ordering correctly handles stable and prerelease ordering through Bun's SemVer API.

AC-04: Cache reads tolerate missing/corrupted files; writes are atomic; stale cache is never silently treated as fresh.

AC-05: Installation detection distinguishes Bun global, npm global, Homebrew, Git checkout, and unknown from deterministic fixtures and returns `unknown` for ambiguity.

AC-06: Update planning is side-effect free and selects a strategy that matches installation ownership.

AC-07: `unknown` installation method never causes automatic mutation and produces a notify-only/manual recovery plan.

AC-08: Explicit update execution acquires a lock, validates the plan, executes without shell interpolation, and verifies the installed version afterward.

AC-09: A second concurrent updater cannot mutate while a valid lock is held; stale lock recovery is bounded and tested.

AC-10: Git checkout update refuses a dirty workspace, requires a valid upstream/fast-forward path, reconciles locked dependencies when required, runs build verification, and provides deterministic recovery guidance on failure.

AC-11: Passive checks default on, auto-install defaults off, and passive behavior never mutates the installation.

AC-12: Passive checks produce no unsolicited stdout in CI, non-interactive, `--json`, or `--json-v1` paths.

AC-13: Announcement validation rejects executable fields, invalid schema, expired entries, and invalid version bounds; display state supports once/until-dismissed/always.

AC-14: Existing `get-fable update` and `get-fable update --check` continue to exit successfully under their existing valid cases and route through the new engine.

AC-15: Opt-in auto-install obeys configured patch/minor/all policy and still respects installation ownership, locking, and post-update verification.

AC-16: Homebrew formula source is immutable for the declared version and includes a matching SHA-256.

AC-17: Every implementation PR passes its targeted tests before the full repository gate.

## Test strategy

All update-network/process/time behavior must be injectable in tests. Unit tests must not depend on live GitHub/npm availability.

Required coverage:

- npm registry success, timeout, HTTP error, malformed metadata, and cache fallback
- GitHub metadata enrichment failure without stable-version failure
- SemVer stable/prerelease cases
- cache missing/corrupted/stale/fresh/concurrent write cases
- installation fixture matrix for all five methods
- planner strategy matrix and no-side-effect assertion
- executor success/failure/lock/post-version mismatch
- Git dirty tree, no upstream, non-fast-forward, dependency-change, build-failure, and successful verification
- passive policy in TTY, CI, non-TTY, JSON, explicit-check, fresh-cache, and stale-cache contexts
- announcement schema, executable-field rejection, version targeting, time targeting, dedupe, dismissal, and cache corruption
- legacy and new CLI command paths
- Homebrew URL/version/checksum contract

Repository gates after targeted tests:

```bash
bun run typecheck
bun test
bun run build
bun run check
npm pack --dry-run --ignore-scripts --json
ruby -c Formula/get-fable.rb
```

## Dependency graph and delivery order

```text
Release contracts/cache
        |
        +------> Announcements
        |
        v
Install detection -> Planner -> Executor -> Git strategy
        |                         |
        +------------+------------+
                     v
             Passive check + CLI
                     |
                     v
             Opt-in auto-install

Release/Homebrew hardening can begin after contracts are stable and must land before the first release that claims the new updater.
```

## Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Wrong install-method detection | Updates wrong package location | Evidence list, ambiguity -> `unknown`, fixture matrix |
| Registry unavailable | False no-update or CLI delay | timeout, TTL cache, explicit stale state, no hard failure for passive checks |
| Concurrent updater processes | Corrupted install/cache | cross-process lock + atomic writes |
| Git update partially succeeds then build fails | checkout is changed but unusable | clean-tree preflight, record previous revision, dependency reconciliation, recovery instructions, post-build verification |
| Passive check breaks scripts | machine consumers regress | suppress passive output in CI/non-TTY/JSON; test stdout |
| Announcement feed becomes command channel | remote execution risk | schema excludes executable fields; strict validation; rendering only |
| Auto-install surprises users | trust/config regression | default `off`; explicit config required; ownership-aware strategy |
| Homebrew mutable source | unreproducible package | tag/release URL + SHA-256 |
| CLI refactor expands blast radius | unrelated command regressions | keep `src/cli.ts` routing model, add narrow handlers, CLI smoke tests |
| Network tests become flaky | unreliable CI | dependency injection and local fixtures |

## Failure and recovery rules

- Metadata discovery failure during passive checks is non-fatal and silent except when the user explicitly runs an update diagnostic command.
- Explicit update discovery failure returns non-zero only when the requested operation cannot be safely planned/applied.
- Package-manager update failure records the executable, argv, exit status, and bounded stderr/stdout in the result; it does not retry with a different package manager.
- Post-update version mismatch is a failure even if the package-manager command exited zero.
- Git update never discards user changes.
- Unknown installation ownership never triggers mutation.
- Announcement fetch/parse failure never blocks normal get-fable commands.

## Rollout

1. Land deterministic release/cache infrastructure behind current explicit update behavior.
2. Add install detection and pure planning without changing default mutation behavior.
3. Move explicit update execution to package-manager-aware strategies.
4. Add announcement engine independently.
5. Add passive update notification with strict suppression rules.
6. Add opt-in auto-install policy after explicit updater behavior is stable.
7. Harden Homebrew/release distribution before shipping the first version that advertises the complete engine.

## Rollback

Each implementation PR must remain independently revertible. `src/core/updater.ts` stays as a compatibility facade until the final migration is proven. Passive auto-check and auto-install have configuration kill switches. Announcement failure is isolated from command execution.

## Approval gate

Implementation must not begin until this spec and its companion implementation plan are reviewed and accepted. Any change to release authority, supported installation methods, auto-install defaults, remote announcement trust boundary, or legacy CLI compatibility requires updating this spec before implementation continues.
