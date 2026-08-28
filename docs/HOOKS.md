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
