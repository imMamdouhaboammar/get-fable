# Updater, Auto-Update Check, Announcement, and CLI Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a package-manager-aware updater, passive update checker, data-only announcement engine, and compatible CLI surface without changing get-fable's default trust model or silently mutating user installations.

**Architecture:** Keep `src/core/updater.ts` as a compatibility facade while focused modules under `src/core/update/` separate release discovery, cache, installation detection, pure planning, execution, Git strategy, policy, and announcements. Stable release authority comes from npm `latest`; GitHub Releases only enrich metadata. Passive checks notify only, while installation remains explicit by default and always follows detected installation ownership.

**Tech Stack:** Bun >= 1.3.0, TypeScript, Bun test runner, Bun `semver` API, Node-compatible filesystem/process APIs, npm Registry metadata, GitHub Releases metadata, Homebrew formula

**Spec:** `docs/specs/updater-announcement-cli-engine.md`

## Global Constraints

- Preserve existing `get-fable update` and `get-fable update --check` behavior as compatibility entry points.
- Stable version authority is npm registry `latest`; repository `master/package.json` is not a stable release authority.
- GitHub Releases may enrich release notes/assets/integrity metadata but may not override the stable published version.
- Detect `bun-global`, `npm-global`, `homebrew`, `git-checkout`, or `unknown` before mutation.
- `unknown` installation ownership never mutates automatically.
- `autoCheck=true`, `checkIntervalHours=24`, and `autoInstall='off'` are the defaults.
- Passive checks must not emit unsolicited stdout or mutate installations in CI, non-interactive, `--json`, or `--json-v1` execution paths.
- Announcement input is data-only and may not contain executable command/script/hook fields.
- Preserve the current Bun-first runtime and avoid adding a runtime SemVer dependency unless Bun's documented SemVer API fails a required test.
- Behavior changes use TDD: failing test first, then minimal implementation, then refactor.
- Each task is independently reviewable and ends with targeted verification before the repository-wide gate.
- Do not rewrite unrelated CLI routing, lifecycle state, hooks, router semantics, skills, or telemetry.

---

## File Structure After Completion

```text
src/core/
  updater.ts                  # compatibility facade only
  update/
    types.ts                  # shared contracts
    release-source.ts         # npm stable + GitHub enrichment
    cache.ts                  # schema/TTL/atomic persistence
    install-method.ts         # installation ownership detection
    planner.ts                # pure update decision
    lock.ts                   # cross-process mutation lock
    executor.ts               # package-manager-aware execution
    git-strategy.ts           # source-checkout update path
    policy.ts                 # passive/auto-install policy
    announcements.ts          # data-only announcement engine

src/cli.ts                    # narrow routing/integration only
Formula/get-fable.rb          # immutable release source + sha256

test/
  updater.test.ts             # legacy compatibility facade
  update-release-source.test.ts
  update-cache.test.ts
  update-install-method.test.ts
  update-planner.test.ts
  update-executor.test.ts
  update-git-strategy.test.ts
  update-policy.test.ts
  announcements.test.ts
  update-cli.test.ts
  release-distribution.test.ts
```

## Delivery Graph

```text
PR 1 Release contracts + deterministic discovery/cache
  |
  +----------------------> PR 5 Announcement engine
  |
  v
PR 2 Installation detection + pure planner
  |
  v
PR 3 Explicit executor + lock + verification
  |
  v
PR 4 Git checkout strategy
  |
  +----------------------+------------------+
                         v                  |
                PR 6 Passive check + CLI <-+
                         |
                         v
                PR 7 Opt-in auto-install

PR 8 Homebrew/release hardening depends on stable version contracts and must land before the first release that advertises the complete engine.
```

## PR 1: Release Intelligence, Version Semantics, and Atomic Cache

### Task 1: Introduce shared update contracts and deterministic test seams

**Files:**
- Create: `src/core/update/types.ts`
- Create: `src/core/update/release-source.ts`
- Create: `src/core/update/cache.ts`
- Modify: `src/core/updater.ts`
- Modify: `test/updater.test.ts`
- Create: `test/update-release-source.test.ts`
- Create: `test/update-cache.test.ts`

