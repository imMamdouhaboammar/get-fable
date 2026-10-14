# Durable Fact Lifecycle

A durable memory record should be useful months later without becoming a stale hidden instruction.

## Persist only what changes future decisions
Good candidates:
- explicit user preference that recurs;
- repository runtime/tooling constraint;
- architecture decision and rationale;
- stable naming/contribution/release convention.

Poor candidates:
- current test failure;
- temporary branch name unless part of handoff;
- speculative diagnosis;
- external API fact likely to change;
- one-time personal/conversational detail unrelated to future work.

## Scope is part of the fact
These are different memories:
- `get-fable uses Bun for package management`;
- `all projects owned by this user use Bun`.

Do not broaden scope unless the user explicitly does.

## Provenance
For consequential facts record how you know:
- explicit user instruction;
- repository file/commit;
- architectural decision document;
- verified repeated preference.

Provenance lets a future agent resolve conflict when reality changes.

## Supersession
Avoid two active contradictory records. When a decision changes:
- mark old record superseded;
- link new record;
- keep rationale/history if future migration/debugging may depend on it.

## Time-sensitive facts
External versions, office holders, pricing, API limits, dependency behavior, and service capabilities age quickly. Prefer storing a revalidation instruction/source rather than treating a snapshot as timeless truth.

## Retrieval policy
Before applying memory ask:
1. Does scope match this task/repo?
2. Is current user instruction different?
3. Does repository/source evidence contradict it?
4. Is the fact time-sensitive enough to revalidate?
5. Has a newer record superseded it?

## Security
Credentials never belong in durable memory. If continuity needs authentication, store only the secure mechanism to use (credential manager, `gh auth`, CI OIDC, environment secret), not the secret itself.

## Conflict example
Stored: `package manager: npm` (project scope, 2025)
Current `package.json` + user instruction: Bun-only

Correct action: supersede old project record, cite current evidence, do not maintain both as active preferences.