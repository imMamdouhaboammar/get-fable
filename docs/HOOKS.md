# Lifecycle Hooks Specification

## Hook Lifecycle Events
- **`SessionStart`**: Restore state and verify active card.
- **`PreToolUse`**: Safety and routing guard.
- **`PostToolUse`**: Track file mutations and count consecutive test failures.
- **`PostToolUseFailure`**: Intercept tool execution failures.
- **`Stop`**: Gate agent termination on fresh passing verification.

## Git hook installation

`get-fable install git-hooks`, installation status, and Doctor resolve the
effective hooks directory with Git plumbing. They do not assume `.git` is a
directory. This keeps the same behavior in a primary worktree, a linked
worktree whose `.git` entry is a file, and a repository that configures
`core.hooksPath`.

Git hook directories are shared when Git reports a shared path. Installing from
a linked worktree can therefore update the hooks used by the repository's other
worktrees. A populated repository whose effective path cannot be resolved is
left unchanged; a lightweight synthetic `.git/` directory that is empty or
contains only its installed `hooks/` retains the historical fixture-compatible
fallback.

Lifecycle state discovery has a separate boundary. Each Python hook looks for
local `.fable/` state before walking upward, but it stops at any `.git` entry.
This includes the `.git` file used at a linked-worktree root. Consequently a
linked worktree may use its own `.fable/` directory, while a worktree without
one never inherits state from an unrelated ancestor workspace.

The host-provided working directory is also an authority boundary. When a hook
payload contains canonical `cwd` or a supported workspace alias, get-fable
uses the first supplied authority only if it names an existing directory.
Invalid explicit values—including missing paths, regular files, empty values,
and malformed types—survive host normalization and produce no state discovery.
The process working directory is retained solely as a compatibility fallback
for hosts that omit workspace authority entirely.

## Lifecycle filesystem safety

An existing `.fable` must be a real directory. Lifecycle state, ledger, and
lock files must be regular files when present. Symlinks, dangling links, and
special files are rejected before their contents can be read or written.
The event observer also checks its journal and compaction temporary path.

An unsafe local `.fable` is not the same as no `.fable`: hooks do not search
past it for another project's state. Stop blocks on this condition, including
active Stop callbacks and ledgers that would otherwise indicate `PAUSED`.
Restore a real local directory and regular lifecycle files before retrying;
automatic initialization or Doctor repair does not follow or delete unsafe
entries on your behalf.

This is static path validation. Concurrent replacement between checking and
opening a path remains outside the guarantee.
