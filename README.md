<div align="center">

<img src="assets/mascot.svg" alt="get-fable rabbit mascot" width="120" height="120"/>

# get-fable

### A complete coding lifecycle for AI agents

**Route the job. Keep the state. Prove the result. Recover when the evidence changes.**

[![CI](https://github.com/imMamdouhaboammar/get-fable/actions/workflows/ci.yml/badge.svg)](https://github.com/imMamdouhaboammar/get-fable/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square)](./LICENSE)
[![Bun](https://img.shields.io/badge/runtime-Bun%201.3%2B-FBF0DF?style=flat-square&logo=bun&logoColor=14151A)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**Codex · Claude Code · Antigravity / Gemini · generic Agent Skills**

</div>

## Why this exists

Capable coding models still make predictable process mistakes on long work

They start from an assumption that should have been checked. They keep a plan only in chat history. They retry the same idea after a failure. They treat one passing test as proof of a wider product path. They say `done` after a later edit has already made the earlier verification stale

`get-fable` puts an explicit coding lifecycle around the model

It does not claim to turn one model into another model. It changes the working process around the model

```text
INTAKE
  ↓
DISCOVER / RESEARCH
  ↓
DECIDE / PLAN
  ↓
TDD / DELEGATE / EXECUTE
  ↓
VERIFY / REVIEW / SECURITY
  ↓
RELEASE
  ↓
HANDOFF
  ↓
EVAL

Repeated or contradictory failure
  ↓
RECOVER
  ↓
change the diagnosis before another edit
```

The graph is not a forced wizard. A failed verification can return to recovery. New evidence can send execution back to discovery. A changed assumption can send a card back to planning

## Canonical Skill catalog

`skills/get-fable/registry.json` is the single authoring source for Skill identity, pack membership, lifecycle phase, routing metadata, and ordering. Generated catalogs are checked in and CI fails when they drift.

The current catalog is generated in [`docs/CANONICAL_SKILLS.md`](docs/CANONICAL_SKILLS.md). It includes lifecycle Skills, system Skills, Spark, and Skill authoring support without repeating the list manually in runtime code.

Each registry entry can declare its pack, intents, prerequisites, outputs, gates, fallback, mutation behavior, parallel safety, and valid next Skills.

## Deterministic routing

The router stays explicit and inspectable

```bash
get-fable route "Check the latest official API docs before we implement this"
# fable-research

get-fable route "Fix this regression test-first"
# fable-tdd

get-fable route "Review this diff before merge"
# fable-review

get-fable route "Review this authorization change for vulnerabilities"
# fable-security

get-fable route "The same test still fails after two retries"
# fable-recover
```

A routing decision includes more than the selected skill

```text
selected skill
selected pack
task shape
confidence
reason codes
required gates
fallback skill
parallel candidates
valid next skills
```

The goal is not keyword theater. The router answers a more useful question: **what is missing before this work can safely move forward?**

## State survives the conversation

Initialize a repository once

```bash
get-fable init
```

That creates project-local working state and installs the canonical lifecycle skills

```text
.fable/
  state.json
  LEDGER.md
  PROGRESS.md
  VERIFIER_PROMPT.md

docs/
  SPEC.md

.agents/
  skills/
    get-fable/
    fable-discover/
    fable-research/
    fable-plan/
    fable-tdd/
    fable-delegate/
    fable-execute/
    fable-verify/
    fable-review/
    fable-security/
    fable-release/
    fable-handoff/
    fable-eval/
    fable-recover/
```

State schema v3 tracks

```text
workspace identity
state revision
phase
current skill
active card
failure streak
mutation generation
verified generation
last routing decision
typed evidence
```

The raw local workspace path is not stored as the identity. The runtime hashes the canonical real path instead, so symlink aliases of the same workspace remain one identity while copied state in another workspace is rejected

## Verification belongs to a workspace generation

This is one of the central lifecycle rules

```text
mutationGeneration = 7
verifiedGeneration = 7
=> current proof may close the task

new workspace edit
mutationGeneration = 8
verifiedGeneration = 7
=> earlier proof is stale
```

The CLI can record the same transition explicitly when a host does not expose a write hook

```bash
get-fable mutation "updated authentication handler"
```

Then verify the current generation

```bash
get-fable state verifying
get-fable evidence pass test "bun test" "affected tests passed"
get-fable state complete
```

Substantial work cannot move to `complete` while `verifiedGeneration` is behind `mutationGeneration`

## Evidence types do not mean the same thing

get-fable keeps proof narrow

Generic behavior-completion evidence:

- `test`
- `build`
- `runtime`
- `review`
- `observation`

Scoped security evidence:

- `security` can complete a pure security-review job when that is the routed claim
- `security` does not by itself prove a normal feature, bug fix, or product repair

Decision evidence:

- `research`

Execution provenance:

- `receipt`

Continuity evidence:

- `handoff`

That distinction prevents bad completion shortcuts

A research result can support an implementation decision but cannot prove the implementation works

An execution receipt can support integrity or ordering claims about observed execution but cannot prove code quality or correctness

A security review answers a security question. After a security repair changes product code, the changed behavior still needs behavior-appropriate verification

## Test-first behavior when it is meaningful

A testable feature or bug fix routes to `fable-tdd`

```text
behavior contract
  ↓
red observed
  ↓
smallest production change
  ↓
green observed
  ↓
focused regression check
  ↓
full affected-path verification
```

If a meaningful failing test cannot be produced, the skill routes back to discovery or planning instead of creating a test that only mirrors the implementation

## Delegation without losing ownership

`fable-delegate` permits parallel work only when the work is actually independent

Each worker gets

- one bounded objective
- owned files or product surface
- constraints
- one acceptance condition

The parent agent still owns integration, diff inspection, and the final completion claim

## Security is a route, not a checkbox

`fable-security` first identifies the security question

```text
new privileged architecture
  -> threat model

PR / branch / commit / local diff
  -> security diff review

repository-wide audit
  -> repository security scan

existing finding
  -> validate finding and attack path before repair
```

When Codex Security capabilities are available, the skill can route to the matching specialist workflow. Without them, the same scope discipline still applies through repository-native review and tests

## Recovery changes the diagnosis

After repeated failure, activity is not enough

`fable-recover` checks in this order

1. Is the harness, test, fixture, permission, or environment valid?
2. Is the changed code actually the code that is running?
3. Is the failure in product logic?
4. What invariant would prevent this class of failure?

Another edit is allowed only after the diagnosis has gained new evidence

## Lifecycle hooks

Supported hosts can enforce parts of the policy mechanically

| Hook | Behavior |
|---|---|
| Session start | Restore phase, selected specialist, active card, failure state, and generation freshness |
| Before delegation | Require bounded work before substantial spawning |
| After command / Bash result | Reset failure streak on success; record failures and enter recovery after two consecutive failures |
| After write/edit | Advance `mutationGeneration` so older proof becomes stale |
| Before stop | Reject unfinished or stale substantial completion |

Hooks are advisory or enforcing according to the host capabilities. Host adapters do not own separate lifecycle semantics

## Optional capability adapters

The core does not require external products, but specialist tools can contribute typed evidence

- Riqor can provide ordered run and evidence traces
- AgentProof can provide execution receipt metadata
- Codex Security can provide threat-model, diff-scan, repository-scan, and finding-validation workflows
- current-source search tools can provide external research evidence

Those adapters do not get to widen their claims. A receipt is still a receipt. Research is still research. Security evidence is still scoped security evidence

## Eval the lifecycle itself

Changes to routing, prompts, skills, hooks, or state rules should not be accepted because the wording sounds better

`fable-eval` uses

```text
capability gap
  ↓
reproducible baseline
  ↓
one bounded intervention
  ↓
known scenarios
  ↓
unseen holdouts
  ↓
regression and safety checks
  ↓
accept or reject
  ↓
rollback path
```

The repository includes lifecycle trap scenarios under `eval/scenarios/`

They cover current-doc routing, review-vs-release ambiguity, TDD, repeated failure, security, delegation, handoff, agent-control evals, stale verification, and invalid evidence shortcuts

## Context stays focused

The request compiler does not inject the entire Skill catalog into every model call

It compiles only

```text
core runtime contract
+ selected skill
+ routing reasons
+ required gates
+ compact current state
```

Everything else remains behind the registry and skill pointers until needed

## Quick start

Requires Bun 1.3 or newer

```bash
git clone https://github.com/imMamdouhaboammar/get-fable.git
cd get-fable
bun install
bun ./bin/get-fable.js init
```

Inspect routing

```bash
bun ./bin/get-fable.js route "Refactor authentication across several modules"
```

Check the local setup

```bash
bun ./bin/get-fable.js doctor
bun ./bin/get-fable.js status
```

Install supported global integrations only when you want them

```bash
bun ./bin/get-fable.js install
```

Running get-fable without a command only shows help

## CLI

| Command | Purpose |
|---|---|
| `init` | Create durable project state and canonical project skills |
| `route <task>` | Select and explain the current lifecycle skill |
| `route <task> --apply` | Route the task and persist the decision |
| `spark [intent]` | Predict the atomic next move from current state & evidence (`--json`) |
| `state <phase>` | Move durable state through a valid coarse phase |
| `card <text>` | Set the active bounded work card |
| `mutation [source]` | Record a workspace mutation and stale older verification |
| `evidence ...` | Record typed passing or failing evidence |
| `lint` | Check ledger, state, acceptance, and evidence consistency |
| `doctor` | Validate registry, plugins, project state, skills, and hook runtime |
| `status` | Inspect installation and project state |
| `install` | Install supported global integrations |
| `install-antigravity` | Install the Antigravity / Gemini integration |
| `serve [port]` | Start the local contextual request proxy |
| `assets` | Inspect the optional historical reference library |

## Host support

### Codex / ChatGPT

The repository ships the canonical Agent Skills package, Codex plugin metadata, and specialist agent profiles. The root `skills/` graph remains the source of truth

### Claude Code

```bash
/plugin marketplace add imMamdouhaboammar/get-fable
/plugin install get-fable@get-fable
```

The plugin includes the canonical skills and lifecycle hook configuration

### Antigravity / Gemini

The installer copies the same canonical skill graph, lifecycle hook files, rules, and plugin metadata into the configured Antigravity / Gemini target

### Generic Agent Skills hosts

Consume the root `skills/` directory. Hosts without lifecycle events can still apply mutation, evidence, and state rules explicitly through the skills and CLI

## Operational boundaries

get-fable is intentionally conservative about what it claims and changes

- project-owned initialization targets are not silently replaced
- malformed existing JSON configuration is not treated as empty configuration
- substantial completion requires current-generation evidence appropriate to the routed claim
- schema-v3 runtime state is bound to the canonical real workspace path through a digest, while the tracked repository template remains workspace-neutral and binds during migration
- unexpected hook runtime errors fail open, while invalid project workflow state can block a completion claim
- the request proxy binds to `127.0.0.1` by default
- historical prompt and asset material stays separate from the canonical lifecycle pack
- no model-weight, hidden-reasoning, proprietary-model-equivalence, or guaranteed-correctness claim is made

## Documentation

- [Usage](./docs/USAGE.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Lifecycle v2 specification](./docs/superpowers/specs/2026-08-19-fable-coding-lifecycle-v2.md)
- [Plugin package](./docs/PLUGIN.md)
- [Lifecycle hooks](./hooks/README.md)
- [Security](./SECURITY.md)
- [Third-party notices](./THIRD_PARTY_NOTICES.md)

## License

Original get-fable code is released under the [MIT License](./LICENSE)

Third-party material remains subject to its applicable source terms described in [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)
