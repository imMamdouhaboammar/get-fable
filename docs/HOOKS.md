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

## Mutation debt under lock contention

Python hooks wait a bounded time for `.fable/state.lock`. If a recognized
workspace mutation cannot acquire that lock, the mutation hook preserves the
invalidation obligation as a unique file in `.fable/pending-mutations/` rather
than treating the callback's zero exit status as proof that state was updated.
The token records only the hashed `workspaceId`; it does not record tool input,
paths, prompts, command output, source content, or environment values.

Stop blocks while any mutation token is present, including repeated active
Stop callbacks. The next successful Python or TypeScript state transaction
validates and reconciles the token snapshot into `mutationGeneration` before
running its requested state change. Verification performed before that
generation remains stale. Tokens created after the snapshot are deliberately
left for the following transaction.

Do not delete the debt directory to unblock completion. A malformed, foreign,
symlinked, or special-file token is an integrity error and must be repaired as
state, not interpreted as absence of a mutation. Total inability to create a
token (for example, exhausted or read-only storage) remains an operational
failure outside this mechanism's durable guarantee.
