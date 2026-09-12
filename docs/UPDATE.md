# Updating get-fable

The updater separates read-only release intelligence from explicit mutation. Package and Git changes are never performed by passive checks.

## Commands

```bash
get-fable update
get-fable update --check
get-fable update status
get-fable update status --json
get-fable update status --json-v1
get-fable update plan
get-fable update plan --json
get-fable update apply
get-fable update apply --version <version>
get-fable update doctor

get-fable announcements
get-fable announcements list
get-fable announcements list --unread
get-fable announcements show <id>
get-fable announcements dismiss <id>
get-fable announcements refresh
```

`get-fable update` remains the compatibility form for applying the latest stable release. `get-fable update --check` is the compatibility form for `get-fable update status`.

Machine-output modes write only the JSON document to stdout. `--json-v1` wraps the payload as `{ "schemaVersion": 1, "command": "...", "data": ... }`.

## Ownership and planning

Before mutation, get-fable detects the installation owner and creates an update plan. Supported owners are Bun global, npm global, Homebrew, and a Git checkout. Ambiguous or unknown ownership is notification-only and does not guess an installer.

Bun and npm plans use an exact target version. Homebrew supports the latest stable target represented by the formula. Arbitrary Homebrew and Git version targets fail closed as notification-only plans.

## Git checkout safety

A Git checkout update requires all of the following before the checkout moves:

- an attached branch with an upstream
- a clean worktree, including no untracked files
- no merge, rebase, cherry-pick, or revert state
- a successful fetch
- a fetched target proven to be a fast-forward from the current revision

The updater records the previous revision before moving and advances only with `git merge --ff-only <target-sha>`.

If `package.json`, `bun.lock`, or `bun.lockb` changed, the updater runs `bun install --frozen-lockfile`. It then runs the build and verifies the installed version. A failure after the checkout moved reports the previous SHA and a deterministic inspection command. The updater does not run `git reset --hard` or automatically discard user work.

## Passive update awareness

Ordinary successful interactive CLI invocations may perform a bounded release-metadata check when the validated release cache is stale. This path can read release metadata, refresh the release cache, and print a concise notice. It has no dependency on the update executor, package managers, Git movement, or build execution.

Passive release checks are suppressed before network work when any of the following is true:

- `CI` is set
- stdout or stderr is not a TTY
- `--json` is active
- `--json-v1` is active
- automatic checks are disabled by policy
- the validated release cache is still fresh
- the active command is an explicit update or announcement operation

Passive failures never change the exit code of the user's primary command. Passive notices are written to stderr rather than stdout so ordinary stdout remains stable.

## Data-only announcements

Announcements come only from:

```text
https://raw.githubusercontent.com/imMamdouhaboammar/get-fable/master/public/announcements.json
```

The client requests that URL with redirects disabled. Acquisition uses a 2500 ms default timeout, rejects response bodies larger than 128 KiB, rejects feeds with more than 250 records, and validates the complete schema before replacing the previous cache.

Announcement records are allow-listed data. Fields shaped as `command`, `commands`, `executable`, `script`, `shell`, `args`, `hook`, or `code` are rejected recursively. Announcement URLs must use credential-free HTTPS. Announcement data cannot define an update version, installer command, process invocation, hook, script, or local configuration mutation.

A valid feed is cached for six hours. If refresh fails, a previously validated feed may be displayed for at most seven days from its fetch time. Invalid remote data never replaces the last validated cache. Explicit `announcements refresh` returns a non-zero result when neither the network result nor a validated cache is usable, while passive acquisition failures remain silent.

Version and time targeting are deterministic. The supported display modes are:

- `once`, hidden after it is recorded as seen
- `until-dismissed`, visible until the user dismisses it
- `always`, visible whenever its version/time targeting matches

Passive announcement display is limited to three notices per invocation and uses the same CI, non-TTY, JSON, JSON-v1, and explicit-command suppression policy as passive update awareness.

## Local update state

The update-related files are deliberately separated:

```text
~/.fable/update/release.json
~/.fable/update/update.lock
~/.fable/update/announcements-feed.json
~/.fable/update/announcements-state.json
```

The release cache cannot be replaced by announcement data. Announcement seen/dismiss state cannot alter release truth. State writes use the shared atomic file helper.

## Concurrency and verification

Explicit mutation is guarded by the owner-token update lock under `~/.fable/update/update.lock`. Success requires post-update version verification; a zero process exit alone is not sufficient.

Release metadata remains cached separately under `~/.fable/update/release.json`. Update planning and status checks do not execute package installation, Git checkout movement, or builds.
