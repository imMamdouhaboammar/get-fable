# Automated Contributor Outreach Design

**Status:** Approved design, pending implementation plan  
**Date:** 2026-09-13  
**Target repository:** `imMamdouhaboammar/get-fable`  
**Execution model:** ChatGPT Schedule -> GitHub Issue -> GitHub Action -> GitHub Discussion

## Purpose

Create a twice-weekly, end-to-end contributor outreach pipeline that identifies one genuinely relevant open-source contributor, creates one real contribution opportunity in `get-fable`, and publishes one linked GitHub Discussion containing a single targeted `@mention`.

The pipeline must generate useful repository artifacts even when the targeted person never responds. It must not behave like a mass-mention or promotional bot.

## Goals

The automation must:

1. Run twice each week from ChatGPT Schedule.
2. Select at most one external contributor per run.
3. Ground the choice in public GitHub work with concrete overlap to `get-fable`.
4. Avoid duplicate people, duplicate topics, and repeated outreach within the cooldown window.
5. Create a real GitHub Issue that remains useful as a contribution opportunity.
6. Publish one GitHub Discussion in the `Ideas` category through a repository-owned GitHub Action.
7. Put the external `@mention` only in the Discussion.
8. Link the Issue and Discussion after publication.
9. Fail closed when validation, category lookup, deduplication, or publication cannot be proven safe.
10. Preserve an auditable record of every automated outreach attempt.

## Non-goals

This design does not:

- send direct messages, emails, collaborator invitations, or review requests;
- post on another person's repository;
- create multiple mentions in one run;
- scrape private data;
- close the contribution Issue after publication;
- use engagement metrics as a reason to repeatedly contact the same person;
- manufacture a Discussion whose only purpose is promotion.

## High-level flow

```text
ChatGPT Schedule
  -> inspect get-fable + existing outreach
  -> research one candidate
  -> validate fit + cooldown + topic uniqueness
  -> create one GitHub Issue with outreach metadata
  -> GitHub Actions issues event
  -> validate trusted issue contract
  -> resolve Ideas discussion category
  -> create Discussion through GitHub GraphQL
  -> attach deterministic marker
  -> update Issue with Discussion URL + publication state
```

## ChatGPT Schedule responsibilities

The scheduled ChatGPT run owns candidate discovery and editorial judgment.

Each run must:

1. Inspect the current `get-fable` README, relevant architecture/docs, open Issues, and prior outreach Issues/Discussions.
2. Research public GitHub activity for potential contributors.
3. Select exactly one candidate only when a specific technical overlap exists.
4. Prefer a technical RFC or implementation question that is independently useful to `get-fable`.
5. Check whether the same GitHub username was targeted within the previous 30 days.
6. Check whether the same normalized topic was already used.
7. Create no artifact if a safe, justified candidate cannot be found.
8. Create one Issue carrying the publication contract and the contribution opportunity.

The scheduled run must not publish a Discussion directly. GitHub Discussion creation is delegated to the repository-owned relay because the connected GitHub action surface available to ChatGPT can create Issues but does not expose a create-Discussion mutation.

## Issue contract

The ChatGPT run creates one Issue with label:

```text
outreach:publish
```

The Issue is a real contribution opportunity. It must not merely say that outreach happened.

Suggested title form:

```text
Contribution opportunity: <specific technical problem>
```

The body contains human-readable context plus one machine-readable JSON block:

```json
{
  "schema": 1,
  "candidate": "obra",
  "topicKey": "lifecycle-gates-vs-advisory-skills",
  "discussionTitle": "RFC: Should coding-agent skills enforce lifecycle gates or remain advisory?",
  "discussionCategory": "Ideas",
  "discussionBody": "...",
  "sourceIssuePurpose": "contribution-opportunity",
  "createdBy": "chatgpt-scheduled-outreach"
}
```

The Discussion body may contain exactly one external GitHub `@mention`, corresponding to `candidate`.

The Issue body must contain no external `@mention` for the candidate.

## Publication relay

A new workflow listens to Issue events and runs only when the Issue contains `outreach:publish`.

Proposed workflow:

```text
.github/workflows/publish-outreach-discussion.yml
```

Proposed implementation entrypoint:

```text
scripts/publish-outreach-discussion.ts
```

The workflow permissions are narrowly scoped:

```yaml
permissions:
  contents: read
  issues: write
  discussions: write
```

The workflow must never accept arbitrary executable content from the Issue.

The script parses only the declared JSON contract and treats all values as data.

## Validation gates

Publication is allowed only if every gate passes.

### Repository and event gate

- event repository must be `imMamdouhaboammar/get-fable`;
- event must refer to an Issue, not a Pull Request;
- Issue must be open;
- Issue must have `outreach:publish`;
- Issue author must be the repository owner or another explicitly allowlisted trusted actor;
- schema version must be supported.

### Candidate gate

- candidate is a valid GitHub login token;
- candidate is not the repository owner;
- candidate is not a bot account name by configured suffix/pattern policy;
- candidate appears exactly once as an `@mention` in the Discussion body;
- Issue body contains zero candidate mentions.

### Content gate

- title and body must be non-empty and bounded in length;
- category must equal the configured allowed category, initially `Ideas`;
- Discussion body must include a concrete technical question;
- body must not contain additional external mentions;
- topicKey must satisfy a stable slug grammar.

