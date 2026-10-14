# Updater, Passive Check, Announcement, and CLI Engine R2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace get-fable's current single-path updater with a safe explicit update engine first, then add non-mutating passive notifications, remote data-only announcements, and release/distribution hardening without changing installation ownership.

**Architecture:** Keep `src/core/updater.ts` as a compatibility facade while moving focused behavior into `src/core/update/`. Release discovery, installation detection, planning, locking/execution, passive policy, and announcements stay separate so each can be tested without live network or process mutation. Passive code is notification-only in this scope and cannot call the executor.

**Tech Stack:** Bun 1.3+, TypeScript, Bun test runner, Node built-ins, npm registry metadata, GitHub Release metadata, Git CLI, Bun/npm/Homebrew CLIs.

**Spec:** `docs/specs/updater-announcement-cli-engine-r2.md`

## Global Constraints

- Re-inspect live `master` before every PR and skip behavior already implemented.
- Baseline for this plan is `master` at or after `34442acfbd18ba86bea3e0b5129be51c5c61aed0` (v1.5.1).
- Do not rewrite the whole CLI router.
- Preserve `get-fable update` and `get-fable update --check` compatibility.
- Stable release authority is npm `latest`; GitHub Releases are metadata enrichment only.
- Use Bun's built-in SemVer API. Do not add a runtime SemVer package unless a required failing test proves Bun cannot satisfy the contract.
- Preserve installation ownership. Ambiguous ownership returns `unknown` and never mutates.
- Bun/npm exact-target plans must pin `get-fable@<targetVersion>`.
- Passive checks may never install, pull, checkout, merge, build, or call the update executor.
- Unattended auto-install is outside this plan.
- Announcement feed is data-only and must never become an executable command surface.
- Lock reclaim is never age-only. Live owners are not evicted. Lock release requires the matching ownership token.
- CI, non-TTY, `--json`, and `--json-v1` paths receive no unsolicited passive output.
- Network/process/time/liveness dependencies must be injectable in unit tests.
- Work test-first. Run targeted tests after each behavior slice, then repository gates before PR completion.
- Prefer one concern per commit and keep each PR independently revertible.

---

## Intended outcome and user jobs

| User | Job | First milestone |
| --- | --- | --- |
| Bun/npm global CLI user | preview and apply the exact published target through the same package manager | M4 |
| Homebrew user | avoid Bun/npm shadow installs and use Homebrew-owned update path | M4 |
| Git checkout user | update source safely without losing local work | M4 |
| CI/machine caller | deterministic machine output with no hidden passive behavior | M4 |
| interactive CLI user | receive a non-mutating update notice | M5 |
| announcement reader | receive validated, targetable notices without a package release | M6 |
| release maintainer | ship immutable, internally consistent distributions | M7 |

## Minimum useful version

M1 through M4 are the minimum useful version. They produce:

```text
published release discovery
-> installation ownership detection
-> pure update plan
-> owner-token lock
-> exact execution
-> post-version verification
-> Git/Homebrew safe strategy
-> compatible CLI
```

Passive checks and announcements wait until this explicit path is trustworthy.

---

# M0 / PR 0: Planning correction

This plan and `docs/specs/updater-announcement-cli-engine-r2.md` are M0.

**Acceptance:**

- all four unresolved P1 findings from PR #26 are explicitly resolved;
- current baseline is v1.5.1;
- passive checks are non-mutating by contract;
- announcement acquisition is concretely specified;
- Bun exact-target execution is pinned;
- lock ownership/liveness semantics are specified;
- unattended auto-install is removed from M1-M7.

No product code belongs in M0.

---

# M1 / PR 1: Deterministic release intelligence and cache

### Task 1.1: Freeze current updater compatibility with deterministic tests

**Files:**
- Modify: `test/updater.test.ts`
- Modify later: `src/core/updater.ts`

**Interfaces:** existing consumers keep importing `fetchLatestVersion`, `isNewerVersion`, `readUpdateCache`, and `writeUpdateCache` from `src/core/updater.ts` during migration.

- [ ] **Step 1: Replace the live-network updater test with strict deterministic version assertions**

