# Fable Eco Coding Agent Execution Orders

## Operating mode

The coding agent implementing this pack must work one atomic task at a time. A task is complete only when its focused tests pass, relevant broader regression checks pass, and the commit contains only that task's change

## Required loop

```text
Restore repository state
-> read current spec + task
-> verify dependencies landed
-> inspect exact existing files
-> write failing focused test
-> run and confirm expected failure
-> implement minimum complete behavior
-> run focused tests
-> run neighboring regression tests
-> run formatter/linter for touched language
-> inspect diff for unrelated edits
-> commit atomically
-> move to next dependency-ready task
```

## Branching

Use a dedicated feature branch such as:

```text
feat/fable-eco-production
```

For parallel subprojects use isolated worktrees and branches, then merge through reviewed PRs. Do not run two write agents against the same worktree

## Commit conventions

Examples:

```text
feat(eco): define capability manifest model
feat(eco): resolve immutable upstream versions
feat(eco): add durable transaction journal
test(eco): add archive traversal cases
feat(cli): expose eco plan command
docs(eco): document recovery semantics
```

Avoid mega-commits combining schema, resolver, driver, CLI, and docs

## Test discipline

For every behavioral task:
1. focused failing test first
2. implementation
3. focused pass
4. relevant package suite
5. full suite at milestone boundary

No test may depend on GitHub or package registry availability unless it is explicitly a scheduled upstream qualification job

## Scope discipline

Do not:
- refactor unrelated get-fable code while adding Eco
- duplicate existing router logic in Eco
- weaken existing Fable evidence gates to accommodate a third-party tool
- add a generic manifest shell script escape hatch for convenience
- mark host integration Grade A without a test proving the enforcement mechanism
- add an official stable capability before qualification record exists

## Review gates

Every P0 task needs a second review focused on:
- safety boundary
- state transition correctness
- ownership
- deterministic behavior
- failure mode
- test quality

Transaction, host config, policy, evidence, and security changes require security-oriented review in addition to normal code review

## Milestone completion reports

At the end of each plan document, record:
- commits included
- tests run and exact pass/fail counts
- known unsupported platforms/capabilities
- residual risks
- next dependency-ready tasks

Do not report production-ready until `15-production-acceptance.md` is fully reconciled
