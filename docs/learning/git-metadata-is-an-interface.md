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

## Failure case

```text
linked worktree
-> .git is a file
-> append hooks/
-> ENOTDIR
-> initialization is only partially repaired
```

## Test proving behavior

The regression suite creates a repository with `git init`, commits a fixture,
adds a real linked worktree with `git worktree add`, and then checks installer,
status, Doctor detection, and Doctor repair against the hooks path reported by
Git. A separate fixture verifies a configured `core.hooksPath`.
