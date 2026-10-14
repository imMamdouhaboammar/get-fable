# Default context is a dependency

## Problem

The DSH adapter accepted an explicit project root but called the state factory
without passing it. The factory's default used the host process directory.
Routing previews returned the wrong workspace identity, and first route/apply
failed when the core writer validated the target workspace.

## Incorrect assumption

The server process directory and the consumer project are always the same.
Repository-root tests accidentally reinforced that assumption.

## Engineering concept

An optional parameter can hide an ambient dependency. Adapters must forward
the caller's ownership context at every construction boundary, not just when
reading and writing files. Validation correctly exposed the adapter mistake;
weakening validation would have hidden it.

## What changed and proof

Both DSH fresh-state paths now use `createInitialState(undefined, projectRoot)`.
`test/dsh-workspace.test.ts` uses temporary consumer projects distinct from the
process directory, proving preview identity/no writes, first persistence, and
existing-state preservation. It exercises the core state implementation, not a
mock identity function. No live DSH installation is claimed by these tests.

The core still uses Node's [path resolution](https://nodejs.org/api/path.html#pathresolvepaths)
and [real-path identity](https://nodejs.org/api/fs.html#fsrealpathsyncnativepath-options).
Relative paths remain process-relative; concurrent routing transactions and
filesystem trust boundaries need their own contracts.
