# A missing project and an unsafe project are different

## Problem

State readers followed `.fable` and ledger symlinks, initialization followed
dangling destinations, and stale-lock readers could block forever on a FIFO.
Workspace identity validation was too late to prevent the filesystem access.

## Incorrect assumption

`exists`, `isdir`, and `isfile` are sufficient boundary checks. They follow
symlinks or make dangling entries look absent. Returning "no project" for an
unsafe path is also wrong when the caller interprets absence as permission to
stop or to search for a parent project.

## Engineering concept

Validate the filesystem object before using it, and preserve the difference
between missing and invalid throughout the call chain. Python's
[`os.lstat`](https://docs.python.org/3/library/os.html#os.lstat) and Node's
[`fs.lstatSync`](https://nodejs.org/api/fs.html#fslstatsyncpath-options) inspect
the link itself. Regular-file checks exclude FIFOs and sockets as well as links.

## What get-fable does

Shared guards reject unsafe lifecycle roots and leaves. Init and Doctor
preflight destinations; state transactions check locks before stale-lock
inspection. Python discovery preserves an unsafe local boundary, Stop blocks,
and other consumers avoid external reads and writes. Journal append and
compaction need their own leaf checks because they are separate write paths.
Independent review also found that validating final destinations misses an
existing symlink at a predictable atomic-write temporary path. Exclusive
creation establishes ownership; failed creation must not delete someone else's
entry during cleanup.

## Failure case and regression proof

The boundary tests construct external targets, dangling links, and aged FIFO
locks and exercise actual state/initializer/hook entry points. Assertions check
both the refusal and the unchanged external content. A subprocess timeout makes
a FIFO-induced hang a finite test failure. Normal projects and symlink aliases
of a workspace still exercise the ordinary lifecycle path.
Temporary-path collision tests check both the unchanged outside target and the
preserved colliding entry, not merely whether the write throws.

## Limit

`lstat` followed by open is not an atomic operation. These guards do not prevent
a concurrent path replacement or claim isolation against a same-user attacker.
Stronger descriptor-relative I/O would be a separate portability-sensitive
design, not something an existence preflight can promise.