**Interfaces:**
- Produces: `ReleaseMetadata`, `UpdateCheckResult`, `UpdateCacheV1`, `UpdateRuntime`
- Produces: `compareVersions(current: string, latest: string): -1 | 0 | 1`
- Produces: `fetchStableRelease(currentVersion: string, runtime: UpdateRuntime): Promise<UpdateCheckResult>`
- Produces: `readUpdateCache(runtime: UpdateRuntime): UpdateCacheV1 | null`
- Produces: `writeUpdateCache(cache: UpdateCacheV1, runtime: UpdateRuntime): void`
- Later tasks consume these contracts without redefining them.

- [ ] **Step 1: Write failing SemVer tests against Bun ordering**

Add to `test/update-release-source.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { compareVersions } from '../src/core/update/release-source.ts';

describe('compareVersions', () => {
  test('orders stable and prerelease versions using SemVer semantics', () => {
    expect(compareVersions('1.5.0', '1.5.1')).toBe(-1);
    expect(compareVersions('1.5.0-beta.1', '1.5.0')).toBe(-1);
    expect(compareVersions('2.0.0', '1.9.9')).toBe(1);
    expect(compareVersions('1.5.0', '1.5.0')).toBe(0);
  });
});
```

- [ ] **Step 2: Run the exact test and verify RED**

Run:

```bash
bun test test/update-release-source.test.ts --bail
```

Expected: FAIL because `src/core/update/release-source.ts` or `compareVersions` does not exist.

- [ ] **Step 3: Define the shared contracts exactly once**

Create `src/core/update/types.ts` with these public shapes:

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

export interface UpdateCheckResult {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  checkedAt: string;
  channel: 'stable';
  release?: ReleaseMetadata;
  stale: boolean;
}

export interface UpdateRuntime {
  fetch: typeof fetch;
  now: () => Date;
  homeDir: string;
}

export interface UpdateCacheV1 {
  schemaVersion: 1;
  fetchedAt: string;
  expiresAt: string;
  result: UpdateCheckResult;
}
```

- [ ] **Step 4: Implement version comparison with Bun's public API**

In `src/core/update/release-source.ts`:

```ts
import { semver } from 'bun';

