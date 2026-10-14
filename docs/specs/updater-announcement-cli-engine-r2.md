# Updater, Passive Update Check, Announcement, and CLI Engine Spec R2

Status: Proposed implementation contract

Baseline commit: `34442acfbd18ba86bea3e0b5129be51c5c61aed0`

This revision updates the plan introduced by `docs/specs/updater-announcement-cli-engine.md` and `docs/superpowers/plans/2026-08-28-updater-announcement-cli-engine.md`. When this document conflicts with the original updater plan, this R2 document wins. Unchanged requirements from the original plan remain valid.

No production updater behavior is implemented by this document.

## 1. Intended outcome

Give get-fable users a predictable way to discover published updates, preview the exact action that would be taken, apply an update through the installation method they already own, verify the installed version afterward, and receive bounded data-only announcements without turning ordinary CLI execution into an unattended mutation path.

The first useful release of this work is a safe explicit updater. Passive notifications and announcements layer on only after the explicit path is proven.

## 2. Confirmed live baseline

The repository was re-inspected before this revision.

Confirmed on `master`:

- package and plugin metadata are at version `1.5.1`;
- GitHub Release `v1.5.1` is published;
- `src/core/updater.ts` still discovers the latest version from raw `master/package.json`;
- Git checkout updates still run `git pull --ff-only` followed by `bun run build`;
- every non-Git installation still updates through `bun install -g get-fable@latest`;
- the updater cache is still a single non-versioned `~/.fable/update-cache.json` file;
- `test/updater.test.ts` still contains basic numeric version cases and a live-network update metadata call;
- no `src/core/update/` implementation from the original plan exists yet;
- PR #26 merged the original plan before four P1 review findings were resolved.

## 3. Review findings this revision must resolve

### R2-F1: Passive checks cannot mutate

The original plan allowed configured automatic installation to flow from a passive check during an ordinary interactive CLI command. That conflicts with the passive-check contract.

Decision:

- passive checks are permanently notification-only within this scope;
- passive execution may fetch bounded metadata, read/write update cache state, and print an interactive notification;
- passive execution may never install a package, run Git update commands, rebuild, or invoke the update executor;
- unattended automatic installation is removed from the current implementation scope;
- any future unattended mutation requires a separate approved design that defines its trigger, scheduler/daemon ownership, consent model, failure recovery, and audit behavior.

### R2-F2: Announcement acquisition was undefined

The original plan described validation and display but did not define how a running CLI receives new announcements.

Decision:

Use one fixed repository-controlled data source:

```text
https://raw.githubusercontent.com/imMamdouhaboammar/get-fable/master/public/announcements.json
```

The feed is data only. It is not a software update source and cannot override package versions or execution plans.

Acquisition contract:

- HTTPS only;
- exact configured host and path only;
- `redirect: "error"`;
- 2500 ms default timeout;
- maximum response size 128 KiB;
- maximum 250 announcement records;
- injected fetch function for tests;
- schema validation before cache replacement;
- valid cache TTL: 6 hours;
- stale validated cache may be used for display for up to 7 days when the network fails;
- if no valid cache exists and acquisition fails, passive behavior is silent and explicit refresh returns a structured non-zero result;
- malformed or oversized remote content never replaces the last valid cache;
- announcement cache and release cache are separate records.

### R2-F3: Exact Bun target must be pinned

An update plan containing `targetVersion` must execute that target, not whichever version becomes latest after planning.

Decision for Bun global installs:

```bash
bun add -g get-fable@<targetVersion>
```

Current Bun documentation supports global package installation together with an explicit version operand. The executor must use the exact version from the validated plan.

Decision for npm global installs:

```bash
npm install -g get-fable@<targetVersion>
```

Homebrew and Git checkout strategies do not pretend to support an arbitrary `--version` in the minimum useful version. If the requested target cannot be represented safely by that installation method, planning returns `notify-only` / unsupported-target metadata without mutation.

### R2-F4: Lock ownership must be stronger than age

Age alone cannot make a lock stale because a legitimate package update, Homebrew operation, build, or Git verification may exceed an arbitrary threshold.

Decision:

Each lock record contains:

```ts
export interface UpdateLockRecord {
  schemaVersion: 1;
  token: string;
  pid: number;
  acquiredAt: string;
  targetVersion: string;
  installationMethod: InstallationMethod;
}
```

Rules:

- acquisition uses an atomic exclusive create;
- `token` is generated per acquisition and is the ownership identity;
- a lock whose owner process is confirmed alive is never replaced because of age;
- `process.kill(pid, 0)` may be used as the default process-existence probe through an injected `isProcessAlive` adapter;
- a lock whose process is confirmed absent may be reclaimed;
- an indeterminate liveness result blocks automatic reclaim and reports recovery guidance;
- release re-reads the lock and unlinks it only if the stored token still matches the caller token;
- a process can never delete a replacement lock owned by another updater;
- manual force-recovery, if later added, must be explicit and is not part of passive behavior.

## 4. Users and jobs

### CLI user with a global package installation

Job:

- know whether a published update exists;
- inspect what get-fable will execute;
- update through Bun or npm without changing package-manager ownership;
- know that the active binary is actually the requested version afterward.

### Homebrew user

Job:

- receive update status without get-fable silently creating a Bun/npm install;
- use the Homebrew-owned path for updates;
- receive a clear unsupported-target result when an arbitrary version cannot be represented safely.

### Git checkout user or contributor

Job:

- update a source checkout without losing local work;
- reject dirty/non-fast-forward unsafe paths before mutation;
- reconcile dependencies when lockfile/package inputs changed;
- verify the CLI/build after the source moves.

### CI or machine caller

Job:

- get deterministic JSON/stdout;
- avoid passive network calls, notices, and mutation;
- explicitly request update status when needed.

### Release maintainer

Job:

- publish a release whose package version, GitHub release, and Homebrew source are internally consistent;
- avoid mutable `master.tar.gz` formula sources;
- have a testable distribution contract before advertising the updater.

### Announcement maintainer

Job:

- publish short operational, security, deprecation, or release notices without shipping executable content;
- target notices by installed version and time window;
- let clients cache and dismiss notices safely.

## 5. Confirmed decisions vs deliberately deferred decisions

### Confirmed

- npm `latest` dist-tag is the stable package-version authority;
- GitHub Releases enrich matching release metadata but do not override npm stable truth;
- use Bun's built-in SemVer API rather than add a runtime SemVer dependency;
- preserve installation ownership across `bun-global`, `npm-global`, `homebrew`, `git-checkout`, and `unknown`;
- ambiguous installation evidence resolves to `unknown`;
- `get-fable update` and `get-fable update --check` remain compatible;
- passive checks are notification-only and are suppressed for CI, non-TTY, `--json`, and `--json-v1` paths;
- announcement data cannot contain executable command surfaces;
- Homebrew source must be an immutable version/tag artifact with SHA-256;
- all network/process/time dependencies used by updater tests are injectable;
- implementation is test-first and split into independently reviewable changes.

### Deferred, not blockers for the minimum useful version

- unattended automatic installation;
- daemon, cron, launch-agent, scheduled task, or OS service integration;
- arbitrary-version Homebrew installation;
- arbitrary-version Git source checkout switching;
- cryptographic signing of the announcement feed beyond HTTPS/repository control;
- multi-channel `next` or `dev` update application.

## 6. Scope boundaries

### In scope

- npm stable release discovery;
- matching GitHub Release metadata enrichment;
- Bun SemVer ordering;
- schema-versioned atomic release cache;
- install-method detection;
- pure update planning;
- exact-target Bun/npm execution;
- Homebrew-owned latest update execution;
- Git-checkout update strategy;
- owner-token process lock;
- post-update active-version verification;
- backward-compatible update CLI;
- passive notification-only checks;
- remote announcement acquisition, validation, cache, targeting, dismissal, and CLI display;
- immutable Homebrew release source and checksum;
- deterministic tests and release-gate documentation.

### Out of scope

- unattended package installation;
- arbitrary remote commands;
- self-modifying skills outside normal package/release distribution;
- replacing Bun as the runtime;
- rewriting the entire CLI router;
- changing canonical lifecycle/router/hook semantics;
- a new backend or database service;
- telemetry work unrelated to local update/announcement state.

