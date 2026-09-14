# Automated Contributor Outreach Design v2

**Status:** Design complete, awaiting human review before implementation planning  
**Date:** 2026-09-13  
**Target repository:** `imMamdouhaboammar/get-fable`  
**Execution model:** ChatGPT Schedule -> GitHub Issue -> GitHub Action -> GitHub Discussion

## Purpose

Create a twice-weekly contributor outreach pipeline that can run end to end without a manual publishing step while remaining narrow, auditable, idempotent, and resistant to accidental spam.

Every successful run must create two useful repository artifacts:

1. one real contribution Issue in `get-fable`;
2. one linked GitHub Discussion in `Ideas` containing exactly one intended external `@mention`.

A run is allowed to publish nothing when no candidate or topic meets the policy.

## Goals

The automation must:

1. Run twice each week from ChatGPT Schedule.
2. Select at most one external contributor per run.
3. Ground selection in public GitHub work with concrete overlap to `get-fable`.
4. Enforce a 30-day cooldown for the same candidate.
5. Reject previously used topic keys.
6. Create a contribution Issue that is useful independently of the outreach attempt.
7. Publish one linked Discussion through a repository-owned GitHub Action and GitHub GraphQL `createDiscussion` mutation.
8. Ensure the external username is mentioned only when the Discussion is created, never in the source Issue.
9. Recover safely from partial publication without creating a duplicate Discussion.
10. Keep enough durable metadata in GitHub itself to audit and deduplicate future runs.

## Non-goals

The first version does not:

- send email, direct messages, collaborator invitations, or review requests;
- post to another person's repository;
- create more than one external mention per Discussion;
- send automated follow-up pings;
- use private data;
- require a separate database;
- require custom repository labels for activation or state;
- publish a Discussion whose only purpose is promotion.

## High-level flow

```text
ChatGPT Schedule
  -> inspect get-fable and prior outreach records
  -> research public GitHub candidates
  -> choose zero or one candidate
  -> validate fit, cooldown, and topic novelty
  -> create one trusted contribution Issue
  -> GitHub Actions issues.opened event
  -> re-fetch the current Issue from GitHub
  -> validate the machine contract and trusted author
  -> re-check cooldown and duplicate state
  -> resolve the Ideas Discussion category
  -> reconcile an existing Discussion if an Issue marker is found
  -> otherwise render exactly one @candidate mention
  -> create Discussion through GitHub GraphQL
  -> update the Issue with the Discussion URL and publication metadata
```

## Why the Issue is the relay boundary

The connected GitHub capability available to the scheduled ChatGPT run can create Issues, but does not expose a create-Discussion action. GitHub Actions can use the repository-scoped `GITHUB_TOKEN` with `discussions: write` and call GitHub GraphQL.

The Issue therefore acts as a durable, inspectable handoff between editorial candidate selection and repository-owned publication.

The Issue is not only a queue item. Its human-readable section must describe a real contribution opportunity that remains useful even if the invited contributor never responds.

## ChatGPT Schedule responsibilities

Each scheduled run must:

1. Inspect the current `get-fable` README and relevant architecture or feature documentation.
2. Inspect prior outreach Issues and linked Discussions.
3. Research public GitHub activity for possible candidates.
4. Select a candidate only when a specific technical overlap can be explained.
5. Choose a Discussion question that is independently useful as an RFC or design discussion.
6. Check the previous 30 days for the candidate.
7. Check all prior outreach records for the normalized `topicKey`.
8. Skip the run when candidate fit or topic novelty is weak or uncertain.
9. Create exactly one source Issue when all preconditions pass.
10. Perform no separate mention, comment, collaborator invitation, or Discussion publication.

The relay repeats safety and deduplication checks. Scheduler checks are an early filter, not a trust boundary.

## Source Issue contract

The Issue title must begin with:

```text
Contribution opportunity:
```

The Issue body has two sections:

1. human-readable contribution context;
2. one fenced machine contract with a stable sentinel.

Example:

````markdown
## Why this matters

<real implementation or design opportunity>

## Outreach publication contract

```get-fable-outreach-v1
{
  "schema": 1,
  "candidate": "obra",
  "topicKey": "lifecycle-gates-vs-advisory-skills",
  "discussionTitle": "RFC: Should coding-agent skills enforce lifecycle gates or remain advisory?",
  "discussionCategory": "Ideas",
  "discussionBodyTemplate": "I am exploring ... {{candidate}} ...",
  "sourceIssuePurpose": "contribution-opportunity",
  "createdBy": "chatgpt-scheduled-outreach"
}
```
````

### Mention isolation

The source Issue must contain zero external `@mentions`.

`discussionBodyTemplate` must also contain zero `@mentions` and exactly one literal `{{candidate}}` placeholder.

Only the repository relay may replace that placeholder with:

```text
@<candidate>
```

