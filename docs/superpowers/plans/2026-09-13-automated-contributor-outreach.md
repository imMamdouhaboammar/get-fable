# Automated Contributor Outreach Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved twice-weekly contributor outreach relay so a trusted source Issue can publish exactly one deduplicated GitHub Discussion containing exactly one intended external mention.

**Architecture:** Keep editorial candidate selection outside the repository and make the repository-owned relay the publication trust boundary. Parse and validate a strict Issue contract, re-read GitHub state, enforce cooldown and topic uniqueness, reconcile existing Discussion state before creation, then publish through a static GraphQL mutation and write durable publication metadata back to the Issue.

**Tech Stack:** Bun >=1.3, TypeScript ES2022/ESNext, `bun:test`, native `fetch`, GitHub REST API, GitHub GraphQL API, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-13-automated-contributor-outreach-design.md`

## Global Constraints

- Repository is exactly `imMamdouhaboammar/get-fable`.
- Source Issues must be open, owner-authored, and begin with `Contribution opportunity:`.
- Contract schema is exactly version `1` with `createdBy: chatgpt-scheduled-outreach` and `sourceIssuePurpose: contribution-opportunity`.
- The source Issue and stored Discussion template contain zero external `@mentions`.
- The Discussion template contains exactly one literal `{{candidate}}` placeholder.
- The rendered Discussion contains exactly one external mention and it must be the intended candidate.
- Discussion category is exactly `Ideas` in v1.
- Same candidate cannot be published again inside 30 days.
- A previously published `topicKey` cannot be reused.
- Publication is reconcile-before-create and must be idempotent across retries.
- GitHub reads needed for trust, deduplication, or reconciliation fail closed.
- Workflow permissions are only `contents: read`, `issues: write`, and `discussions: write`.
- No `pull_request_target`, shell evaluation of Issue content, external persistence, automated follow-up ping, or direct mutation of `master`.

---

### Task 1: Contract parser and mention isolation

**Files:**
- Create: `src/outreach/contract.ts`
- Create: `test/outreach-contract.test.ts`

**Interfaces:**
- Produces: `OutreachContract`, `parseOutreachContract(issueBody: string): OutreachContract`, `renderDiscussionBody(contract: OutreachContract, issueNumber: number): string`.

- [ ] **Step 1: Write failing contract tests**

Cover extraction of exactly one fenced `get-fable-outreach-v1` block, malformed JSON, unsupported schema, unexpected keys, trusted metadata constants, username grammar, bot-account rejection, lowercase `topicKey` grammar, category `Ideas`, maximum string lengths, zero `@mentions` in source/template, and exactly one `{{candidate}}` placeholder.

- [ ] **Step 2: Verify RED**

Run: `bun test test/outreach-contract.test.ts`

Expected: FAIL because `src/outreach/contract.ts` does not exist.

- [ ] **Step 3: Implement minimal strict parser**

Use manual runtime validation with an explicit allowed-key set so no new dependency is introduced. Bound candidate to 39 characters, `topicKey` to 120, title to 200, body template to 8,000, and contribution-purpose metadata to the exact v1 constants.

- [ ] **Step 4: Implement deterministic renderer**

Replace the single placeholder with `@${candidate}`, verify the rendered body has exactly one `@` mention token and it matches the candidate, then append `<!-- get-fable-outreach:issue-N -->`.

- [ ] **Step 5: Verify GREEN**

Run: `bun test test/outreach-contract.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

`git commit -m "feat(outreach): validate publication contract"`

### Task 2: Durable publication markers and policy checks

**Files:**
- Create: `src/outreach/policy.ts`
- Create: `test/outreach-policy.test.ts`

**Interfaces:**
- Consumes: `OutreachContract`.
- Produces: `PublicationRecord`, `discussionIssueMarker(issueNumber)`, `parsePublicationRecord(body)`, `appendPublicationRecord(body, record)`, `isCandidateCoolingDown(records, candidate, now)`, `isTopicPreviouslyPublished(records, topicKey)`.