export function compareVersions(current: string, latest: string): -1 | 0 | 1 {
  return semver.order(current, latest);
}
```

- [ ] **Step 5: Verify the focused SemVer test is GREEN**

Run:

```bash
bun test test/update-release-source.test.ts --bail
```

Expected: PASS.

- [ ] **Step 6: Add failing tests proving npm `latest` is authoritative**

Add fixtures using an injected `fetch` implementation. Cover all of these assertions:

```ts
expect(result.latestVersion).toBe('1.5.0');
expect(result.updateAvailable).toBe(false);
expect(requestedUrls[0]).toContain('registry.npmjs.org/get-fable');
expect(requestedUrls.some((url) => url.includes('/master/package.json'))).toBe(false);
```

Add a second case where local version is `1.5.0`, npm `latest` is `1.6.0`, and GitHub metadata is unavailable. Expected: update remains available and `latestVersion === '1.6.0'`.

- [ ] **Step 7: Run discovery tests and verify RED**

Run:

```bash
bun test test/update-release-source.test.ts --bail
```

Expected: FAIL because stable registry discovery is not implemented.

- [ ] **Step 8: Implement `fetchStableRelease` with bounded injected I/O**

Required behavior:

```text
GET npm package metadata -> read dist-tags.latest -> compare with current
optional GitHub Release lookup for matching v<latest>
GitHub failure does not invalidate npm stable result
HTTP/non-JSON/missing latest becomes a typed discovery failure or cache fallback
```

Do not call `master/package.json`.

- [ ] **Step 9: Add failing cache tests**

`test/update-cache.test.ts` must prove:

```text
missing cache -> null
invalid JSON -> null
schemaVersion != 1 -> null
fresh cache -> returned
expired cache -> returned as stale or rejected according to caller contract
write -> temp file then rename, leaving valid final JSON
write failure -> does not corrupt an existing valid cache
```

Use a temporary home directory per test.

- [ ] **Step 10: Run cache tests and verify RED**

```bash
bun test test/update-cache.test.ts --bail
```

Expected: FAIL before `cache.ts` is implemented.

- [ ] **Step 11: Implement schema-versioned atomic cache**

Use this storage root:

```text
~/.fable/update/release.json
```

Write to a sibling temporary file, close the write, then rename to `release.json`. Never truncate the valid final file before the replacement is ready.

- [ ] **Step 12: Convert the legacy updater test away from live network**

`test/updater.test.ts` must test the compatibility facade using injected runtime dependencies. Remove the test that depends on live GitHub/npm availability.

- [ ] **Step 13: Keep `src/core/updater.ts` as a facade**

It may re-export or delegate to the new release/cache modules, but `src/cli.ts` must continue compiling without a broad command rewrite.

- [ ] **Step 14: Verify PR 1 targeted tests**

```bash
bun test test/updater.test.ts test/update-release-source.test.ts test/update-cache.test.ts --bail
bun run typecheck
```

Expected: all pass.

- [ ] **Step 15: Run repository gate**

```bash
bun run check
npm pack --dry-run --ignore-scripts --json > /tmp/get-fable-package-pr1.json
```

Expected: exit 0.

- [ ] **Step 16: Commit PR 1**

```bash
git add src/core/updater.ts src/core/update/types.ts src/core/update/release-source.ts src/core/update/cache.ts test/updater.test.ts test/update-release-source.test.ts test/update-cache.test.ts
git commit -m "feat(update): add deterministic release discovery"
```

---

## PR 2: Installation Ownership Detection and Pure Update Planner

### Task 2: Detect installation ownership without guessing

**Files:**
- Create: `src/core/update/install-method.ts`
- Create: `src/core/update/planner.ts`
- Modify: `src/core/update/types.ts`
- Create: `test/update-install-method.test.ts`
- Create: `test/update-planner.test.ts`

**Interfaces:**
- Consumes: `UpdateCheckResult`
- Produces: `InstallationMethod`, `InstallationInfo`, `UpdatePlan`
- Produces: `detectInstallation(context: InstallationDetectionContext): InstallationInfo`
- Produces: `planUpdate(input: UpdatePlanInput): UpdatePlan`

- [ ] **Step 1: Extend shared types**

Add exactly:

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

- [ ] **Step 2: Write the installation fixture matrix first**

`test/update-install-method.test.ts` must create deterministic fixtures for:

```text
repo root with .git -> git-checkout
executable/package under Bun global prefix -> bun-global
executable/package under npm global prefix -> npm-global
Homebrew cellar/opt evidence -> homebrew
conflicting evidence -> unknown
no recognized evidence -> unknown
```

Every non-unknown result must include at least one evidence string explaining the classification.

- [ ] **Step 3: Run the detector tests and verify RED**

```bash
bun test test/update-install-method.test.ts --bail
```

Expected: FAIL because detector does not exist.

- [ ] **Step 4: Implement evidence-based detection**

The detector may inspect paths and injected command/query results, but it must never mutate the installation. Precedence rule:

```text
explicit Git checkout evidence
then unambiguous package-manager ownership
otherwise unknown
```

Conflicting package-manager evidence returns `unknown` rather than choosing a preferred manager.

- [ ] **Step 5: Write pure planner tests before implementation**

`test/update-planner.test.ts` must prove:

```ts
expect(planUpdate(bunCase).strategy).toBe('bun-global');
expect(planUpdate(npmCase).strategy).toBe('npm-global');
expect(planUpdate(brewCase).strategy).toBe('homebrew');
expect(planUpdate(gitCase).strategy).toBe('git-checkout');
expect(planUpdate(unknownCase).strategy).toBe('notify-only');
```

Also prove `planUpdate` causes zero process executions and zero filesystem writes by construction: its inputs are plain data and it receives no runtime mutation dependency.

- [ ] **Step 6: Run planner tests and verify RED**

```bash
bun test test/update-planner.test.ts --bail
```

- [ ] **Step 7: Implement planner command selection**

Canonical command plans:

```text
bun-global -> executable `bun`, argv [`update`, `-g`, `get-fable`]
npm-global -> executable `npm`, argv [`install`, `-g`, `get-fable@<targetVersion>`]
homebrew -> executable `brew`, argv [`upgrade`, `get-fable`]
git-checkout -> no generic executable; delegated to git strategy
unknown -> notify-only, no executable/argv
```

The planner must never silently switch package managers.

- [ ] **Step 8: Verify PR 2 targeted tests**

```bash
bun test test/update-install-method.test.ts test/update-planner.test.ts --bail
bun run typecheck
```

- [ ] **Step 9: Run repository gate and commit**

```bash
bun run check
git add src/core/update/types.ts src/core/update/install-method.ts src/core/update/planner.ts test/update-install-method.test.ts test/update-planner.test.ts
git commit -m "feat(update): detect install ownership and plan updates"
```

---

## PR 3: Safe Explicit Executor, Locking, and Post-Update Verification

### Task 3: Execute validated plans only

**Files:**
- Create: `src/core/update/lock.ts`
- Create: `src/core/update/executor.ts`
- Modify: `src/core/update/types.ts`
- Modify: `src/core/updater.ts`
- Create: `test/update-executor.test.ts`

**Interfaces:**
- Consumes: `UpdatePlan`
- Produces: `UpdateExecutionResult`
- Produces: `acquireUpdateLock(runtime): UpdateLockHandle`
- Produces: `executeUpdatePlan(plan, runtime): Promise<UpdateExecutionResult>`

- [ ] **Step 1: Define execution result contract**

Add:

```ts
export interface UpdateExecutionResult {
  success: boolean;
  strategy: UpdatePlan['strategy'];
  previousVersion: string;
  targetVersion: string;
  observedVersion?: string;
  exitCode?: number;
  message: string;
}
```

- [ ] **Step 2: Write failing lock tests**

Prove:

```text
first process acquires lock
second process is rejected while valid lock exists
released lock can be reacquired
stale lock older than configured threshold can be replaced
malformed lock does not cause unsafe concurrent mutation
```

Store the lock at:

```text
~/.fable/update/update.lock
```

- [ ] **Step 3: Verify lock tests RED**

```bash
bun test test/update-executor.test.ts --bail
```

- [ ] **Step 4: Implement bounded lock lifecycle**

Lock contents must include schema version, PID, startedAt, and target version. Creation must be exclusive. Release must occur in `finally` after execution begins.

- [ ] **Step 5: Write executor tests before implementation**

Cover:

```text
notify-only -> refuses mutation
bun-global -> executes exact executable + argv from plan
npm-global -> executes exact executable + argv from plan
homebrew -> executes exact executable + argv from plan
non-zero package-manager exit -> failure, no fallback manager
zero exit + observed version != target -> failure
zero exit + observed version == target -> success
lock acquisition failure -> no process execution
```

The process runner is injected and accepts `{ executable, argv, cwd? }`; do not use shell strings.

- [ ] **Step 6: Verify executor tests RED**

```bash
bun test test/update-executor.test.ts --bail
```

- [ ] **Step 7: Implement executor with post-version verification**

The executor sequence is fixed:

```text
validate plan -> acquire lock -> execute strategy -> read installed version -> compare target -> record result -> release lock
```

No retry through a different installer is allowed.

- [ ] **Step 8: Route the legacy explicit updater through planner/executor**

`src/core/updater.ts` remains the compatibility entry point. Existing `runAutoUpdate` may be retained as a deprecated wrapper during this PR, but its implementation must delegate to detection/planning/execution and must not contain independent package-manager logic.

- [ ] **Step 9: Verify PR 3**

```bash
bun test test/updater.test.ts test/update-executor.test.ts test/update-planner.test.ts --bail
bun run typecheck
bun run build
bun run check
```

- [ ] **Step 10: Commit**

```bash
git add src/core/updater.ts src/core/update/types.ts src/core/update/lock.ts src/core/update/executor.ts test/update-executor.test.ts
git commit -m "feat(update): execute explicit updates safely"
```

---

## PR 4: Git Checkout Update Strategy and Recovery

### Task 4: Make source-checkout updates explicit and recoverable

**Files:**
- Create: `src/core/update/git-strategy.ts`
- Modify: `src/core/update/executor.ts`
- Create: `test/update-git-strategy.test.ts`

**Interfaces:**
- Consumes: `UpdatePlan` with strategy `git-checkout`
- Produces: `executeGitUpdate(plan, runtime): Promise<UpdateExecutionResult>`

- [ ] **Step 1: Write Git preflight tests first**

Required failing cases:

```text
dirty worktree -> reject before fetch/pull
missing upstream -> reject
remote target not fast-forward -> reject
unresolved merge/rebase state -> reject
```

Use a temporary local Git repository and local bare remote. No internet access.

- [ ] **Step 2: Verify RED**

```bash
bun test test/update-git-strategy.test.ts --bail
```

- [ ] **Step 3: Write dependency-reconciliation test**

Create two revisions where `bun.lock` changes. Expected command order after fast-forward:

```text
bun install --frozen-lockfile
bun run build
get-fable version probe
```

When `bun.lock` does not change, the strategy may skip install but must still build and verify.

- [ ] **Step 4: Write build-failure recovery test**

Capture previous revision before fast-forward. On build failure the result must include the previous revision and a deterministic recovery message; it must never run `git reset --hard` automatically.

- [ ] **Step 5: Implement Git strategy**

Required sequence:

```text
verify clean + no merge state
resolve upstream
record previous revision
fetch
prove fast-forward
fast-forward checkout
if bun.lock/package metadata changed -> bun install --frozen-lockfile
bun run build
version probe
return structured result/recovery data
```

- [ ] **Step 6: Integrate strategy with executor**

`executor.ts` delegates only `git-checkout` plans to `executeGitUpdate`; package-manager strategies stay unchanged.

- [ ] **Step 7: Verify PR 4**

```bash
bun test test/update-git-strategy.test.ts test/update-executor.test.ts --bail
bun run check
```

- [ ] **Step 8: Commit**

```bash
git add src/core/update/git-strategy.ts src/core/update/executor.ts test/update-git-strategy.test.ts
git commit -m "feat(update): harden git checkout updates"
```

---

## PR 5: Data-Only Announcement Engine

### Task 5: Add validated announcements without command execution capability

**Files:**
- Create: `src/core/update/announcements.ts`
- Modify: `src/core/update/types.ts`
- Create: `test/announcements.test.ts`
- Create: `public/announcements.json`

**Interfaces:**
- Produces: `Announcement`, `AnnouncementFeedV1`, `AnnouncementStateV1`
- Produces: `validateAnnouncementFeed(value): AnnouncementFeedV1`
- Produces: `filterAnnouncements(feed, context): Announcement[]`
- Produces: `dismissAnnouncement(id, runtime): void`

- [ ] **Step 1: Define feed and state schemas**

Use:

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

export interface AnnouncementFeedV1 {
  schemaVersion: 1;
  announcements: Announcement[];
}
```