This prevents GitHub from notifying the candidate when the Issue is created and guarantees that the only automated external notification comes from the published Discussion.

## Workflow trigger

No custom label is required to start publication. Requiring a label would introduce a setup dependency and could make a scheduled Issue fail before the relay runs.

The workflow listens only for newly opened Issues:

```yaml
on:
  issues:
    types: [opened]

permissions:
  contents: read
  issues: write
  discussions: write
```

A cheap workflow-level condition may restrict execution to the canonical repository and owner-created Issues, but the TypeScript relay must re-fetch and validate the Issue authoritatively before any side effect.

There is no `pull_request_target`, no arbitrary repository dispatch payload, and no execution of content supplied by the Issue.

## Proposed files

```text
.github/workflows/publish-outreach-discussion.yml
scripts/publish-outreach-discussion.ts
src/outreach/contract.ts
src/outreach/policy.ts
src/outreach/github.ts
src/outreach/relay.ts
```

Tests should follow the repository's current Bun test conventions and may remain colocated with the relevant modules if that matches existing patterns discovered during implementation planning.

## Trusted publication gates

The relay must fail closed unless every gate passes.

### Repository and event gate

- repository is exactly `imMamdouhaboammar/get-fable`;
- source is an Issue, not a Pull Request;
- Issue is currently open;
- Issue was authored by `imMamdouhaboammar` or another future username explicitly committed to a repository allowlist;
- title begins with `Contribution opportunity:`;
- exactly one supported `get-fable-outreach-v1` block exists;
- contract `schema` equals `1`;
- `createdBy` equals `chatgpt-scheduled-outreach`;
- `sourceIssuePurpose` equals `contribution-opportunity`.

The relay must re-fetch the Issue from the GitHub API instead of treating the workflow event payload as current truth.

### Candidate gate

- `candidate` matches GitHub username grammar accepted by the implementation;
- candidate is not the repository owner;
- candidate does not match configured bot-account patterns;
- source Issue contains no external `@mentions`;
- `discussionBodyTemplate` contains no `@mentions`;
- template contains exactly one `{{candidate}}` placeholder.

### Content gate

- title and body fields are non-empty and have explicit maximum lengths;
- category must be exactly `Ideas` in v1;
- `topicKey` follows a stable lowercase slug grammar;
- body template contains a concrete technical question or request for technical feedback;
- contract fields are parsed as data only;
- Issue content is never evaluated as shell, JavaScript, GitHub Actions expression syntax, or GraphQL source.

## Deduplication and cooldown

Both scheduler and relay check deduplication. The relay is authoritative for publication.

Before creating a Discussion, the relay checks:

1. whether the source Issue already contains a valid published-outreach marker;
2. whether a Discussion already contains the deterministic source-Issue marker;
3. whether another published outreach Issue targeted the same candidate during the previous 30 days;
4. whether another published outreach Issue used the same `topicKey`.

The current Issue is excluded from candidate and topic duplicate comparisons.

If duplicate state cannot be established reliably because the required GitHub query fails, publication stops.

## Durable markers

The Discussion body receives this marker from the relay:

```html
<!-- get-fable-outreach:issue-<number> -->
```

The source Issue receives a publication block only after the Discussion is known to exist:

```html
<!-- get-fable-outreach-published-v1
{"candidate":"obra","topicKey":"lifecycle-gates-vs-advisory-skills","discussionUrl":"https://github.com/.../discussions/123","publishedAt":"2026-09-13T...Z"}
-->
```

A visible `Related Discussion` link may accompany the hidden marker.

These markers are the v1 audit and reconciliation state. No custom labels or external persistence are required.

## Discussion creation

The relay queries GitHub GraphQL for the repository and Discussion categories and must resolve exactly one category named `Ideas`.

It then:

1. validates the body template again;
2. replaces exactly one `{{candidate}}` with `@candidate`;
3. confirms the rendered body contains exactly one external mention and that it is the intended candidate;
4. appends the deterministic source-Issue marker;
5. calls a static `createDiscussion` GraphQL mutation using variables for all Issue-derived values.

Repository ID and category node ID are resolved at runtime and are not hardcoded.

## Idempotency and partial failure

Publication follows reconcile-before-create semantics.

Before `createDiscussion`, the relay searches for the deterministic source-Issue marker.

If a matching Discussion already exists, the relay does not create another Discussion. It updates the Issue with the existing Discussion URL and publication marker if necessary.

This handles the critical partial-failure case:

1. GitHub creates the Discussion successfully;
2. updating the source Issue fails;
3. the workflow is retried;
4. the retry finds the existing Discussion marker;
5. the retry reconciles the Issue instead of publishing again.

## Failure behavior

Before Discussion creation, any validation, lookup, permission, cooldown, or duplicate-check failure stops publication and leaves the Issue without a published marker.