Add cases for:

```ts
expect(isNewerVersion('1.5.1', '1.6.0')).toBe(true);
expect(isNewerVersion('1.6.0-rc.1', '1.6.0')).toBe(true);
expect(isNewerVersion('1.6.0', '1.6.0-rc.1')).toBe(false);
```

Add an invalid version input case that must not be silently coerced to zero components.

- [ ] **Step 2: Run the focused test and verify RED**

```bash
bun test test/updater.test.ts --bail
```

Expected: strict/prerelease or invalid-input behavior fails under the homemade parser.

- [ ] **Step 3: Commit the red test only**

```bash
git add test/updater.test.ts
git commit -m "test(update): define strict release comparison contract"
```

### Task 1.2: Add shared release contracts

**Files:**
- Create: `src/core/update/types.ts`
- Create: `test/update-release-source.test.ts`

**Interfaces produced:**

```ts
export type UpdateChannel = 'stable';

export interface ReleaseMetadata {
  version: string;
  channel: UpdateChannel;
  source: 'npm';
  checkedAt: string;
  publishedAt?: string;
  releaseUrl?: string;
  notesUrl?: string;
  integrity?: string;
}

export interface FetchResponseLike {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export type FetchLike = (
  input: string,
  init?: { signal?: AbortSignal; redirect?: RequestRedirect; headers?: Record<string, string> }
) => Promise<FetchResponseLike>;
```

- [ ] **Step 1: Write release-source tests first**

Cover:

```text
npm latest = 1.6.0 -> stable result 1.6.0
npm succeeds + GitHub enrichment fails -> stable result still valid
npm non-2xx -> structured failure/cache path
npm malformed metadata -> validation failure
no fallback to raw master/package.json
```

- [ ] **Step 2: Run RED**

```bash
bun test test/update-release-source.test.ts --bail
```

Expected: FAIL because `src/core/update/release-source.ts` does not exist.

### Task 1.3: Implement npm stable discovery and optional GitHub enrichment

**Files:**
- Create: `src/core/update/release-source.ts`
- Modify: `src/core/update/types.ts`

**Interfaces:**

```ts
export interface ReleaseSourceDeps {
  fetch: FetchLike;
  now: () => Date;
}

export async function fetchStableRelease(
  currentVersion: string,
  deps: ReleaseSourceDeps,
  timeoutMs?: number
): Promise<ReleaseMetadata>;

export function isNewerVersion(current: string, latest: string): boolean;
```

Rules:

```text
npm dist-tags.latest is authoritative
Bun.semver.order(latest, current) > 0 means newer
invalid versions fail validation
GitHub matching release metadata is optional enrichment
no raw master/package.json request
AbortController timer is cleared in finally
```

- [ ] **Step 1: Implement only enough to satisfy the release tests**

- [ ] **Step 2: Run focused tests**

```bash
bun test test/update-release-source.test.ts test/updater.test.ts --bail
```

Expected: PASS.

### Task 1.4: Add schema-versioned atomic release cache

**Files:**
- Create: `src/core/update/cache.ts`
- Create: `test/update-cache.test.ts`

**Interfaces:**

```ts
export interface CacheEnvelope<T> {
  schemaVersion: 1;
  fetchedAt: string;
  expiresAt: string;
  value: T;
}

export function readCache<T>(filePath: string): CacheEnvelope<T> | null;
export function writeCacheAtomic<T>(filePath: string, value: CacheEnvelope<T>): void;
export function isCacheFresh<T>(cache: CacheEnvelope<T>, now: Date): boolean;
```

- [ ] **Step 1: Write failing tests** for missing, corrupted, fresh, stale, atomic replacement, and failed-write preservation.

- [ ] **Step 2: Run RED**

```bash
bun test test/update-cache.test.ts --bail
```

- [ ] **Step 3: Implement temp-write + rename in the same directory**

- [ ] **Step 4: Run M1 targeted tests**

```bash
bun test test/updater.test.ts test/update-release-source.test.ts test/update-cache.test.ts --bail
```

### Task 1.5: Convert `src/core/updater.ts` into the compatibility facade