Persist state under:

```text
~/.fable/update/announcements.json
```

- [ ] **Step 2: Write schema rejection tests first**

A feed must be rejected when any announcement includes keys named:

```text
command
commands
script
shell
executable
argv
hook
code
```

Also reject duplicate IDs, invalid dates, invalid version bounds, missing required fields, or unknown `display`/`type` values.

- [ ] **Step 3: Run tests and verify RED**

```bash
bun test test/announcements.test.ts --bail
```

- [ ] **Step 4: Implement strict validation**

Validation returns normalized data only. It never evaluates markup, imports code, invokes processes, or writes outside announcement state/cache files.

- [ ] **Step 5: Add targeting tests**

Cover:

```text
minVersion inclusive
maxVersion inclusive
startsAt before/after now
expiresAt before/after now
once hidden after seen
until-dismissed hidden after dismissal
always remains visible
```

Use Bun SemVer APIs for version targeting.

- [ ] **Step 6: Add the repository-owned default feed**

Create `public/announcements.json` as:

```json
{
  "schemaVersion": 1,
  "announcements": []
}
```

This establishes the schema without shipping a synthetic user announcement.

- [ ] **Step 7: Verify PR 5**

```bash
bun test test/announcements.test.ts --bail
bun run typecheck
bun run check
```

