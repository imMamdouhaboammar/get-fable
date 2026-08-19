<div align="center">

<img src="assets/mascot.svg" alt="get-fable rabbit mascot" width="124" height="124"/>

# get-fable

### A real engineering workflow for AI coding agents

**Codex, Claude Code, Gemini, Cursor and other coding agents can write code fast. get-fable helps them know what to do before, during, and after the code**

[![npm version](https://img.shields.io/npm/v/get-fable?style=flat-square&color=3178C6)](https://www.npmjs.com/package/get-fable)
[![CI](https://github.com/imMamdouhaboammar/get-fable/actions/workflows/ci.yml/badge.svg)](https://github.com/imMamdouhaboammar/get-fable/actions/workflows/ci.yml)
[![Security](https://github.com/imMamdouhaboammar/get-fable/actions/workflows/security.yml/badge.svg)](https://github.com/imMamdouhaboammar/get-fable/actions/workflows/security.yml)
[![E2E](https://github.com/imMamdouhaboammar/get-fable/actions/workflows/e2e.yml/badge.svg)](https://github.com/imMamdouhaboammar/get-fable/actions/workflows/e2e.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square)](./LICENSE)

**25 connected Skills · durable project state · verification that goes stale when the code changes · recovery when the agent gets stuck**

```bash
bun add -g get-fable
```

[Get started](#start-in-under-a-minute) · [See how it works](#one-task-one-clear-process) · [Explore the Skills](#25-connected-skills-one-lifecycle) · [Read the docs](#documentation)

</div>

---

## Your coding agent probably does not need another prompt

Most AI coding failures are not really about writing code

They happen around the code

The agent starts editing before it understands the repository. It guesses how a library works instead of checking the current docs. It fixes the symptom without writing the failing test. It retries the same broken approach three times. It runs tests, changes more files, then still calls the old test run “proof”

And when the patch looks good enough, it says **done**

`get-fable` gives the agent a repeatable way to work through those moments instead of leaving them to chance

```text
WITHOUT GET-FABLE

Prompt
  ↓
Start editing
  ↓
Patch until it looks right
  ↓
Maybe run tests
  ↓
"Done"

WITH GET-FABLE

Understand the repo
  ↓
Route the task
  ↓
Plan the work
  ↓
Test the behavior
  ↓
Implement
  ↓
Verify fresh evidence
  ↓
Review
  ↓
Ship or recover
```

It is not trying to make the model smarter

It gives the model a better way to work

---

## One task, one clear process

Give the agent a normal engineering request

```text
Fix the token refresh race condition and make sure it does not come back
```

Instead of immediately changing files, get-fable can guide the work through the steps that actually matter

```text
Inspect the auth path
→ reproduce the race
→ write the regression test
→ make the smallest fix
→ run affected tests
→ verify the behavior
→ review the diff
→ check release readiness
```

The exact route changes with the task

An unfamiliar API should trigger research before implementation. A repeated failure should trigger diagnosis instead of another patch. A release request should check the package, CI, security and current evidence before calling anything ready

That is the point of get-fable: **the workflow follows the work**

---

## More than a prompt pack

A prompt can tell an agent to “verify your work”

get-fable can track that the repository changed *after* verification and treat the old proof as stale

A prompt can say “do not keep retrying the same thing”

get-fable can detect repeated failures and move the work into recovery before another edit

A prompt can say “use TDD when appropriate”

get-fable has a dedicated TDD Skill with explicit red/green gates, connected to verification and review

A prompt is an instruction

get-fable combines **Skills, routing, durable state, mutation tracking, evidence, hooks and recovery behavior** so the process can survive a long coding session instead of living only in chat context

---

## 25 connected Skills, one lifecycle

You do not have to remember which Skill to invoke for every task

The router looks at the job and selects the specialist behavior that fits it, while the rest of the lifecycle stays connected around it

```text
DISCOVER
   ↓
RESEARCH
   ↓
PLAN
   ↓
TDD / DELEGATE / EXECUTE
   ↓
VERIFY
   ↓
REVIEW / SECURITY
   ↓
RELEASE
   ↓
HANDOFF
   ↓
EVAL

Repeated failure or contradictory evidence
   ↓
RECOVER
```

The 25 canonical Skills cover the full working cycle

- **Understand** — `get-fable`, `fable-discover`, `fable-research`, `fable-plan`
- **Build** — `fable-tdd`, `fable-delegate`, `fable-execute`
- **Prove** — `fable-verify`, `fable-review`, `fable-security`
- **Deliver** — `fable-release`, `fable-handoff`
- **Improve** — `fable-eval`, `fable-recover`
- **Extended work** — `fable-spark`, `fable-run`, `fable-memory`, `fable-simulator`, `fable-simplify`, `fable-cowork`, `fable-config`, `fable-dataviz`, `fable-artifact`, `fable-loop`, `skill-creator`

[Explore the canonical Skill catalog →](docs/CANONICAL_SKILLS.md)

---

## Fable Spark: the smallest useful next move

Sometimes the hard part is not writing the code

It is knowing what the agent should do **next**

`get-fable spark` reads the current work state and suggests one atomic action instead of another paragraph of advice

```text
reproduce the bug
write the failing test
check the official docs
review the diff
rerun affected tests
diagnose repeated failure
prepare the handoff
```

That makes Spark useful during long sessions where the agent has already accumulated context, edits, test runs and failed attempts

```bash
get-fable spark
```

---

## Works with the coding agent you already use

get-fable is portable across the major coding-agent environments rather than being tied to one model or one editor

**Claude Code · Antigravity · Codex · OpenCode · Cursor · Kiro · Kimi · DeepSeek · Pi Code**

Integration depth depends on what each host exposes today

- **Full lifecycle integration** — Claude Code, Antigravity
- **Skill + rule integration** — Codex, OpenCode
- **Advisory rule integration** — Cursor, Kiro, Kimi, DeepSeek, Pi Code

That distinction is deliberate. get-fable does not pretend every host supports the same hooks or enforcement APIs

[See the host capability matrix →](hosts/README.md)

<details>
<summary><strong>Installation commands by host</strong></summary>

```bash
get-fable install all
get-fable install claude
get-fable install antigravity
get-fable install codex
get-fable install cursor
get-fable install opencode
get-fable install kimi
get-fable install deepseek
get-fable install kiro
get-fable install pi
```

Claude Code marketplace installation is also available

```bash
/plugin marketplace add imMamdouhaboammar/get-fable
/plugin install get-fable@get-fable
```

</details>

---

## Start in under a minute

get-fable is Bun-first and requires **Bun 1.3+**

Install it globally

```bash
bun add -g get-fable
```

Or, if you already have Bun installed and prefer npm

```bash
npm install -g get-fable
```

Then initialize it inside a project

```bash
cd your-project
get-fable init
```

Route a real task

```bash
get-fable route "Fix the checkout race condition and verify it with a regression test"
```

Ask for the next useful move

```bash
get-fable spark
```

Check the installation and evidence state

```bash
get-fable doctor
```

You can also try the CLI without a global install

```bash
bunx get-fable --help
npx get-fable --help
```

---

## Where it pays off

### Fixing a bug

The agent reproduces the behavior, writes the regression test, makes the smallest fix and verifies the affected path instead of patching first and reasoning afterward

### Building a feature

Discovery and planning happen before a large implementation starts, then the work moves through testing, implementation, review and release readiness

### Working with an unfamiliar API

The task can route to current primary-source research before code is written, reducing the chance that stale library knowledge turns into a bad implementation

### Getting stuck

Repeated failures are a signal to stop mutating the code and form a better diagnosis, not an invitation to try the same idea again with slightly different syntax

### Preparing a release

Tests are only one part of the decision. get-fable can also account for package boundaries, security checks, CI state and whether the evidence is still fresh

---

## Built to prove behavior, not just describe it

The project treats “the Skill exists” and “the Skill behaves correctly” as two different claims

For the current release, the 22 action-oriented Skills were evaluated across **115 blinded external-provider cases** covering known, negative, ambiguous, adversarial and holdout scenarios. The recorded run passed **115/115** with **0 forbidden-action violations**. The router, Spark and Verify use their own dedicated enterprise corpora and frozen holdout evidence, bringing all **25 canonical Skills to M4 evidence-backed maturity**

The evidence is tied to the Skill corpus it tested. Change the subject under test and the old result becomes stale instead of quietly remaining “green”

That same bias toward observable proof appears elsewhere in the project through Cypress E2E, CodeQL, dependency review, TruffleHog secret scanning, pinned GitHub Actions and mutation-aware verification

[Read the behavioral evidence protocol →](docs/BEHAVIOR_EVIDENCE.md)

---

## A few commands you will actually use

```bash
get-fable init
get-fable route "your task"
get-fable spark
get-fable doctor
get-fable feed list
get-fable graph
get-fable recipes
get-fable packs
get-fable behavior-eval status
```

For machine consumers, legacy `--json` output remains available and supported commands can also use the additive versioned `--json-v1` envelope

[Read the full usage guide →](docs/USAGE.md)

---

## Local-first by default

get-fable is designed to add process without turning your repository into a telemetry product

- telemetry is disabled by default
- state and evidence live locally with the project
- the CLI has zero production npm dependencies
- Skill installation rejects traversal and symlink escapes
- local proxy defaults bind to loopback
- GitHub Actions are pinned to immutable commit SHAs

For the full security and trust boundary, see [SECURITY.md](SECURITY.md)

---

## Distribution

- **npm** — [`get-fable`](https://www.npmjs.com/package/get-fable)
- **GitHub Releases** — [release history](https://github.com/imMamdouhaboammar/get-fable/releases)
- **Homebrew formula** — [`Formula/get-fable.rb`](Formula/get-fable.rb)
- **Agent packaging** — Claude, Codex, Gemini, Cursor, OpenCode, Kimi, DeepSeek, Kiro and Pi manifests ship with the repository/package

---

## Documentation

When you want the implementation details, they are kept out of the main product story and documented separately

- [Getting started and CLI usage](docs/USAGE.md)
- [Canonical Skills](docs/CANONICAL_SKILLS.md)
- [Host compatibility](docs/COMPATIBILITY.md)
- [Behavioral evidence](docs/BEHAVIOR_EVIDENCE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Plugin distribution](docs/PLUGIN.md)
- [Release process](docs/RELEASE.md)
- [Security](SECURITY.md)
- [Support](SUPPORT.md)
- [Contributing](CONTRIBUTING.md)

---

<div align="center">

## Your agent already knows how to write code

### Give it a better way to work

```bash
bun add -g get-fable
get-fable init
```

[Get started](docs/USAGE.md) · [Explore the Skills](docs/CANONICAL_SKILLS.md) · [View releases](https://github.com/imMamdouhaboammar/get-fable/releases) · [Report an issue](https://github.com/imMamdouhaboammar/get-fable/issues)

<br/>

MIT licensed

</div>