**Files:**
- Modify: `src/core/updater.ts`

Rules:

- `isNewerVersion` delegates to strict implementation;
- `fetchLatestVersion` adapts `ReleaseMetadata` to current `UpdateCheckResult`;
- existing public signatures remain valid;
- old raw `master/package.json` discovery is removed;
- install/execution behavior is not refactored yet.

- [ ] **Step 1: Run targeted tests**

```bash
bun test test/updater.test.ts test/update-release-source.test.ts test/update-cache.test.ts --bail
```

- [ ] **Step 2: Run typecheck**

```bash
bun run typecheck
```

- [ ] **Step 3: Commit green behavior**

```bash
git add src/core/updater.ts src/core/update/types.ts src/core/update/release-source.ts src/core/update/cache.ts test/updater.test.ts test/update-release-source.test.ts test/update-cache.test.ts
git commit -m "feat(update): add deterministic release discovery"
```

**M1 acceptance:** AC-R2-01 through AC-R2-04 from the R2 spec.

---

# M2 / PR 2: Installation ownership and pure planning

### Task 2.1: Detect installation ownership without guessing

**Files:**
- Create: `src/core/update/install-method.ts`
- Create: `test/update-install-method.test.ts`
- Modify: `src/core/update/types.ts`

**Interfaces:**

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

export interface InstallationDetectionContext {
  executablePath: string;
  repoRoot: string;
  bunGlobalDir?: string;
  npmGlobalDir?: string;
  homebrewPrefix?: string;
  fileExists: (path: string) => boolean;
}

export function detectInstallation(context: InstallationDetectionContext): InstallationInfo;
```

- [ ] **Step 1: Write fixture-driven failing tests**

```text
repoRoot/.git -> git-checkout
Bun prefix only -> bun-global
npm prefix only -> npm-global
Homebrew prefix/cellar evidence only -> homebrew
Bun + npm conflict -> unknown
no evidence -> unknown
```

Every non-unknown result includes explanatory evidence.

- [ ] **Step 2: Run RED**

```bash
bun test test/update-install-method.test.ts --bail
```

- [ ] **Step 3: Implement read-only detection**

Precedence:

```text
explicit Git checkout evidence
then one unambiguous package-manager owner
otherwise unknown
```

- [ ] **Step 4: Run green**

```bash
bun test test/update-install-method.test.ts --bail
```

### Task 2.2: Add a pure planner with exact-target argv

**Files:**
- Create: `src/core/update/planner.ts`
- Create: `test/update-planner.test.ts`
- Modify: `src/core/update/types.ts`

**Interfaces:**

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

export interface UpdatePlanInput {
  currentVersion: string;
  targetVersion: string;
  installation: InstallationInfo;
  targetKind: 'latest-stable' | 'explicit-version';
}

export function planUpdate(input: UpdatePlanInput): UpdatePlan;
```

- [ ] **Step 1: Write strategy-table tests**

Exact Bun assertion:

```ts
expect(plan.executable).toBe('bun');
expect(plan.argv).toEqual(['add', '-g', 'get-fable@1.6.0']);
```

Exact npm assertion:

```ts
expect(npmPlan.argv).toEqual(['install', '-g', 'get-fable@1.6.0']);
```

Also cover:

```text
Homebrew latest stable -> brew upgrade get-fable
Homebrew explicit arbitrary version -> notify-only
Git normal latest -> git-checkout
Git arbitrary version -> notify-only in MUV
unknown -> notify-only
```

- [ ] **Step 2: Add a no-side-effect assertion**

The planner must not import process execution or filesystem mutation APIs.

- [ ] **Step 3: Run RED**

```bash
bun test test/update-planner.test.ts --bail
```

- [ ] **Step 4: Implement the pure mapping**

Never use `latest` in Bun/npm execution argv once a target is planned.

- [ ] **Step 5: Run M2 tests**

```bash
bun test test/update-install-method.test.ts test/update-planner.test.ts --bail
```

- [ ] **Step 6: Commit**