- [ ] **Step 8: Commit**

```bash
git add src/core/update/types.ts src/core/update/announcements.ts test/announcements.test.ts public/announcements.json
git commit -m "feat(update): add data-only announcement engine"
```

---

## PR 6: Passive Check Policy and CLI Engine Integration

### Task 6: Add passive notifications without breaking automation

**Files:**
- Create: `src/core/update/policy.ts`
- Modify: `src/cli.ts`
- Modify: `src/core/updater.ts`
- Create: `test/update-policy.test.ts`
- Create: `test/update-cli.test.ts`
- Modify: `test/cli.test.ts`
- Modify: `docs/INSTALLATION.md`

**Interfaces:**
- Produces: `UpdatePolicy`
- Produces: `shouldRunPassiveCheck(context, policy, cacheState): boolean`
- Produces: `maybeNotifyUpdate(context): Promise<void>`
- CLI consumes updater/planner/announcement APIs but contains no package-manager decision logic.

- [ ] **Step 1: Add policy defaults test**

```ts
expect(loadDefaultUpdatePolicy()).toEqual({
  schemaVersion: 1,
  checkIntervalHours: 24,
  autoCheck: true,
  autoInstall: 'off',
});
```

- [ ] **Step 2: Add passive suppression matrix tests**

`shouldRunPassiveCheck` must return false for:

```text
CI=true
stdoutIsTTY=false
--json
--json-v1
autoCheck=false
fresh cache
```

It returns true only for an interactive, non-CI, non-machine invocation with stale/missing cache and `autoCheck=true`.

Explicit update-check commands are tested separately and are not blocked by passive suppression.

- [ ] **Step 3: Verify policy tests RED**

```bash
bun test test/update-policy.test.ts --bail
```

- [ ] **Step 4: Implement policy persistence and predicate**

Store config at:

```text
~/.fable/update/config.json
```

Unknown/corrupted config falls back to defaults without rewriting until an explicit config write.

- [ ] **Step 5: Write CLI compatibility tests before routing changes**

Required assertions:

```text
get-fable update --check -> exit 0 on valid fixture
get-fable update -> routes to explicit apply path
get-fable update status --json -> valid JSON only on stdout
get-fable update plan --json-v1 -> existing schemaVersion wrapper convention
get-fable announcements list --json -> valid JSON only
normal --json command unrelated to update -> no passive text prefix/suffix
CI normal command -> no passive update output
non-TTY normal command -> no passive update output
```

Inject update runtime so CLI tests do not use live network or real global package mutation.

- [ ] **Step 6: Verify CLI tests RED**

```bash
bun test test/update-cli.test.ts --bail
```

- [ ] **Step 7: Add narrow CLI subcommand handlers**

Supported canonical commands after this PR:

```text
update status
update plan
update apply
update doctor
update config
announcements list
announcements show <id>
announcements dismiss <id>
```

Compatibility mapping:

```text
update --check -> update status
update -> update apply
announcements -> announcements list
```

Do not replace the top-level CLI switch/router unless a failing test proves it is necessary.

- [ ] **Step 8: Add passive notification at the top-level interactive boundary**

Rules:

```text
notification only
bounded metadata check
no install/pull/build
no stdout in machine contexts
announcement failure cannot fail command
update discovery failure cannot fail unrelated command
```

- [ ] **Step 9: Document config and recovery behavior**

Update `docs/INSTALLATION.md` with exact commands:

```bash
get-fable update status
get-fable update plan
get-fable update apply
get-fable update config --auto-check on
get-fable update config --auto-check off
get-fable announcements list
```

State explicitly that auto-install remains off by default.

- [ ] **Step 10: Verify PR 6 targeted suite**

```bash
bun test test/update-policy.test.ts test/update-cli.test.ts test/cli.test.ts test/updater.test.ts --bail
bun run typecheck
bun run build
```

- [ ] **Step 11: Run repository gate and commit**

```bash
bun run check
npm pack --dry-run --ignore-scripts --json > /tmp/get-fable-package-pr6.json
git add src/cli.ts src/core/updater.ts src/core/update/policy.ts test/update-policy.test.ts test/update-cli.test.ts test/cli.test.ts docs/INSTALLATION.md
git commit -m "feat(cli): add passive update checks and announcements"
```

---

## PR 7: Explicit Opt-In Auto-Install Policy

### Task 7: Add policy-governed automatic installation without changing defaults

**Files:**
- Modify: `src/core/update/policy.ts`
- Modify: `src/core/update/planner.ts`
- Modify: `src/core/update/executor.ts`
- Modify: `src/cli.ts`
- Modify: `test/update-policy.test.ts`
- Modify: `test/update-planner.test.ts`
- Modify: `test/update-executor.test.ts`
- Modify: `test/update-cli.test.ts`
- Modify: `docs/INSTALLATION.md`

**Interfaces:**
- Consumes: `UpdatePolicy.autoInstall`
- Produces: `isAutoInstallAllowed(currentVersion, targetVersion, policy): boolean`

