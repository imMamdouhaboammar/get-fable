# Integration Brief: GitHub

**Status:** Proposed Wave-1 provider; required for M6  
**Date:** 2026-09-11

## Purpose

Use GitHub as the authoritative remote provider for Issues, PRs, reviews, CI/check state, merge and Issue closure in the first complete Fable vertical slice.

## Source of truth

GitHub owns remote objects and their state:

```text
Issue number/state/body/comments
branch refs
commit SHAs
Pull Request number/head/base/state
review state and threads
workflow/check results
merge result
Issue closure
```

Fable caches only bounded views and stable IDs/SHAs needed for scheduling and audit. Before side effects whose eligibility can change, current GitHub state must be re-read.

## Fable capabilities

Required M6 set:

```text
repository.issue.read.v1
repository.issue.comment.v1
repository.issue.close.v1
repository.branch.create.v1
repository.change.read.v1
repository.commit.create.v1
repository.pull_request.create.v1
repository.pull_request.read.v1
repository.review.read.v1
repository.ci.observe.v1
repository.pull_request.merge.v1
```

Optional reviewer-request/label capabilities can be added only if the M6 workflow needs them.

## Transport

### DECIDED DIRECTION

Provider implementation may use GitHub REST/GraphQL through an SDK/HTTP adapter. The Provider ABI must not depend on the ChatGPT connector used during planning.

The adapter uses stable GitHub IDs/numbers/SHAs as provider operation/resource refs.

## Authentication

Credentials are provider-owned references and must not enter Run state.

Permissions are capability-specific. Read-only Issue/PR/CI operations do not imply write/merge authority.

## Permission mapping

```text
repository.issue.read.v1            -> repository.read
repository.issue.comment.v1         -> repository.write + remote_mutation
repository.issue.close.v1           -> repository.write + remote_mutation
repository.branch.create.v1         -> repository.write
repository.commit.create.v1         -> repository.write
repository.pull_request.create.v1   -> repository.write + remote_mutation
repository.review.read.v1           -> repository.read
repository.ci.observe.v1            -> repository.read + network_read
repository.pull_request.merge.v1    -> repository.merge + merge
```

Merge is a separate high-risk permission. Ordinary repository write cannot imply merge.

## Invocation semantics

### Issue read

Input:

```text
repository identity
issue number
```

Output includes stable Issue number/URL/state plus bounded title/body/labels/dependency references needed by analysis.

### Branch/commit operations

Creation binds to an expected base SHA/ref where appropriate. Adapter returns resulting ref/SHA.

### PR create

Before creation:

- verify head/base refs still match intended state;
- search/inspect for an already-created equivalent PR when retry/reconciliation requires it;
- use a stable idempotency/reconciliation strategy rather than blindly creating duplicates after timeout.

Output includes PR number, URL, head/base SHAs and provider operation ref.

### CI observe

Observer is keyed to a specific commit/PR head. A green status for another SHA is never current evidence for the intended head.

### Merge

Immediately before merge:

1. fetch current PR state/head SHA;
2. compare head to the reviewed/evidenced expected SHA;
3. fetch required reviews/checks according to policy;
4. confirm no blocking unresolved state;
5. confirm `repository.merge` effective permission and any human approval;
6. invoke merge with expected head SHA when API supports it;
7. record resulting merge SHA/receipt;
8. re-read merged state for verification.

### Issue close

Close only after the Run policy says the intended delivery outcome is complete. If closure depends on merge, confirm merged remote state first.

## Evidence produced

Examples:

```text
ci          -> workflow/check result bound to commit SHA
review      -> review state bound to PR/head
receipt     -> PR created / Issue comment / Issue closed
release     -> merge result bound to merge SHA
observation -> current remote Issue/PR state
```

Provider receipts prove remote operations, not local code correctness.

## Failure behavior

Normalize:

- 401/credential failure -> `permission-denied`/credential blocker;
- 403/ruleset/permission -> `permission-denied` with remote reason ref;
- 404 -> not-found/external-state, preserving privacy semantics where GitHub obscures permission;
- 409/422 ref or merge conflict -> `conflict`;
- rate limit -> `rate-limited` with retry time if available;
- transient 5xx/network -> `unavailable`;
- head moved / precondition failed -> `external-state` or `conflict`, never blind retry merge.

## Retry semantics

Reads are idempotent and can retry under bounded network policy.

Mutations require idempotency/reconciliation:

- branch creation: re-read ref;
- commit creation: use resulting SHA/tree identity and avoid duplicate history on uncertain outcome;
- PR creation: search/reconcile exact head/base/open PR before retry;
- merge: re-read PR state and expected head; never repeat if already merged;
- Issue close: re-read state.

## Health check

Provider health establishes:

- authentication works;
- requested repository is accessible;
- capability permissions can be described where API permits;
- rate-limit/status is usable;
- no write operation is performed as a health check.

## Trust assumptions

GitHub is an external remote authority. Fable trusts authenticated API responses for GitHub-owned state but independently enforces Fable policy about which operations are permitted.

Remote content such as Issue bodies/comments is untrusted input to reasoning Workers and cannot modify Runtime policy.

## Adapter responsibilities

- bind every mutation to the intended repository/ref/object;
- preserve exact IDs/numbers/SHAs;
- re-read stale-sensitive state before irreversible actions;
- normalize pagination for complete required review/check discovery;
- keep credentials out of Run state/logs;
- support cancellation for observers where possible;
- represent rate limiting and retry hints without deciding retries itself;
- use expected head SHA on merge when supported;
- detect already-completed mutations during reconciliation.

## Integration tests

Use a fake GitHub transport for most contract tests plus a controlled live/integration repository for provider integration.

Required cases:

1. Issue read returns stable identity and bounded content;
2. PR create timeout reconciles an already-created PR instead of duplicating it;
3. CI evidence for old SHA is stale for new head;
4. changed PR head invalidates review/merge approval;
5. merge permission is separate from write;
6. merge uses expected head and rejects moved head;
7. already-merged PR reconciles as success rather than second mutation;
8. Issue closure happens only after configured delivery outcome;
9. pagination cannot hide a blocking required review/check;
10. credentials never serialize to Run fixtures.

## Integration acceptance

**READY** for M5 adapter design after Provider ABI conformance exists. M6 end-to-end work must add live sandbox-repository integration tests and GitHub Actions observations before declaring the vertical slice complete.