After Discussion creation, failure to update the Issue is recoverable through marker reconciliation on retry.

The workflow should emit bounded diagnostics in Actions logs. It should not automatically mention the candidate again, create a second Discussion, or post repeated failure comments.

A manual workflow rerun is sufficient for transient failures in v1.

## Rate and anti-spam policy

- maximum one candidate per scheduled run;
- normal cadence is Monday and Thursday;
- maximum two successful outreach publications per week under the configured schedule;
- 30-day cooldown for the same candidate;
- permanent deduplication by `topicKey` unless the contract version later defines an explicit supersession mechanism;
- exactly one external mention in a published Discussion;
- zero external mentions in the source Issue and stored template;
- no automated follow-up ping;
- no publication when fit or novelty is uncertain;
- skipped runs are valid outcomes.

## Security boundaries

The Issue is untrusted text until the relay validates it, even when an early workflow condition checks the author.

The relay must:

- re-fetch current Issue state;
- use explicit schema validation and bounded strings;
- keep GraphQL documents static and pass untrusted values only through variables;
- never interpolate Issue content into shell commands;
- avoid logging tokens or secret-bearing headers;
- use the repository-scoped `GITHUB_TOKEN` only;
- request only `contents: read`, `issues: write`, and `discussions: write`;
- reject unexpected contract keys if strict parsing is selected in implementation planning;
- fail closed when GitHub state required for a decision cannot be read.

An arbitrary external Issue must not be able to use the workflow as a general-purpose Discussion publisher.

## Testing strategy

Implementation follows TDD.

### Unit tests

Cover at minimum:

- extraction of exactly one contract block;
- malformed JSON;
- unsupported schema;
- trusted metadata fields;
- candidate login validation;
- bot candidate rejection;
- zero Issue mentions;
- zero template mentions;
- exactly one `{{candidate}}` placeholder;
- correct single-mention rendering;
- rejection of extra placeholders or mentions;
- topicKey validation;
- title and body limits;
- Discussion marker construction;
- published Issue marker parsing and construction;
- candidate cooldown calculation;
- topic duplicate detection;
- current-Issue exclusion from duplicate checks.

### Integration tests

Mock GitHub API and GraphQL boundaries to cover:

- authoritative Issue re-fetch;
- trusted and untrusted Issue authors;
- category resolution;
- successful `createDiscussion`;
- existing Discussion marker reconciliation;
- Discussion succeeds but Issue update fails;
- retry after partial failure;
- missing or ambiguous Ideas category;
- candidate cooldown hit;
- duplicate topic hit;
- API or permission failure before publication;
- Issue update with visible Discussion link and hidden publication marker.

### Workflow contract tests

Assert:

- trigger is only `issues: [opened]`;
- no privileged untrusted trigger such as `pull_request_target` exists;
- permissions are exactly the intended least-privilege set;
- workflow calls the tested TypeScript relay rather than duplicating business logic in YAML;
- Issue-controlled strings are not interpolated into workflow shell source.

## ChatGPT Schedule update

The existing twice-weekly ChatGPT automation stays in draft-only mode until the relay is implemented, reviewed, merged, and verified.

After deployment, update it so each run:

1. researches public candidates and current `get-fable` context;
2. checks prior published outreach records;
3. enforces candidate cooldown and topic novelty;
4. skips if no strong candidate exists;
5. creates exactly one owner-authored contribution Issue with the v1 contract and neutral `{{candidate}}` placeholder;
6. performs no other GitHub mutation for that outreach run.

The schedule remains Monday and Thursday in `Africa/Cairo`.

## Rollout

1. Write an implementation plan after this spec is reviewed.
2. Implement contract and policy modules through TDD.
3. Implement GitHub query, reconciliation, and publication boundaries with mocked integration tests.
4. Add the least-privilege GitHub Actions workflow and workflow contract tests.
5. Run focused tests, full tests, typecheck, build, and existing repository checks.
6. Open a Pull Request from the feature branch.
7. Review the actual diff and CI evidence before merge.
8. Merge only after the implementation is verified.
9. Update the ChatGPT scheduled task from draft mode to end-to-end Issue creation.
10. Observe the first real scheduled publication for correct Issue/Discussion linking and idempotency.

## Acceptance criteria

The feature is complete when:

- one valid scheduled Issue can cause exactly one Discussion to be created;
- the Issue itself sends no external mention notification;
- the Discussion contains exactly one intended candidate mention;
- a workflow retry cannot create a duplicate Discussion for the same source Issue;
- the same candidate cannot be published again inside 30 days;
- an existing topicKey cannot be republished;
- untrusted or malformed Issues cannot publish Discussions;
- failed GitHub reads required for a policy decision stop publication;
- successful publication is recorded back on the Issue with a durable marker and link;
- all focused and existing repository checks pass;
- delivery happens through a Pull Request rather than direct mutation of `master`.