- [ ] **Step 1: Write policy matrix tests first**

Required matrix:

```text
off: no version change auto-installs
patch: 1.5.0 -> 1.5.1 allowed; 1.5.0 -> 1.6.0 denied
minor: 1.5.0 -> 1.5.1 allowed; 1.5.0 -> 1.6.0 allowed; 1.5.0 -> 2.0.0 denied
all: patch/minor/major allowed
prerelease targets are denied by stable policy unless an explicit future channel feature is added
unknown installation is denied under every policy
```

- [ ] **Step 2: Verify RED**

```bash
bun test test/update-policy.test.ts test/update-planner.test.ts --bail
```

- [ ] **Step 3: Implement version-delta policy using Bun SemVer ordering/ranges**

No string splitting parser. The implementation must classify major/minor/patch changes in a small tested helper and reject invalid/prerelease stable targets.

- [ ] **Step 4: Add CLI config validation tests**

Accept only:

```text
off
patch
minor
all
```

Invalid values return non-zero and do not rewrite config.

- [ ] **Step 5: Integrate auto-install only at the passive decision layer**

Even when policy allows automatic installation:

```text
installation ownership must be known
planner must approve strategy
lock must be acquired
executor must post-verify target version
CI/noninteractive/JSON suppression still applies
```

- [ ] **Step 6: Verify no-default-mutation regression**

A fresh config/default policy must still produce zero package-manager executions during an ordinary interactive command even when an update is available.

- [ ] **Step 7: Verify PR 7**

```bash
bun test test/update-policy.test.ts test/update-planner.test.ts test/update-executor.test.ts test/update-cli.test.ts --bail
bun run check
```

- [ ] **Step 8: Commit**

```bash
git add src/core/update/policy.ts src/core/update/planner.ts src/core/update/executor.ts src/cli.ts test/update-policy.test.ts test/update-planner.test.ts test/update-executor.test.ts test/update-cli.test.ts docs/INSTALLATION.md
git commit -m "feat(update): add opt-in automatic install policy"
```

---

## PR 8: Homebrew and Release Distribution Hardening

### Task 8: Make the release source reproducible and gate updater distribution

