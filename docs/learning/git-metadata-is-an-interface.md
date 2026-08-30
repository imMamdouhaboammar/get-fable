# Git Metadata Is an Interface

## Problem

The Git hook installer treated `<workspace>/.git` as a directory. That is true
for a typical primary worktree, but false for a linked worktree, where `.git` is
a file that refers to Git's private worktree metadata.

## Incorrect assumption

Joining `.git/hooks` produces the directory from which Git executes hooks.

## Engineering concept

Repository metadata has multiple physical layouts and can be redirected by
configuration. Git plumbing is the compatibility interface for resolving those
layouts. Application code should ask Git for the effective path instead of
reimplementing `.git` file parsing or assuming one on-disk representation.

## What get-fable now does

Installation, status, and Doctor use one resolver for Git's effective hooks
directory. The same contract covers primary worktrees, linked worktrees, and
`core.hooksPath`.

Python lifecycle hooks also treat any `.git` filesystem entry as a repository
boundary during upward state discovery. The local `.fable/` check happens
first, so an explicitly initialized linked worktree remains usable, but an
uninitialized linked worktree cannot inherit an ancestor's workflow state.

## Failure case

```text
linked worktree
-> .git is a file
-> append hooks/
-> ENOTDIR
-> initialization is only partially repaired
```

The same layout created a second, less visible failure:

```text
ancestor workspace has .fable/
-> nested linked worktree has a .git file and no local .fable/
-> directory-only repository-boundary check walks past the gitfile
-> lifecycle hook reads or mutates the ancestor's state
```

## Test proving behavior

The regression suite creates a repository with `git init`, commits a fixture,
adds a real linked worktree with `git worktree add`, and then checks installer,
status, Doctor detection, and Doctor repair against the hooks path reported by
Git. A separate fixture verifies a configured `core.hooksPath`. State-boundary
tests run profile and mutation hooks from a real nested linked worktree, prove
that ancestor state is unchanged, and prove that local linked-worktree state
still takes precedence.