```bash
git add src/core/update/types.ts src/core/update/install-method.ts src/core/update/planner.ts test/update-install-method.test.ts test/update-planner.test.ts
git commit -m "feat(update): plan updates by installation owner"
```

**M2 acceptance:** AC-R2-05 through AC-R2-09.

---

# M3 / PR 3: Owner-token lock, executor, and post-verification

### Task 3.1: Implement lock semantics from concurrency tests

**Files:**
- Create: `src/core/update/lock.ts`
- Create: `test/update-lock.test.ts`

**Interfaces:**

```ts
export type ProcessLiveness = 'alive' | 'dead' | 'unknown';

export interface UpdateLockRecord {
  schemaVersion: 1;
  token: string;
  pid: number;
  acquiredAt: string;
  targetVersion: string;
  installationMethod: InstallationMethod;
}

export interface LockDeps {
  now: () => Date;
  pid: number;
  token: () => string;
  isProcessAlive: (pid: number) => ProcessLiveness;
}

export interface LockHandle {
  path: string;
  token: string;
  record: UpdateLockRecord;
}
```

- [ ] **Step 1: Write failing tests**

```text
no lock -> acquire
old lock + owner alive -> reject
new lock + owner alive -> reject
owner dead -> reclaim
liveness unknown -> reject reclaim
token mismatch on release -> do not unlink
old owner releases after replacement -> replacement remains
```

The old-but-live case is mandatory.

- [ ] **Step 2: Run RED**

```bash
bun test test/update-lock.test.ts --bail
```

- [ ] **Step 3: Implement atomic exclusive create**

Default liveness adapter may use `process.kill(pid, 0)` but must classify uncertain permission/platform outcomes conservatively as `unknown`.

- [ ] **Step 4: Implement token-checked release**

```text
read current lock
if missing -> return
if token differs -> return without unlink
if token matches -> unlink
```

- [ ] **Step 5: Run green**

```bash
bun test test/update-lock.test.ts --bail
```

### Task 3.2: Add structured executor and post-verification

**Files:**
- Create: `src/core/update/executor.ts`
- Create: `test/update-executor.test.ts`
- Modify: `src/core/update/types.ts`

**Interfaces:**

```ts
export interface ProcessResult {
  status: number;
  stdout: string;
  stderr: string;
}

export type ProcessRunner = (
  executable: string,
  argv: string[],
  options?: { cwd?: string }
) => ProcessResult;

export interface UpdateReceipt {
  success: boolean;
  strategy: UpdatePlan['strategy'];
  targetVersion: string;
  verifiedVersion?: string;
  message: string;
}
```

- [ ] **Step 1: Write failing executor tests**

Assert exact Bun call:

```ts
expect(run.calls[0]).toEqual({
  executable: 'bun',
  argv: ['add', '-g', 'get-fable@1.6.0']
});
```

Also test npm exact argv, notify-only no-op, command failure, version mismatch after successful process exit, success with exact verified version, and lock release in `finally`.

- [ ] **Step 2: Run RED**

```bash
bun test test/update-executor.test.ts --bail
```

- [ ] **Step 3: Implement executable + argv execution only**

No shell command strings.

- [ ] **Step 4: Run M3 tests**

```bash
bun test test/update-lock.test.ts test/update-executor.test.ts --bail
```

- [ ] **Step 5: Commit**

```bash
git add src/core/update/types.ts src/core/update/lock.ts src/core/update/executor.ts test/update-lock.test.ts test/update-executor.test.ts
git commit -m "feat(update): lock and verify explicit updates"
```

**M3 acceptance:** AC-R2-10 through AC-R2-16.

---

# M4 / PR 4: Git strategy and backward-compatible CLI

### Task 4.1: Add guarded Git checkout strategy

**Files:**
- Create: `src/core/update/git-strategy.ts`
- Create: `test/update-git-strategy.test.ts`

**Interfaces:**

```ts
export interface GitUpdatePlan {
  repoRoot: string;
  previousSha: string;
  upstreamRef: string;
  targetSha: string;
  dependencyInputsChanged: boolean;
}
```

- [ ] **Step 1: Write failing preflight tests** for dirty checkout, missing upstream, non-fast-forward, clean fast-forward, and dependency-input changes.