- [ ] **Step 1: Write failing policy tests**

Cover marker construction, valid and malformed publication marker parsing, append-without-duplication, 30-day boundary behavior, candidate matching case-insensitively, permanent topic duplicate detection, and exclusion of the current Issue from comparison input.

- [ ] **Step 2: Verify RED**

Run: `bun test test/outreach-policy.test.ts`

Expected: FAIL because policy functions do not exist.

- [ ] **Step 3: Implement minimal pure policy functions**

Use ISO timestamps and elapsed milliseconds for the 30-day rule. Treat malformed prior markers as non-records, but leave API/read failures to the GitHub boundary so the relay can fail closed.

- [ ] **Step 4: Verify GREEN**

Run: `bun test test/outreach-policy.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat(outreach): add publication policy state"`

### Task 3: GitHub REST and GraphQL boundary

**Files:**
- Create: `src/outreach/github.ts`
- Create: `test/outreach-github.test.ts`

**Interfaces:**
- Produces: `GitHubOutreachClient` with `getIssue`, `listOutreachIssues`, `findDiscussionByIssueMarker`, `resolveIdeasCategory`, `createDiscussion`, and `updateIssueBody`.
- Constructor consumes `token`, `owner`, `repo`, and optional injected `fetch` for tests.

- [ ] **Step 1: Write failing boundary tests**

Use an injected fake fetch to assert HTTP methods, endpoints, authorization headers, static GraphQL documents, variable use for untrusted strings, pagination handling for Issues/Discussions, exact `Ideas` category resolution, and useful errors for non-2xx or GraphQL errors.

- [ ] **Step 2: Verify RED**

Run: `bun test test/outreach-github.test.ts`

Expected: FAIL because the client does not exist.

- [ ] **Step 3: Implement REST helpers**

Use `https://api.github.com/repos/{owner}/{repo}` with `Accept: application/vnd.github+json`, bearer auth, API version header, and bounded pagination.

- [ ] **Step 4: Implement GraphQL helpers**

Use `https://api.github.com/graphql`. Keep query/mutation source constant and pass repository/category/title/body values only through variables.

- [ ] **Step 5: Verify GREEN**

Run: `bun test test/outreach-github.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

`git commit -m "feat(outreach): add GitHub publication client"`

### Task 4: Trusted relay orchestration and reconciliation

**Files:**
- Create: `src/outreach/relay.ts`
- Create: `test/outreach-relay.test.ts`

**Interfaces:**
- Consumes: `GitHubOutreachClient`, contract/policy helpers.
- Produces: `publishOutreachForIssue({ client, issueNumber, now, repository }): Promise<RelayResult>`.

- [ ] **Step 1: Write failing relay tests**

Cover canonical-repository rejection, Issue-vs-PR validation, open-state requirement, trusted author allowlist, title prefix, authoritative Issue re-fetch, pre-existing publication marker short-circuit, existing Discussion reconciliation, candidate cooldown, duplicate topic, missing/ambiguous Ideas category, successful publication, Discussion-success/Issue-update-failure, and retry reconciliation after partial failure.

- [ ] **Step 2: Verify RED**

Run: `bun test test/outreach-relay.test.ts`

Expected: FAIL because relay orchestration does not exist.

- [ ] **Step 3: Implement fail-closed gates**

Perform all trust and policy reads before creation. Do not catch and downgrade required GitHub read failures.

- [ ] **Step 4: Implement reconcile-before-create**

Check Issue publication metadata first, then search for the deterministic Discussion marker. If a Discussion exists, append/recover the Issue publication record without creating a new Discussion.

- [ ] **Step 5: Implement creation path**

Resolve `Ideas`, render one mention, create Discussion, then write a visible `Related Discussion` link plus hidden v1 publication JSON marker to the Issue.

- [ ] **Step 6: Verify GREEN**

Run: `bun test test/outreach-relay.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

`git commit -m "feat(outreach): add idempotent publication relay"`