## 7. Capabilities

### C1. Release intelligence

Input:

- current installed version;
- update channel `stable` for the minimum useful version;
- injected fetch/clock/cache adapters.

Output:

```ts
export interface ReleaseMetadata {
  version: string;
  channel: 'stable';
  source: 'npm';
  checkedAt: string;
  publishedAt?: string;
  releaseUrl?: string;
  notesUrl?: string;
  integrity?: string;
}
```

Stable version is read from npm metadata/dist-tags. GitHub lookup failure cannot turn a successful npm stable lookup into a false no-update result.

### C2. Installation ownership detection

```ts
export type InstallationMethod =
  | 'bun-global'
  | 'npm-global'
  | 'homebrew'
  | 'git-checkout'
  | 'unknown';
```

Detection is evidence-based, read-only, and returns evidence strings. Conflicting package-manager ownership resolves to `unknown`.

### C3. Pure update planner

The planner receives release metadata, requested target, installation info, and invocation intent. It returns structured data only.

```ts
export interface UpdatePlan {
  currentVersion: string;
  targetVersion: string;
  installation: InstallationInfo;
  strategy: InstallationMethod | 'notify-only';
  executable?: string;
  argv?: string[];
  requiresConfirmation: boolean;
  reason: string;
}
```

Minimum strategy rules:

```text
bun-global + supported target -> bun add -g get-fable@<target>
npm-global + supported target -> npm install -g get-fable@<target>
homebrew + latest stable -> brew upgrade get-fable
git-checkout + normal update -> guarded source update
unknown -> notify-only
unsupported arbitrary target -> notify-only
```

### C4. Explicit update executor

The executor accepts only a validated plan.

Execution order:

```text
acquire owner-token lock
preflight strategy
execute exact argv without shell interpolation
post-update version verification
write structured receipt
release only the owned lock token
```

A command exit code of zero is not sufficient success evidence. The active CLI/package version must match the expected target where exact target semantics apply.

### C5. Git checkout strategy

Before mutation:

- verify `.git` checkout;
- verify clean tracked/untracked policy as defined by tests;
- verify current branch/upstream;
- fetch before calculating the update;
- reject non-fast-forward movement.

After movement:

- if dependency inputs changed, run `bun install --frozen-lockfile`;
- run the narrow build/runtime checks required by the changed path;
- verify the resulting get-fable version;
- on post-move failure, report the previous commit and deterministic recovery command; do not hide that the checkout already moved.

### C6. Passive update notification

Allowed side effects:

- bounded release metadata request;
- bounded announcement request when stale;
- atomic cache/state writes;
- interactive notification output.

Forbidden side effects:

- package installation;
- `git pull`, merge, checkout, reset, or build;
- invocation of update executor;
- stdout contamination in machine-output paths.

### C7. Announcement engine

Feed schema:

```ts
export interface AnnouncementFeed {
  schemaVersion: 1;
  generatedAt: string;
  announcements: Announcement[];
}

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

Validation rejects fields named or shaped as executable/script/shell/command/args/hook/code payloads.

Client state records seen and dismissed IDs separately from the fetched feed.

## 8. Minimum useful version

The minimum useful version is complete after milestones M1 through M4 below.

It must provide:

1. deterministic stable release discovery with no live-network tests;
2. install ownership detection;
3. pure status/plan output;
4. owner-token locking;
5. exact-target Bun/npm update execution;
6. Homebrew and Git strategies that fail closed when requested behavior cannot be represented safely;
7. post-update verification;
8. compatible `get-fable update` and `get-fable update --check` behavior;
9. JSON-safe CLI output.

Passive checks and announcements are intentionally not required for the MUV. They depend on the explicit updater being trustworthy first.

## 9. Milestones

### M0. Planning correction

Deliverables:

- this R2 spec;
- R2 executable implementation plan;
- explicit mapping of all four unresolved P1 findings to acceptance tests.

No product implementation.

### M1. Release intelligence and deterministic cache

Deliverables:

- shared update types;
- npm stable release source;
- optional GitHub Release enrichment;
- Bun SemVer comparison;
- schema-versioned atomic release cache;
- no live-network updater unit test.

### M2. Installation detector and pure planner

Deliverables:

- five-method ownership detection;
- ambiguity -> `unknown`;
- exact-target package-manager argv;
- unsupported-target plans fail closed;
- no mutation from planner tests.

### M3. Owner-token lock, executor, and post-verification

Deliverables:

- exclusive lock acquisition;
- process-liveness adapter;
- dead-owner reclaim only;
- token-checked release;
- exact argv executor;
- installed-version verification;
- structured receipts.

### M4. Git strategy and backward-compatible CLI

Deliverables:

- guarded Git checkout update;
- dependency reconciliation;
- `update`, `update --check`, `update status`, `update plan`, `update apply`, JSON behavior;
- MUV repository gate.

### M5. Passive notification-only checks

Deliverables:

- invocation-context suppression;
- cache interval policy;
- interactive update notice;
- hard assertion that passive path cannot call executor/process mutators.

### M6. Remote announcement acquisition and CLI

Deliverables:

- fixed feed URL;
- bounded acquisition;
- strict schema;
- feed cache and stale fallback;
- targeting, seen/dismiss state;
- `announcements list/show/dismiss/refresh`;
- passive display obeying machine-output suppression.

### M7. Distribution and release hardening

Deliverables:

- immutable Homebrew source URL;
- matching SHA-256;
- release/package/formula consistency checks;
- docs and release checklist update.

### Future RFC. Unattended automatic installation

Not part of M0-M7. Requires a separate design and explicit approval.

## 10. Acceptance criteria

### Release and cache

AC-R2-01: npm `latest` is authoritative even when repository `master/package.json` contains another version.

AC-R2-02: GitHub Release enrichment failure does not overwrite or invalidate a valid npm stable result.

AC-R2-03: stable/prerelease comparison uses Bun SemVer semantics and rejects invalid version input instead of coercing it to zeroes.

AC-R2-04: release cache has a schema version, freshness timestamp, atomic replacement, and corrupted-cache fallback.

### Installation and planning

AC-R2-05: deterministic fixtures classify Bun global, npm global, Homebrew, Git checkout, and unknown.

AC-R2-06: conflicting ownership evidence returns `unknown` and produces no mutation plan.

AC-R2-07: Bun global exact-target plan contains `bun add -g get-fable@<targetVersion>`.

AC-R2-08: npm global exact-target plan contains `npm install -g get-fable@<targetVersion>`.

AC-R2-09: Homebrew/Git arbitrary target requests that are not safely representable return a structured unsupported/notify-only plan.

### Lock and execution

AC-R2-10: a lock held by a confirmed-live process is never replaced because of elapsed time.

AC-R2-11: a lock whose owner is confirmed absent may be reclaimed.

AC-R2-12: indeterminate liveness blocks automatic reclaim.

AC-R2-13: lock release removes the file only when the caller token matches the stored token.

AC-R2-14: a prior updater cannot unlink a replacement lock created by another owner.

AC-R2-15: executor uses executable + argv arrays without shell interpolation.

AC-R2-16: successful process exit followed by version mismatch is reported as update failure.

### Git and CLI

AC-R2-17: dirty, no-upstream, and non-fast-forward Git cases reject mutation before moving the checkout.

AC-R2-18: dependency reconciliation runs when planned dependency inputs changed.

AC-R2-19: `get-fable update` and `get-fable update --check` remain compatible and route through the new implementation.

AC-R2-20: JSON/JSON-v1 output contains no passive notices or log prefixes on stdout.

### Passive behavior

AC-R2-21: passive check code has no reachable executor/package-manager/Git/build mutation path.

AC-R2-22: CI, non-TTY, JSON, JSON-v1, and fresh-cache invocations skip passive network notification work according to policy.

AC-R2-23: ordinary interactive passive checks may write metadata cache and print a notice but cannot apply an update.

### Announcements

AC-R2-24: announcement acquisition uses only the configured HTTPS URL, rejects redirects, enforces timeout and size bounds, and is injectable in tests.

AC-R2-25: malformed, oversized, or executable-shaped feed content is rejected and does not replace the last valid cache.

AC-R2-26: network failure uses a validated cache only within the allowed stale-display window; otherwise passive behavior is silent.

AC-R2-27: explicit announcement refresh reports acquisition failure with a structured non-zero result when no valid cache is available.

AC-R2-28: version/time targeting and `once`, `until-dismissed`, and `always` display modes are deterministic.

### Distribution

AC-R2-29: Homebrew formula URL is immutable for its declared version and includes a matching SHA-256.

AC-R2-30: release gate verifies package version, release tag/version, and formula version/source consistency before updater capability is advertised.

## 11. Required deterministic test matrix

Tests must inject network, process runner, clock, filesystem root where practical, and process-liveness probe.

Required scenarios:

```text
release source
- npm success
- npm timeout
- npm non-2xx
- malformed npm metadata
- GitHub enrichment success/failure
- cached fallback
- invalid/prerelease versions