- [ ] **Step 2: Write failing apply tests** requiring:

```text
git fetch
fast-forward only movement
bun install --frozen-lockfile when dependency inputs changed
bun run build
version verification
```

Failure after movement must include `previousSha` and deterministic recovery guidance. Do not auto-reset user work.

- [ ] **Step 3: Run RED**

```bash
bun test test/update-git-strategy.test.ts --bail
```

- [ ] **Step 4: Implement and run green**

```bash
bun test test/update-git-strategy.test.ts --bail
```

### Task 4.2: Expand CLI without replacing unrelated routing

**Files:**
- Modify: `src/cli.ts`
- Modify: `src/core/updater.ts`
- Create: `test/update-cli.test.ts`

**Canonical commands:**

```bash
get-fable update
get-fable update --check
get-fable update status
get-fable update status --json
get-fable update plan
get-fable update plan --json
get-fable update apply
get-fable update apply --version <version>
get-fable update doctor
```

Compatibility:

```text
update --check -> status/check path
update -> explicit latest-stable apply through detected ownership
```

- [ ] **Step 1: Write CLI tests** for legacy check, legacy update routing, JSON-only stdout, plan JSON, unknown install refusal, and unsupported Homebrew/Git explicit-version refusal.

- [ ] **Step 2: Run RED**

```bash
bun test test/update-cli.test.ts --bail
```

- [ ] **Step 3: Implement command branching in the existing CLI structure**

- [ ] **Step 4: Run the MUV targeted suite**

```bash
bun test test/update-release-source.test.ts test/update-cache.test.ts test/update-install-method.test.ts test/update-planner.test.ts test/update-lock.test.ts test/update-executor.test.ts test/update-git-strategy.test.ts test/update-cli.test.ts test/updater.test.ts --bail
```

- [ ] **Step 5: Run repository gates**

```bash
bun run typecheck
bun test
bun run build
bun run check
npm pack --dry-run --ignore-scripts --json
```

- [ ] **Step 6: Commit**

```bash
git add src/cli.ts src/core/updater.ts src/core/update/git-strategy.ts test/update-git-strategy.test.ts test/update-cli.test.ts
git commit -m "feat(update): expose safe explicit update CLI"
```

**M4 acceptance:** AC-R2-17 through AC-R2-20. M1-M4 together are the MUV.

---

# M5 / PR 5: Passive notification-only update checks

### Task 5.1: Define passive invocation policy as a pure function

**Files:**
- Create: `src/core/update/policy.ts`
- Create: `test/update-policy.test.ts`

**Interfaces:**

```ts
export interface PassiveCheckContext {
  autoCheck: boolean;
  cacheFresh: boolean;
  isCI: boolean;
  isTTY: boolean;
  jsonMode: boolean;
  jsonV1Mode: boolean;
  command: string;
}

export interface PassiveCheckDecision {
  allowed: boolean;
  reason: string;
}
```

- [ ] **Step 1: Write failing matrix**

```text
interactive + stale + autoCheck -> allowed
fresh cache -> denied
CI -> denied
non-TTY -> denied
JSON -> denied
JSON-v1 -> denied
explicit update/announcement machine operation -> denied
```

- [ ] **Step 2: Run RED**

```bash
bun test test/update-policy.test.ts --bail
```

- [ ] **Step 3: Implement pure policy and run green**

### Task 5.2: Wire passive notification behind a hard mutation boundary

**Files:**
- Modify: `src/cli.ts`
- Modify: `src/core/update/policy.ts`
- Modify: `test/update-policy.test.ts`
- Modify: `test/update-cli.test.ts`

- [ ] **Step 1: Add a mutation-spy integration test**

Inject an executor/process runner that throws if called. The passive path must succeed without calling it.

The test proves:

```text
may fetch release metadata
may write cache
may print interactive notice
cannot call executeUpdate
cannot run Bun/npm/brew/git/build
```

- [ ] **Step 2: Implement passive check from top-level interactive path only**

- [ ] **Step 3: Run targeted tests**

```bash
bun test test/update-policy.test.ts test/update-cli.test.ts --bail
```