### Task 5: Executable entry point and workflow contract

**Files:**
- Create: `scripts/publish-outreach-discussion.ts`
- Create: `.github/workflows/publish-outreach-discussion.yml`
- Create: `test/outreach-workflow.test.ts`

**Interfaces:**
- Script consumes `GITHUB_TOKEN`, `GITHUB_REPOSITORY`, and Issue number from `GITHUB_EVENT_PATH`.
- Workflow invokes the tested TypeScript script with Bun.

- [ ] **Step 1: Write failing workflow-contract tests**

Read the workflow as text and assert only `issues: [opened]`, exact permissions, canonical repository/owner cheap condition, no `pull_request_target`, no Issue-body interpolation into shell, and invocation of `bun scripts/publish-outreach-discussion.ts`.

- [ ] **Step 2: Verify RED**

Run: `bun test test/outreach-workflow.test.ts`

Expected: FAIL because workflow/script do not exist.

- [ ] **Step 3: Implement the entry script**

Read the event JSON as data, extract `issue.number`, require token/repository environment values, instantiate the client, call the relay, and emit bounded result diagnostics without logging secrets or Issue body content.

- [ ] **Step 4: Implement least-privilege workflow**

Use `actions/checkout`, `oven-sh/setup-bun`, `bun install --frozen-lockfile`, and the relay script. Restrict the job to `github.repository == 'imMamdouhaboammar/get-fable' && github.event.issue.user.login == 'imMamdouhaboammar'` as an early filter while retaining authoritative checks in TypeScript.

- [ ] **Step 5: Verify GREEN**

Run: `bun test test/outreach-workflow.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

`git commit -m "ci(outreach): publish trusted Issues as Discussions"`

### Task 6: Full verification and security review

**Files:**
- Modify only if verification identifies a concrete defect.

- [ ] **Step 1: Run focused suite**

`bun test test/outreach-contract.test.ts test/outreach-policy.test.ts test/outreach-github.test.ts test/outreach-relay.test.ts test/outreach-workflow.test.ts`

Expected: all PASS.

- [ ] **Step 2: Run typecheck**

`bun run typecheck`

Expected: PASS.

- [ ] **Step 3: Run full tests**

`bun test --timeout 30000`

Expected: PASS.

- [ ] **Step 4: Run build and repository checks**

`bun run build && bun run check:generated && bun run check:llms`

Expected: PASS.

- [ ] **Step 5: Review the final diff against the approved spec**

Confirm no source Issue mention, no privileged trigger, no dynamic GraphQL source, no token logging, no missing fail-closed read, no duplicate-create window that is recoverable by the specified deterministic marker, and no unrelated repository changes.

- [ ] **Step 6: Commit any verification-only fix atomically**

Use a narrow `fix(outreach): ...` commit only if required.

### Task 7: Pull Request, CI evidence, merge, and scheduler activation

**Files:**
- No new production files expected.

- [ ] **Step 1: Open a PR from `feat/automated-contributor-outreach` to the default branch**

PR body must link the spec and plan, summarize trust boundaries, list focused/full verification evidence, and call out the single-mention guarantee and retry reconciliation behavior.

- [ ] **Step 2: Inspect the actual PR diff**

Reject unrelated files, stale temporary design docs, generated drift, or broader permissions.

- [ ] **Step 3: Wait for and inspect CI**

All required checks must pass. Investigate actual failures instead of retrying blindly.

- [ ] **Step 4: Merge only after evidence is green**

Use the repository's normal merge method.

- [ ] **Step 5: Update the ChatGPT twice-weekly automation**

Change it from draft-only behavior to: research one strong candidate, enforce 30-day cooldown/topic novelty, create one owner-authored contribution Issue with the v1 neutral contract, and perform no other GitHub mutation.

- [ ] **Step 6: Observe the first real publication**

Verify exactly one Issue, exactly one Discussion, exactly one external mention in the Discussion, a correct Related Discussion link/publication marker on the Issue, and safe no-op behavior on workflow rerun.
