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

## Concurrency and verification

Explicit mutation is guarded by the owner-token update lock under `~/.fable/update/update.lock`. Success requires post-update version verification; a zero process exit alone is not sufficient.

Release metadata remains cached separately under `~/.fable/update/release.json`. Update planning and status checks do not execute package installation, Git checkout movement, or builds.