### Duplicate and cooldown gate

The relay must fail closed when publication appears duplicated.

Before creating a Discussion it checks:

1. whether the Issue already records a published Discussion URL;
2. whether a recent Discussion already contains the deterministic marker for this Issue;
3. whether a previously published outreach record targets the same candidate inside the configured 30-day cooldown;
4. whether the same `topicKey` has already been published.

The canonical marker is:

```html
<!-- get-fable-outreach:issue-<number> -->
```

The marker is appended to the Discussion body by the relay, not supplied by ChatGPT.

## Discussion creation

The relay resolves the configured Discussion category dynamically through GitHub GraphQL and must find exactly one category named `Ideas`.

It then calls `createDiscussion` with repository ID, resolved category ID, validated title, and validated body plus the deterministic Issue marker.

The workflow must not hardcode a category node ID because category IDs are repository-specific and may change if Discussions are reconfigured.

## Post-publication state

After successful Discussion creation, the workflow updates the source Issue with the Discussion URL, publication timestamp, candidate, and topicKey.

It then:

- adds `outreach:published`;
- removes `outreach:publish`;
- keeps the Issue open.

The Issue remains the implementation/contribution surface. The Discussion remains the architectural/community discussion surface.

## Failure behavior

The relay is fail-closed.

On validation or publication failure it must:

- not create a partial second Discussion;
- not silently mutate the Issue into a published state;
- add a bounded diagnostic comment or failure label such as `outreach:failed` when Issue write access is available;
- preserve enough context to retry safely after correction;
- re-check idempotency before every retry.

A retry after a successful Discussion creation but before Issue state update must discover the existing Issue marker and reconcile instead of creating another Discussion.

## Rate and anti-spam policy

The policy is intentionally stricter than the twice-weekly scheduler cadence.

- maximum one candidate per scheduled run;
- maximum two publication attempts per week under normal operation;
- 30-day candidate cooldown;
- one external mention per Discussion;
- zero candidate mentions in the paired Issue;
- no outreach when candidate fit is weak or topic novelty cannot be established;
- no automated follow-up ping if the candidate does not reply.

The automation is allowed to skip a scheduled run.

## Audit state

The Issue itself is the durable audit record. Publication metadata is stored in the Issue body or a deterministic bot comment and through state labels.

No separate database is required for v1.

The ChatGPT scheduler should search prior Issues using the outreach labels and candidate/topic metadata before creating a new Issue.

## Labels

The implementation should ensure these repository labels exist or document the one-time setup requirement:

```text
outreach:publish
outreach:published
outreach:failed
```

## Security boundaries

Untrusted Issue text must never be evaluated as JavaScript, shell, GitHub Actions expressions, or GraphQL source code.

The relay must construct GraphQL variables separately from the static mutation, avoid shell interpolation of Issue-controlled values, use bounded parsing and explicit schemas, redact tokens from logs, use the repository-scoped `GITHUB_TOKEN` only, and request only the permissions required for publication and Issue state reconciliation.

A fork or arbitrary external Issue must not be able to use the workflow as a general-purpose Discussion publisher.

## Testing strategy

Implementation follows TDD.

### Unit tests

Cover metadata extraction, malformed/missing schema, login validation, mention counting, additional-mention rejection, Issue mention rejection, topicKey validation, title/body bounds, publication marker creation, existing marker reconciliation, cooldown decision logic, duplicate topic detection, and safe GraphQL variable construction.

### Integration tests

Use mocked GitHub API responses to cover category resolution, successful `createDiscussion`, duplicate marker recovery, Discussion creation followed by initial Issue-update failure, category missing/ambiguous, permission/API failure, and state-label reconciliation.

### Workflow contract tests

Assert the trigger is restricted to Issue events, the job requires `outreach:publish`, permissions remain `contents: read`, `issues: write`, `discussions: write`, no `pull_request_target` or other untrusted privileged trigger is introduced, and the workflow executes the tested TypeScript entrypoint instead of embedding business logic in YAML.

## ChatGPT Schedule update

After the relay is merged and verified, the existing `get-fable Outreach Draft` automation is updated so each run researches candidates and repository state, enforces the 30-day candidate cooldown and topic deduplication, skips when no justified candidate exists, creates exactly one Issue with `outreach:publish` and the v1 metadata contract, and does not separately publish or comment after Issue creation.

The schedule remains twice weekly on Monday and Thursday in `Africa/Cairo`.

## Rollout

1. Implement parser, policy, and tests.
2. Add GitHub workflow with least-privilege permissions.
3. Verify Discussions are enabled and `Ideas` exists.
4. Test the relay with non-mention fixtures in automated tests.
5. Merge the implementation PR.
6. Update the ChatGPT scheduled task to publication mode.
7. Observe the first real run and verify Issue/Discussion linking and idempotency.

## Acceptance criteria

The feature is complete when a scheduled ChatGPT run can create one valid outreach Issue; the repository workflow publishes exactly one linked Discussion; the Discussion includes exactly one intended external mention; the Issue includes no external candidate mention; duplicate retries do not create duplicate Discussions; candidate cooldown and topic deduplication are enforced; publication state is reflected back onto the Issue; all new unit, integration, workflow contract, typecheck, and existing repository tests pass; and the final implementation is delivered through a reviewed Pull Request rather than direct changes to `master`.