- [ ] **Step 4: Commit**

```bash
git add src/cli.ts src/core/update/policy.ts test/update-policy.test.ts test/update-cli.test.ts
git commit -m "feat(update): add non-mutating passive notices"
```

**M5 acceptance:** AC-R2-21 through AC-R2-23.

---

# M6 / PR 6: Remote data-only announcement engine

### Task 6.1: Add concrete feed authority and bounded acquisition

**Files:**
- Create: `public/announcements.json`
- Create: `src/core/update/announcements.ts`
- Create: `test/announcements.test.ts`
- Reuse: `src/core/update/cache.ts`

**Feed authority:**

```text
https://raw.githubusercontent.com/imMamdouhaboammar/get-fable/master/public/announcements.json
```

**Initial feed:**

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-08-28T00:00:00.000Z",
  "announcements": []
}
```

**Interfaces:**

```ts
export interface AnnouncementFeed {
  schemaVersion: 1;
  generatedAt: string;
  announcements: Announcement[];
}

export interface AnnouncementFetchDeps {
  fetch: FetchLike;
  now: () => Date;
  readCache: () => CacheEnvelope<AnnouncementFeed> | null;
  writeCache: (feed: CacheEnvelope<AnnouncementFeed>) => void;
}
```

- [ ] **Step 1: Write failing acquisition tests**

```text
fixed HTTPS URL used
redirect rejected
2500ms timeout
response >128 KiB rejected
>250 entries rejected
invalid schema rejected
valid response replaces cache
invalid response preserves valid cache
network failure + cache <=7 days -> cached display
network failure + cache >7 days -> null
```

- [ ] **Step 2: Run RED**

```bash
bun test test/announcements.test.ts --bail
```

- [ ] **Step 3: Implement bounded acquisition with `redirect: 'error'` and explicit size guard**

### Task 6.2: Validate data-only schema and targeting

**Files:**
- Modify: `src/core/update/announcements.ts`
- Modify: `test/announcements.test.ts`

- [ ] **Step 1: Add failing schema tests** rejecting unknown schema versions, missing required fields, bad times/version bounds, and executable-shaped fields including `command`, `commands`, `executable`, `script`, `shell`, `args`, `hook`, and `code`, including nested payloads.

- [ ] **Step 2: Add targeting tests** for min/max version, starts/expires, once, until-dismissed, and always.

- [ ] **Step 3: Implement and run green**

```bash
bun test test/announcements.test.ts --bail
```

### Task 6.3: Add announcement CLI and passive display

**Files:**
- Modify: `src/cli.ts`
- Modify: `test/update-cli.test.ts`
- Modify: `test/announcements.test.ts`

**Commands:**

```bash
get-fable announcements
get-fable announcements list
get-fable announcements list --unread
get-fable announcements show <id>
get-fable announcements dismiss <id>
get-fable announcements refresh
```

- [ ] **Step 1: Write CLI tests**

Explicit refresh with network failure and no valid cache exits non-zero with structured failure. Passive failure remains silent. JSON paths remain clean.

- [ ] **Step 2: Implement CLI paths and local seen/dismiss state**

- [ ] **Step 3: Run M6 tests**

```bash
bun test test/announcements.test.ts test/update-cli.test.ts test/update-policy.test.ts --bail
```

- [ ] **Step 4: Commit**

```bash
git add public/announcements.json src/core/update/announcements.ts src/cli.ts test/announcements.test.ts test/update-cli.test.ts
git commit -m "feat(update): add bounded announcement feed"
```

**M6 acceptance:** AC-R2-24 through AC-R2-28.

---

# M7 / PR 7: Homebrew and release hardening

### Task 7.1: Make Homebrew source immutable and checksum-pinned

**Files:**
- Modify: `Formula/get-fable.rb`
- Create: `test/release-distribution.test.ts`
- Modify if needed: `.github/workflows/release.yml`
- Modify: `docs/RELEASE.md`

- [ ] **Step 1: Write failing distribution assertions**

Test must reject:

```text
refs/heads/master.tar.gz
formula without sha256
formula version != package version
formula source tag != declared version
```

- [ ] **Step 2: Run RED**

```bash
bun test test/release-distribution.test.ts --bail
```

Expected: current formula fails because it points to mutable `master.tar.gz`.

- [ ] **Step 3: Change formula to a versioned tag/release archive and matching SHA-256**

Do not invent the checksum. Derive it from the actual immutable release artifact used by the formula.

- [ ] **Step 4: Add release consistency gate if current workflow does not already enforce it**

Gate must compare package version, release tag/version, and formula version/source.

- [ ] **Step 5: Run targeted tests and Ruby syntax**

```bash
bun test test/release-distribution.test.ts --bail
ruby -c Formula/get-fable.rb
```

- [ ] **Step 6: Run repository gates**

```bash
bun run typecheck
bun test
bun run build
bun run check
npm pack --dry-run --ignore-scripts --json
```

- [ ] **Step 7: Commit**

```bash
git add Formula/get-fable.rb test/release-distribution.test.ts .github/workflows/release.yml docs/RELEASE.md
git commit -m "fix(release): pin immutable Homebrew source"
```

**M7 acceptance:** AC-R2-29 and AC-R2-30.

---

# Explicitly deferred: unattended automatic installation

Do not implement auto-install from an ordinary CLI passive check.

A future RFC must independently define:

```text
trigger/scheduler ownership
explicit opt-in and revocation
package-manager ownership
concurrency and crash recovery
audit/receipt persistence
machine/interactive behavior
failure notification
major-version policy
rollback semantics
```

No M1-M7 task may add a call edge from passive checking to `executeUpdate`.

---

## Acceptance-to-milestone map

| Acceptance | Milestone |
| --- | --- |
| AC-R2-01..04 | M1 |
| AC-R2-05..09 | M2 |
| AC-R2-10..16 | M3 |
| AC-R2-17..20 | M4 |
| AC-R2-21..23 | M5 |
| AC-R2-24..28 | M6 |
| AC-R2-29..30 | M7 |

## Risk checkpoints

Before merging M2:
- independently review installation evidence precedence and exact target commands.

Before merging M3:
- independently review lock ownership, PID reuse handling, token checks, shell injection surface, and post-version verification.

Before merging M5:
- inspect the call graph and tests to prove passive code cannot reach executor/process mutation.

Before merging M6:
- independently review announcement schema, fixed endpoint, redirect policy, size/time bounds, nested executable-field rejection, and cache fallback.

Before merging M7:
- inspect the actual formula archive/checksum and release workflow consistency.

## Per-PR review and verification contract

For each implementation PR:

1. re-read live changed files and skip already-landed capability;
2. run the narrow failing test first;
3. implement the minimum behavior;
4. run targeted tests;
5. inspect the diff for out-of-scope changes;
6. run typecheck/build or the full repository gate when the PR is at its completion boundary;
7. run independent review/security/release checks relevant to the milestone;
8. fix review blockers with new targeted tests where behavior changes;
9. re-run final affected gates after the last mutation;
10. report only commands actually executed and their observed outcome.

Repository completion gate when feasible:

```bash
bun run typecheck
bun test
bun run build
bun run check
npm pack --dry-run --ignore-scripts --json
```

Formula changes additionally require:

```bash
ruby -c Formula/get-fable.rb
```

## Plan self-review checklist

Before implementation starts:

- [ ] no milestone duplicates behavior already present on live master;
- [ ] every acceptance criterion maps to one milestone;
- [ ] M1-M4 can ship without M5-M7;
- [ ] passive code has no mutation edge;
- [ ] announcement acquisition has one concrete authority and bounded failure behavior;
- [ ] exact Bun/npm targets are pinned;
- [ ] lock reclaim requires dead-owner evidence, never age alone;
- [ ] lock release requires token ownership;
- [ ] tests use injected network/process/time/liveness dependencies;
- [ ] no claim of test success appears without a fresh execution receipt.

## Execution handoff

Start with M1 only. Do not batch M1-M7 into one implementation PR. After each milestone, re-inspect live master before beginning the next one because parallel repository work may have landed overlapping functionality.