installation detector
- bun global
- npm global
- homebrew
- git checkout
- conflicting ownership
- unknown

planner
- exact Bun target
- exact npm target
- Homebrew latest
- unsupported Homebrew version
- Git update
- unsupported Git version
- unknown -> notify-only

lock
- no existing lock
- live young owner
- live old owner
- dead owner
- indeterminate owner
- token mismatch on release
- old owner release after replacement

executor
- exact argv per strategy
- command failure
- post-version success
- post-version mismatch
- lock always released only by owner

passive policy
- interactive stale cache
- interactive fresh cache
- CI
- non-TTY
- JSON
- JSON-v1
- assertion that executor runner is never called

announcements
- success
- timeout
- redirect
- oversized body
- invalid schema
- executable-shaped field
- fresh cache
- stale allowed cache
- too-old cache
- version/time targeting
- seen/dismissed state
```

## 12. Repository verification gates

After each implementation slice, run the narrowest changed tests first.

Before each PR is considered complete:

```bash
bun run typecheck
bun test
bun run build
bun run check
npm pack --dry-run --ignore-scripts --json
```

When formula/release files are changed:

```bash
ruby -c Formula/get-fable.rb
```

A test command is evidence only when it was actually executed against the final mutation generation.

## 13. Risks and controls

| Risk | Consequence | Control |
| --- | --- | --- |
| wrong package ownership classification | duplicate install or PATH shadowing | ambiguity resolves to `unknown`; evidence surfaced in plan |
| registry version changes after planning | different version installed than previewed | exact target pinned in Bun/npm argv |
| long-running updater mistaken for stale | concurrent mutation | process liveness, token ownership, no age-only reclaim |
| PID reuse | wrong stale-lock decision | token prevents release collision; liveness is only one reclaim input and uncertain state blocks |
| compromised/malformed announcement feed | misleading or dangerous content | data-only schema, executable-field rejection, fixed HTTPS source, size/time bounds |
| announcement endpoint outage | CLI slowdown/noise | short timeout, cache TTL, silent passive failure |
| passive check mutates unexpectedly | surprising user changes | executor unreachable from passive path; mutation spy test |
| Git update moves then build fails | partially updated checkout | preflight, previous SHA receipt, deterministic recovery guidance |
| Homebrew formula drifts from release | non-reproducible install | immutable source, checksum, release consistency gate |
| machine output pollution | broken scripts | passive suppression and JSON stdout tests |

## 14. Rollout and rollback

Rollout order follows M1 through M7. Do not enable passive checks before the explicit updater MUV is green.

Each milestone is separately revertible. `src/core/updater.ts` remains the compatibility facade until M4 proves the new path and existing CLI behavior.

If a new update subsystem milestone regresses behavior:

1. disable or revert the new call site while preserving the previous explicit command;
2. keep cache schema readers tolerant of missing/newer records;
3. never recover by silently switching a user's package manager;
4. do not enable the next milestone until the affected acceptance tests and repository gate are green again.

## 15. Implementation authorization gate

This revision makes the plan coherent enough for review. It does not itself authorize production implementation.

Implementation should begin with M1 only after this R2 plan is reviewed. Each later milestone starts from the current live repository state and must re-check that earlier work has not already implemented its capability.