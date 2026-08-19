<div align="center">

<img src="assets/mascot.svg" alt="get-fable rabbit mascot" width="124" height="124"/>

# get-fable

### What if the coding agent you already use could work more like Claude Fable?

**Same model. Better working habits. A much stronger coding loop.**

[![npm version](https://img.shields.io/npm/v/get-fable?style=flat-square&color=3178C6)](https://www.npmjs.com/package/get-fable)
[![CI](https://github.com/imMamdouhaboammar/get-fable/actions/workflows/ci.yml/badge.svg)](https://github.com/imMamdouhaboammar/get-fable/actions/workflows/ci.yml)
[![Security](https://github.com/imMamdouhaboammar/get-fable/actions/workflows/security.yml/badge.svg)](https://github.com/imMamdouhaboammar/get-fable/actions/workflows/security.yml)
[![E2E](https://github.com/imMamdouhaboammar/get-fable/actions/workflows/e2e.yml/badge.svg)](https://github.com/imMamdouhaboammar/get-fable/actions/workflows/e2e.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square)](./LICENSE)

**25 connected Skills · routing · planning · TDD · verification · review · recovery · release**

```bash
bun add -g get-fable
```

[Start here](#start-in-under-a-minute) · [How it works](#so-what-does-get-fable-actually-do) · [The Skills](#25-skills-one-way-of-working) · [Docs](#documentation)

</div>

---

## I kept coming back to one question

What if you could take the coding agent you already have — Codex, Claude Code, Gemini, OpenCode, Cursor, a local model, a cheaper model, whatever you happen to use — and make it **work more like a serious coding partner**?

Not by swapping the model

Not by giving it one giant prompt and hoping it remembers everything 40 minutes later

But by changing what happens *around* the model

That question is where `get-fable` started

Because when people talk about a great coding agent, they usually talk about the model first. And obviously the model matters. A lot

But the model is not the whole experience

A strong coding partner also knows when to inspect before touching anything. When to stop guessing and check the docs. When a bug needs a failing test before a fix. When a task is large enough to plan. When a second pair of eyes is useful. When the last test run no longer counts because the code changed afterward. When three failed attempts mean “rethink this” rather than “try the same thing a fourth time”

That behavior is not just intelligence

A lot of it is **the harness**

`get-fable` is my attempt to bring that harness to almost any coding agent

> **The goal is simple: take the agent you already use and push its working behavior closer to the discipline you expect from something like Claude Fable**

No, it does not magically turn a small local model into Claude Fable

But it can give that model a much better way to approach real software work

And with a strong model underneath it, the difference becomes even more interesting

---

## The model is only part of the agent

Give two agents different models and they can still make the same mistakes

They can both start editing too early

They can both lose the original plan halfway through a long task

They can both rely on stale knowledge about an API

They can both patch a bug without proving the bug first

They can both run tests, change five more files, and still treat the old test run as proof

They can both keep retrying an approach that clearly is not working

And they can both end with the most dangerous sentence in agentic coding:

**“Done.”**

`get-fable` works on that side of the problem

```text
YOUR CODING AGENT
       +
   GET-FABLE
       ↓
Understand the repo
       ↓
Research what is uncertain
       ↓
Plan when the task needs a plan
       ↓
Test the behavior
       ↓
Implement
       ↓
Verify fresh evidence
       ↓
Review what actually changed
       ↓
Ship — or recover if the work is not ready
```

The model still writes the code

`get-fable` helps shape **how it gets there**

---

## A small example

Say you give your agent this:

```text
Fix the token refresh race condition. Make sure it cannot come back.
```

A normal coding loop can easily become:

```text
search files
→ find suspicious function
→ edit function
→ run tests
→ tests pass
→ done
```

Sometimes that works

Sometimes the agent just fixed the first plausible thing it saw

With get-fable, the same task has a better chance of turning into something closer to this:

```text
trace the auth path
→ reproduce the race
→ write the regression test
→ see it fail
→ make the smallest useful fix
→ see the test pass
→ run the affected suite
→ inspect the diff
→ verify the evidence is still fresh
→ finish
```

And if the fix fails three times in a row, the answer is not automatically “edit it again”

The workflow can move into recovery and force a new diagnosis first

That is the kind of behavior get-fable is built around

---

## So what does get-fable actually do?

It gives the agent a connected set of working rules and specialist Skills that cover the full coding cycle

Not just “write better code” instructions

Actual stages with state, evidence and handoffs between them

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

something keeps failing?
   ↓
RECOVER
```

The important bit is that these are connected

Research can affect the plan

The plan can route work into TDD or execution

A mutation can make old verification stale

Repeated failures can change the next action

A release is not “tests passed once”; it can depend on current evidence, package state, CI and security checks

The agent gets a working process instead of a bag of disconnected prompts

---

## More than a prompt pack

This distinction matters

A prompt can say:

> verify your work

get-fable can remember that verification happened, notice that the repository changed afterward, and stop treating the old result as current proof

A prompt can say:

> use TDD

get-fable has a dedicated TDD Skill with red/green gates and links into verification and review

A prompt can say:

> don't keep retrying the same failed approach

get-fable can route repeated failure into recovery before another mutation

A prompt can say:

> plan first

get-fable can route a task into planning when the task actually needs it, while letting smaller work stay smaller

That is why I think of get-fable as a **coding-agent harness**, not a prompt collection

---

## 25 Skills. One way of working.

There are 25 canonical Skills, each responsible for a specific kind of work

You do not need to memorize them all before using the project

The router exists for that

### Understand the work

- `get-fable` — entry point and task router
- `fable-discover` — inspect the repository before making assumptions
- `fable-research` — ground uncertain technical work in current primary sources
- `fable-plan` — turn larger work into bounded, testable pieces

### Build it

- `fable-tdd` — reproduce, red, green, regressions
- `fable-delegate` — hand independent work to specialists without losing ownership boundaries
- `fable-execute` — implement bounded work without quietly expanding the task

### Prove it

- `fable-verify` — prove the result against the actual acceptance criteria
- `fable-review` — inspect the diff instead of reviewing from memory
- `fable-security` — add security reasoning where the change deserves it

### Ship it

- `fable-release` — package and release readiness
- `fable-handoff` — carry the useful context into the next session without dragging everything along

### Get better when things go wrong

- `fable-recover` — stop repetitive failure loops and form a new diagnosis
- `fable-eval` — evaluate behavior instead of assuming a Skill works because its prompt looks good

### The rest of the working kit

- `fable-spark` — one useful next move
- `fable-run` — bounded runtime execution
- `fable-memory` — durable project memory
- `fable-simulator` — simulate autonomous execution paths
- `fable-simplify` — behavior-preserving cleanup
- `fable-cowork` — longer autonomous work sessions
- `fable-config` — safer environment and permission configuration
- `fable-dataviz` — technical data visualization
- `fable-artifact` — structured technical artifacts
- `fable-loop` — budget-capped autonomous loops
- `skill-creator` — build new Skills that follow the same contracts

[See the full Skill catalog →](docs/CANONICAL_SKILLS.md)

---

## Fable Spark

There is a very specific problem that shows up in long agent sessions

The agent is not completely stuck. It just does not know what the *best next move* is anymore

That is what Spark is for

```bash
get-fable spark
```

Depending on the current state, Spark may push the work toward something as small as:

```text
reproduce the bug
write the failing test
check the official docs
review the diff
rerun the affected tests
diagnose the repeated failure
prepare the handoff
```

Not another giant instruction block

Just the next useful move

---

## Use the agent you already like

get-fable is not tied to one model vendor or one editor

Today it can install into:

**Claude Code · Antigravity · Codex · OpenCode · Cursor · Kiro · Kimi · DeepSeek · Pi Code**

The integration is not identical everywhere, because the hosts themselves are not identical

- **Full lifecycle integration** — Claude Code, Antigravity
- **Skill + rule integration** — Codex, OpenCode
- **Advisory rule integration** — Cursor, Kiro, Kimi, DeepSeek, Pi Code

That is intentional. I would rather describe the real integration depth than put nine logos in a row and pretend every host gives get-fable the same controls

[See the host capability matrix →](hosts/README.md)

<details>
<summary><strong>Host installation commands</strong></summary>

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

Claude Code marketplace installation:

```bash
/plugin marketplace add imMamdouhaboammar/get-fable
/plugin install get-fable@get-fable
```

</details>

---

## Start in under a minute

get-fable is Bun-first and requires **Bun 1.3+**

Install it:

```bash
bun add -g get-fable
```

Or through npm if Bun is already available on your machine:

```bash
npm install -g get-fable
```

Initialize it inside a project:

```bash
cd your-project
get-fable init
```

Give it a real task:

```bash
get-fable route "Fix the checkout race condition and verify it with a regression test"
```

Ask what should happen next:

```bash
get-fable spark
```

Check the installation and evidence state:

```bash
get-fable doctor
```

Or try the CLI without installing it globally:

```bash
bunx get-fable --help
npx get-fable --help
```

---

## Where it tends to matter most

### Bugs that look obvious

The obvious fix is often where an agent moves too fast. get-fable can push the work toward reproduction and a regression test before the patch becomes the new assumption

### Large feature requests

A 30-minute implementation should not begin with the same behavior as a three-line change. Discovery and planning give larger work somewhere to live before edits start spreading across the repo

### Libraries and APIs that move quickly

If the task depends on current external behavior, research can happen before implementation instead of after a hallucinated parameter breaks the build

### Repeated failure

Three failed attempts are information. get-fable treats them that way

### Releases

“Tests pass” is useful, but it is not the whole release decision. Package contents, CI, security and evidence freshness matter too

---

## I did not want the Skills to be "good on paper"

This project also has a behavioral evaluation layer

For the current release, 22 action-oriented Skills were evaluated across **115 blinded external-provider cases** covering known, negative, ambiguous, adversarial and holdout scenarios

The recorded run passed **115/115**, with **0 forbidden-action violations**

The router, Spark and Verify use their own dedicated enterprise corpora and frozen holdout evidence, bringing all **25 canonical Skills to M4 evidence-backed maturity**

More importantly, the evidence is tied to the exact Skill corpus it tested

Change the Skill and old evidence can become stale

That is the same principle used in the rest of get-fable: proof should describe the code and behavior you have *now*, not the version you had twenty minutes ago

The repo also runs Cypress E2E, CodeQL, dependency review, TruffleHog secret scanning and SHA-pinned GitHub Actions

[Read how behavioral evidence works →](docs/BEHAVIOR_EVIDENCE.md)

---

## Commands you will probably use first

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

Legacy `--json` output remains available, and supported commands can also use the additive versioned `--json-v1` envelope for machine consumers

[Full CLI and usage guide →](docs/USAGE.md)

---

## Local-first by default

I wanted the harness to add discipline without quietly turning the repository into a telemetry product

So by default:

- telemetry is disabled
- state and evidence stay local to the project
- the CLI has zero production npm dependencies
- Skill installation rejects traversal and symlink escapes
- the local proxy binds to loopback
- GitHub Actions are pinned to immutable commit SHAs

The full trust boundary is documented in [SECURITY.md](SECURITY.md)

---

## Distribution

- **npm** — [`get-fable`](https://www.npmjs.com/package/get-fable)
- **GitHub Releases** — [release history](https://github.com/imMamdouhaboammar/get-fable/releases)
- **Homebrew formula** — [`Formula/get-fable.rb`](Formula/get-fable.rb)
- **Agent packaging** — Claude, Codex, Gemini, Cursor, OpenCode, Kimi, DeepSeek, Kiro and Pi manifests ship with the repository/package

---

## Documentation

The README is the story and the starting point

The deeper implementation details live here:

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

## The bet behind get-fable

**A better model helps. A better harness helps too.**

If you already have a coding agent you like, get-fable is an attempt to make the way it works a lot harder to mess up

```bash
bun add -g get-fable
get-fable init
```

[Get started](docs/USAGE.md) · [Explore the Skills](docs/CANONICAL_SKILLS.md) · [View releases](https://github.com/imMamdouhaboammar/get-fable/releases) · [Report an issue](https://github.com/imMamdouhaboammar/get-fable/issues)

<br/>

<sub>get-fable is an independent open-source project and is not affiliated with Anthropic</sub>

<br/>

MIT licensed

</div>