**Files:**
- Modify: `Formula/get-fable.rb`
- Create: `test/release-distribution.test.ts`
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/release.yml`
- Modify: `docs/RELEASE.md`

**Interfaces:**
- Consumes: package version from `package.json`
- Produces: immutable Homebrew source contract
- Produces: CI assertions preventing version/source drift

- [ ] **Step 1: Write release-distribution test before changing Formula**

Parse `package.json` and `Formula/get-fable.rb`. Assert:

```text
formula version == package version
formula URL contains /archive/refs/tags/v<packageVersion>.tar.gz or an immutable release asset URL
formula URL does not contain /heads/master.tar.gz
formula includes sha256 with 64 lowercase/uppercase hex characters
```

- [ ] **Step 2: Run test and verify RED**

```bash
bun test test/release-distribution.test.ts --bail
```

Expected: FAIL because current Formula uses `master.tar.gz` and has no pinned sha256.

- [ ] **Step 3: Change Formula to immutable release source**

Use the exact version tag corresponding to `package.json` and the SHA-256 of that immutable source artifact. Do not invent a checksum; calculate it from the release artifact during implementation.

- [ ] **Step 4: Add CI contract check**

Add to the existing quality/release validation without duplicating the full suite:

```bash
bun test test/release-distribution.test.ts --bail
ruby -c Formula/get-fable.rb
```

- [ ] **Step 5: Harden release workflow ordering**

Before a release is advertised as updater-capable, require:

```text
package version == tag
repository gate passes
npm package dry-run passes
Homebrew formula contract passes
release assets/checksums are available before announcement metadata references them
```

Do not make the updater trust a draft GitHub Release as stable authority.

- [ ] **Step 6: Document release procedure**

`docs/RELEASE.md` must explicitly identify:

```text
npm latest dist-tag = stable install authority
GitHub Release = notes/assets/integrity metadata
Homebrew source = immutable versioned artifact
announcement feed = informational data, not install authority
```

- [ ] **Step 7: Verify PR 8**

```bash
bun test test/release-distribution.test.ts --bail
ruby -c Formula/get-fable.rb
bun run check
npm pack --dry-run --ignore-scripts --json > /tmp/get-fable-package-pr8.json
```

- [ ] **Step 8: Commit**

```bash
git add Formula/get-fable.rb test/release-distribution.test.ts .github/workflows/ci.yml .github/workflows/release.yml docs/RELEASE.md
git commit -m "fix(release): pin immutable updater distribution"
```

---

## Cross-PR Acceptance Map

| Acceptance criterion | Owning PR | Primary evidence |
| --- | ---: | --- |
| npm `latest` is stable authority | 1 | `test/update-release-source.test.ts` |
| GitHub cannot expose unpublished stable version | 1 | `test/update-release-source.test.ts` |
| SemVer prerelease ordering | 1 | `test/update-release-source.test.ts` |
| atomic/corruption-safe cache | 1 | `test/update-cache.test.ts` |
| five installation methods + ambiguity | 2 | `test/update-install-method.test.ts` |
| pure ownership-aware plan | 2 | `test/update-planner.test.ts` |
| lock + no installer fallback + post-verify | 3 | `test/update-executor.test.ts` |
| safe Git checkout strategy | 4 | `test/update-git-strategy.test.ts` |
| non-executable announcements | 5 | `test/announcements.test.ts` |
| version/time/dismissal announcement targeting | 5 | `test/announcements.test.ts` |
| passive check suppression in automation | 6 | `test/update-policy.test.ts`, `test/update-cli.test.ts` |
| legacy update command compatibility | 6 | `test/update-cli.test.ts`, `test/cli.test.ts` |
| opt-in patch/minor/all auto-install | 7 | policy/planner/executor tests |
| immutable Homebrew source | 8 | `test/release-distribution.test.ts` |

## Review Gates Per PR

Every PR must satisfy these gates independently:

1. Targeted tests for the changed behavior pass with `--bail`.
2. `bun run typecheck` passes.
3. `bun run build` passes when production TypeScript changes.
4. `bun run check` passes before review-ready status.
5. `npm pack --dry-run --ignore-scripts --json` is rerun when package contents, CLI distribution, or release behavior changes.
6. The reviewer compares the implementation against `docs/specs/updater-announcement-cli-engine.md` and records any design drift explicitly.
7. Security review is required for executor, lock, Git strategy, announcement validation, passive mutation policy, and release source changes.

## Risks to Watch During Implementation

### Installation misclassification

Failure signal: a fixture or real diagnostic produces multiple ownership signals.

Required response: return `unknown`; improve evidence detection in a separate test-first change. Never resolve ambiguity by preferring Bun.

### Registry or GitHub outage

Failure signal: timeout, 429, 5xx, invalid response.

Required response: explicit update commands report bounded diagnostic information; passive checks fail silent and preserve normal command success. Valid stale cache may inform status but must be marked stale.

### Partial Git update

Failure signal: fast-forward succeeds but install/build/version verification fails.

Required response: preserve user files, return previous revision and recovery commands, never auto-reset or auto-stash.

### Passive output regression

Failure signal: a JSON/CI/non-TTY CLI test contains update notification text.

Required response: fix the passive invocation boundary, not downstream JSON serializers.

### Announcement trust-boundary drift

Failure signal: schema or code introduces executable/script/argv/hook behavior.

Required response: block the PR. Announcement engine is rendering/filtering data only.

### Auto-install policy widening

Failure signal: default config can trigger mutation, or a patch policy crosses minor/major boundary.

Required response: block the PR and restore explicit opt-in semantics.

## Final Completion Gate

The complete feature may be called done only after all eight PR scopes are landed and the final repository revision has fresh evidence from:

```bash
bun run typecheck
bun test
bun run build
bun run check
npm pack --dry-run --ignore-scripts --json
ruby -c Formula/get-fable.rb
```

Additionally verify manually through deterministic fixtures or an isolated disposable environment:

```text
Bun-owned install plans Bun update
npm-owned install plans npm update
Homebrew-owned install plans brew upgrade
Git checkout refuses dirty state and verifies successful fast-forward build
unknown ownership never mutates
passive check produces no output in JSON/CI/non-TTY contexts
announcement feed cannot execute commands
fresh default policy never auto-installs
```

No completion claim is valid from partial PR evidence or from package-manager exit code alone; target version and repository gates must be verified after the final mutation.
