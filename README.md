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

**25 connected Skills · routing · research · planning · TDD · verification · review · recovery · DSH plugin · release**

```bash
bun add -g get-fable
```

[Start here](#start-in-under-a-minute) · [How it works](#so-what-does-get-fable-actually-do) · [The Skills](#25-skills-one-way-of-working) · [Docs](#documentation)

</div>

---

## I kept coming back to one question

What if you could take the coding agent you already have — Codex, Claude Code, Gemini, OpenCode, Cursor, a local model, a cheaper model, whatever you happen to use — and make it **work more like a serious coding partner**?

Not by swapping the model.

Not by writing one giant system prompt and hoping it still matters forty minutes later.

But by changing what happens *around* the model.

That question is where `get-fable` started.

Because when people talk about a great coding agent, they usually talk about the model first. And obviously the model matters. A lot.

But the model is not the whole experience.

A strong coding partner also knows when to inspect before touching anything. When to stop guessing and check the current docs. When a bug needs a failing test before a fix. When a task is large enough to plan. When two workers can genuinely work in parallel — and when they absolutely should not. When a green test is stale because the code changed afterward. When three failed attempts mean *rethink the diagnosis*, not *try a fourth variation of the same patch*.

That behavior is not just raw intelligence.

A lot of it is **the harness**.

`get-fable` is an attempt to bring that harness to almost any coding agent.

> **The goal is deliberately ambitious: take the agent you already use and push its working behavior closer to the discipline you expect from a top-tier coding partner.**

No, it does not magically turn a small local model into Claude Fable.

But it can give that model a better way to approach real software work.

And when the model underneath is already strong, the harness has more to work with.

---

## The model is only part of the agent

Two agents can use completely different models and still make the same mistakes.

They can both start editing too early.

They can both lose the original plan halfway through a long task.

They can both rely on stale knowledge about an API.

They can both patch a bug without proving the bug first.

They can both run tests, change five more files, and still treat the old test run as proof.

They can both split work across subagents because the files look different while the workers are quietly changing the same contract.

They can both keep retrying an approach that clearly is not working.

And they can both end with the most dangerous sentence in agentic coding:

**“Done.”**

`get-fable` works on that part of the problem.

It does not replace the model.

It surrounds it with a way of working.

```text
YOUR CODING AGENT
       +
GET-FABLE HARNESS
       ↓
DISCOVER
RESEARCH
PLAN
TEST
DELEGATE
EXECUTE
VERIFY
REVIEW
SECURITY
RECOVER
RELEASE
       ↓
A MORE DISCIPLINED CODING LOOP
```

---

## So what does get-fable actually do?

It gives the agent 25 connected specialist Skills and a lifecycle that decides when each one should take over.

A normal bug request should not immediately mean “edit production code.”

```text
"Fix the token refresh race condition"

        ↓

Where does the behavior actually live?
        ↓
Can we reproduce it reliably?
        ↓
What test level crosses the real failure boundary?
        ↓
Did RED fail for the right reason?
        ↓
Make the smallest production change
        ↓
Fresh GREEN
        ↓
Probe adjacent race/error paths
        ↓
Verify the current mutation
        ↓
Review the actual diff
```

A release request follows a different route.

An unfamiliar SDK should trigger current primary-source research before implementation.

A repeated failure should stop mutation and enter diagnosis.

A security-sensitive change should be traced through trust boundaries, not waved through because a scanner came back clean.

The workflow follows the work.

---

## This is not a prompt pack

This distinction matters.

A prompt can say:

> verify your work

`get-fable` can track that the repository changed **after** verification and treat the old evidence as stale.

A prompt can say:

> use TDD

`fable-tdd` now distinguishes a valid RED from a syntax error, a broken fixture, a stale artifact, a false-green mock, or a concurrency test that only passes because it slept long enough.

A prompt can say:

> use subagents

`fable-delegate` asks whether the work is independent at the **semantic** level, not just whether two workers touch different files.

A prompt can say:

> debug carefully

`fable-recover` freezes blind mutation, builds a ranked hypothesis queue, chooses discriminating probes, falsifies bad theories, and only then issues one bounded repair.

A prompt can say:

> make sure the release works

`fable-release` separates source correctness from the artifact users actually install, then distinguishes `READY_NOT_PUBLISHED`, `PUBLISHED_UNVERIFIED`, and genuinely `RELEASED`.

That is the direction of the project: not more instructions, but **more operational judgment around the instructions**.

---

## Deep Skill Playbooks V2

Every canonical Skill carries complete operational knowledge and architecture discipline:

- **Activation boundaries**: Exact criteria for when to activate, refuse, or defer;
- **Situational classification**: Taxonomy and decision branches for ambiguous cases before acting;
- **Staged execution**: Verifiable, step-by-step evidence protocol with red/green gates;
- **Architectural invariants**: Non-negotiable constraints that must remain true;
- **Failure handling**: Actionable taxonomy that changes the next action upon error;
- **Anti-pattern guards**: Explicit enumeration of tempting anti-patterns to avoid;
- **Structured artifacts**: Machine-verifiable receipts, templates, and state handoffs;
- **Progressive references**: Substantial deep-dive guides (>1,000 to >3,000 bytes) for complex scenarios;
- **Behavioral evals**: Comprehensive 10-scenario evaluation benchmarks per skill.

**The hard-earned engineering reasoning lives directly in the Skill — providing reliable, deterministic execution across all model tiers.**

---

## 25 Skills. One way of working.

### Understand the work

`get-fable` — choose the next specialist from intent + durable state, with precedence for failure, security, stale proof, and unknowns.

`fable-discover` — trace real repository/runtime execution paths instead of guessing from filenames and imports.

`fable-research` — resolve current external facts against version-appropriate primary sources.

`fable-plan` — turn evidence into dependency-aware, risk-aware, falsifiable work cards.

### Build the change

`fable-tdd` — prove the behavior gap through the right test boundary before production mutation.

`fable-delegate` — parallelize only when write, semantic, and verification independence are real.

`fable-execute` — implement one bounded card while protecting scope, source-of-truth, and user work.

`fable-simplify` — reduce complexity without quietly changing behavior.

### Prove it

`fable-verify` — build a claim → failure mode → evidence matrix and try to falsify the implementation.

`fable-review` — inspect the actual diff for concrete failure scenarios instead of style-comment theater.

`fable-security` — trace attacker-controlled input across trust boundaries and validate findings skeptically.

`fable-simulator` — compare against an independent oracle without confusing simulation with production proof.

`fable-eval` — measure changes to agent behavior without benchmark overfitting or oracle leakage.

### Keep long sessions sane

`fable-recover` — stop blind retries and rebuild causal confidence after repeated failure.

`fable-spark` — suggest the smallest useful next move — or stay silent when another suggestion would just be noise.

`fable-memory` — preserve durable facts with scope, provenance, supersession, and secret-safe rules.

`fable-handoff` — create a real resumability contract for another agent/session.

`fable-cowork` — execute long scoped work autonomously without throwing away lifecycle gates or authorization boundaries.

`fable-loop` — poll changing conditions with explicit state machines, budgets, backoff, and honest stop reasons.

### Work with the environment

`fable-run` — launch the exact runtime artifact and separate spawn, readiness, feature proof, and cleanup.

`fable-config` — change harness settings with precedence, least privilege, host-capability honesty, and behavioral verification.

### Build evidence people can use

`fable-dataviz` — choose truthful visual encodings, preserve metric semantics, and audit for misleading scales/transformations.

`fable-artifact` — produce source-grounded documents and diagrams that survive outside the conversation.

### Extend the harness

`skill-creator` — author new Skills to the same V2 standard instead of cloning shallow templates.

[Explore the canonical Skill catalog →](docs/CANONICAL_SKILLS.md)

---

## Fable Spark: sometimes the best next move is tiny

During a long coding session, the agent usually does not need another page of advice.

It needs one useful move.

```text
reproduce the bug
check the exact installed SDK version
write the failing contract test
compare source and built entrypoints
review the current diff
rerun evidence after the last mutation
stop retrying and diagnose
```

Or nothing.

Spark is explicitly allowed to stay silent when the current specialist already owns an obvious next step.

```bash
get-fable spark
```

---

## Works with the coding agent you already use

`get-fable` is portable across 30 AI coding agents, platforms, and IDEs rather than being tied to one model or editor.

### Proprietary & Commercial Markets

| Agent / Tool | Integration Tier | Key Capabilities |
|:---|:---|:---|
| <img src="assets/logos/claude.svg" width="20" height="20" alt="" /> [**Claude Code**](https://www.anthropic.com/claude-code) (Anthropic) | **Full Lifecycle** | 5 Python hooks (`settings.json`), 25 canonical skills, rules in `CLAUDE.md`, Marketplace plugin |
| <img src="assets/logos/gemini.svg" width="20" height="20" alt="" /> **Gemini CLI / Google Antigravity** (Google) | **Full Lifecycle** | `hooks.json` lifecycle triggers, plugin manifest, canonical skills, constitution rules |
| <img src="assets/logos/grok.svg" width="20" height="20" alt="" /> **Grok Build** (xAI) | **Full Lifecycle** | `hooks.json` lifecycle triggers, Grok plugin manifest, canonical skills, constitution rules |
| <img src="assets/logos/openai.svg" width="20" height="20" alt="" /> [**OpenAI Codex & ChatGPT**](https://openai.com/codex) (OpenAI) | **Skill + Rule + Plugin** | `.codex-plugin/plugin.json`, ChatGPT OpenAPI Custom Actions, skills in `~/.codex/skills/` |
| <img src="assets/logos/cursor.svg" width="20" height="20" alt="" /> **Cursor** (Anysphere) | **Advisory Rule + Plugin** | `.cursor/rules/fable-lifecycle.mdc`, `.cursor-plugin/marketplace.json` |
| <img src="assets/logos/copilot.svg" width="20" height="20" alt="" /> [**GitHub Copilot Agent Mode**](https://github.com/features/copilot) (GitHub / Microsoft) | **Advisory Rule** | Global rules in `~/.copilot/rules/fable.md` & project `.github/copilot-instructions.md` |
| <img src="assets/logos/devin.svg" width="20" height="20" alt="" /> **Devin** (Cognition) | **Skill + Rule** | Global `~/.devin/instructions.md`, rules, and canonical skills in `~/.devin/skills/` |
| <img src="assets/logos/windsurf.svg" width="20" height="20" alt="" /> **Windsurf** (Codeium) | **Advisory Rule** | Global rules in `~/.codeium/windsurf/rules.md` & project `.windsurfrules` |
| <img src="assets/logos/replit.svg" width="20" height="20" alt="" /> **Replit Agent** (Replit) | **Advisory Rule** | Global rules in `~/.replit/rules/fable.md` & project `.replit.md` |
| <img src="assets/logos/aws.svg" width="20" height="20" alt="" /> [**Amazon Q Dev**](https://kilo.ai/articles/coding-agents-for-vscode) (Amazon Web Services) | **Advisory Rule** | Global rules in `~/.aws/amazon-q/rules/fable.md` & project `.amazonq/rules.md` |
| <img src="assets/logos/trae.svg" width="20" height="20" alt="" /> **Trae** (ByteDance) | **Advisory Rule** | Global rules in `~/.trae/rules/fable.md` & project `.trae/rules/fable.md` |
| <img src="assets/logos/warp.svg" width="20" height="20" alt="" /> **Warp AI** (Warp Terminal) | **Advisory Rule** | Global rules in `~/.warp/rules/fable.md` |
| <img src="assets/logos/moonshot-kimi.svg" width="20" height="20" alt="" /> **Kimi K3** (Moonshot AI) | **Advisory Rule** | Rules in `~/.kimi/rules/fable.md` |
| <img src="assets/logos/atlarix.svg" width="20" height="20" alt="" /> [**Atlarix**](https://martinterhaak.medium.com/best-ai-coding-agents-summer-2025-c4d20cd0c846) (Atlarix Desktop Copilot) | **Advisory Rule** | Rules in `~/.atlarix/rules/fable.md` |
| <img src="assets/logos/vellum.svg" width="20" height="20" alt="" /> [**Vellum**](https://www.vellum.ai/blog/best-ai-coding-agents) (Vellum Workflow Platform) | **Advisory Rule** | Rules in `~/.vellum/rules/fable.md` |
| <img src="assets/logos/codegen.svg" width="20" height="20" alt="" /> [**Codegen**](https://codegen.com/best-ai-coding-agents/) (Codegen Platforms) | **Advisory Rule** | Rules in `~/.codegen/rules/fable.md` |
| <img src="assets/logos/muse.svg" width="20" height="20" alt="" /> [**Muse Code**](https://medium.com/the-tech-trek-by-tech-chick/10-ai-coding-agents-developers-should-know-in-2026-b369e3dc41ee) (Muse) | **Advisory Rule** | Rules in `~/.muse/rules/fable.md` |
| <img src="assets/logos/jetbrains.svg" width="20" height="20" alt="" /> **Junie** (JetBrains) | **Advisory Rule** | Global rules in `~/.junie/rules/fable.md` & project `.junie/rules/fable.md` |
| <img src="assets/logos/qodo.svg" width="20" height="20" alt="" /> **Qodo** (Formerly CodiumAI) | **Advisory Rule** | Global rules in `~/.qodo/rules/fable.md` & project `.qodo/rules/fable.md` |
| <img src="assets/logos/roocode.svg" width="20" height="20" alt="" /> **Roo Code** | **Skill + Rule** | Global rules `~/.roo/rules/fable.md`, skills in `~/.roo/skills/`, and project `.roomodes` |

### Open-Source & Community Markets

| Agent / Tool | Integration Tier | Key Capabilities |
|:---|:---|:---|
| <img src="assets/logos/aider.svg" width="20" height="20" alt="" /> **Aider** (Git-first CLI agent) | **Advisory Rule** | Global rules in `~/.aider/rules/fable.md` & project `.aider.prompt.md` |
| <img src="assets/logos/cline.svg" width="20" height="20" alt="" /> **Cline** (Autonomous BYOK Agent) | **Skill + Rule** | Global rules in `~/.cline/rules/fable.md`, skills in `~/.cline/skills/`, and `.clinerules` |
| <img src="assets/logos/openhands.svg" width="20" height="20" alt="" /> **OpenHands** (Formerly OpenDevin) | **Skill + Rule** | Global microagents in `~/.openhands/microagents/`, skills in `~/.openhands/skills/` |
| <img src="assets/logos/opencode.svg" width="20" height="20" alt="" /> **OpenCode** (SST) | **Skill + Rule** | Rules in `~/.opencode/rules/fable.md`, skills in `~/.opencode/skills/` |
| <img src="assets/logos/continue.svg" width="20" height="20" alt="" /> **Continue** (IDE extension layer) | **Advisory Rule** | Global rules in `~/.continue/rules/fable.md` & project `.continue/rules/fable.md` |
| <img src="assets/logos/kilo.svg" width="20" height="20" alt="" /> **Kilo Code** (Kilo Platform) | **Skill + Rule** | Global rules in `~/.kilo/rules/fable.md`, skills in `~/.kilo/skills/` |
| <img src="assets/logos/plandex.svg" width="20" height="20" alt="" /> [**Plandex**](https://www.youtube.com/watch?v=Q0YgzCHkNXo) (Terminal multi-file engine) | **Advisory Rule** | Global rules in `~/.plandex/rules/fable.md` & project `.plandex/context.md` |
| <img src="assets/logos/autogpt.svg" width="20" height="20" alt="" /> [**AutoGPT**](https://www.deeplearning.ai/the-batch/next-generation-coding-tools-empower-developers-with-agent-style-interactions) (Significant-Gravitas) | **Advisory Rule** | Global rules in `~/.autogpt/rules/fable.md` |
| <img src="assets/logos/kiro.svg" width="20" height="20" alt="" /> **Kiro** | **Rule + Hooks** | Rules in `~/.kiro/rules/fable.md` and lifecycle triggers |
| <img src="assets/logos/deepseek.svg" width="20" height="20" alt="" /> **DeepSeek Harness (DSH)** | **Plugin + UI** | Cordis plugin bundle (`cordis.patch.yml`), REST backend, and consumed React Web UI |
| <img src="assets/logos/pi.svg" width="20" height="20" alt="" /> **Pi Code** | **Advisory Rule** | Rules in `~/.pi/rules/fable.md` |

Integration depth depends on what each host actually exposes:

- **Cordis Plugin & Consumed Web UI** — DeepSeek Harness (DSH)
- **Full lifecycle integration** — Claude Code, Antigravity, Grok Build
- **Skill + rule integration** — Codex, Devin, OpenCode, Roo Code, Cline, OpenHands, Kilo Code, Hermes Agent
- **Advisory rule integration** — Cursor, Copilot, Windsurf, Replit, Amazon Q, Trae, Warp, Kimi, Atlarix, Vellum, Codegen, Muse, Junie, Qodo, Aider, Continue, Plandex, AutoGPT, Kiro, Pi Code

That distinction is intentional. A host that can load rules but cannot register lifecycle hooks should not be described as if it has enforcement it does not actually provide.

[See the host capability matrix →](docs/HOSTS.md)

<details>
<summary><strong>Installation commands by host</strong></summary>

```bash
get-fable install all
get-fable install claude
get-fable install antigravity
get-fable install grok
get-fable install codex
get-fable install cursor
get-fable install copilot
get-fable install devin
get-fable install windsurf
get-fable install replit
get-fable install amazonq
get-fable install trae
get-fable install warp
get-fable install kimi
get-fable install atlarix
get-fable install vellum
get-fable install codegen
get-fable install muse
get-fable install junie
get-fable install qodo
get-fable install roocode
get-fable install aider
get-fable install cline
get-fable install openhands
get-fable install opencode
get-fable install continue
get-fable install kilo
get-fable install plandex
get-fable install autogpt
get-fable install hermes
get-fable install deepseek
get-fable install dsh
get-fable install kiro
get-fable install pi
```

DeepSeek Harness (DSH) Plugin installation:

```bash
dsh plugin add imMamdouhaboammar/get-fable
```

When configuring the DSH plugin's `projectRoot`, fresh routing state belongs to
that project even when the host starts elsewhere. A routing preview does not
create `.fable` state; applying the route writes it to the configured project.

Claude Code marketplace installation:

```bash
/plugin marketplace add imMamdouhaboammar/get-fable
/plugin install get-fable@get-fable
```

</details>

---

## Start in under a minute

### 1. Vercel / skills.sh CLI (Direct Skill Pack)
```bash
npx skills add imMamdouhaboammar/get-fable
# or
bunx skills add imMamdouhaboammar/get-fable
```

### 2. Homebrew (macOS & Linux)
```bash
brew tap imMamdouhaboammar/get-fable
brew install get-fable
```

### 3. Global Package Manager
```bash
bun add -g get-fable
# or
npm install -g get-fable
```

### 4. Configure All Coding Agents
```bash
get-fable install all
# Configures Claude Code, Google Antigravity, OpenAI Codex/ChatGPT, Cursor, OpenCode, Kimi, DeepSeek, Kiro, Pi
```

Inside a project:

```bash
cd your-project
get-fable init
```

Route a real task:

```bash
get-fable route "Fix the checkout race condition and verify it with a regression test"
```

Ask for the next useful move:

```bash
get-fable spark
```

Check installation, contracts, and evidence state:

```bash
get-fable doctor
```

> 📖 **Full Multi-Host & Platform Guide**: See [docs/INSTALLATION.md](./docs/INSTALLATION.md) for detailed configuration of hooks, shell completions, and individual agent environments.

---

## Behavioral proof: the uncomfortable part is intentional

`get-fable` treats **“the Skill exists”** and **“the Skill has been proven to behave correctly”** as different claims.

A previous version of the catalog had an external-provider evidence run across 115 blinded cases with 115 passes and zero forbidden-action violations.

That run is useful history.

It is **not** fresh proof for Deep Skill Playbooks V2.

V2 materially changes the instructions and expands the semantic scenario corpus. The evidence hashes should therefore make the old behavioral result stale.

That is a feature, not a regression.

Until the current V2 request bundle is executed against an independent provider and rescored, affected behavioral maturity should remain **`NOT_CHECKED`**, not magically inherit the old M4 badge.

The current workflow is:

```bash
get-fable behavior-eval export --out /tmp/get-fable-behavior-requests.json
# execute the blinded requests with an independent provider
get-fable behavior-eval score /tmp/provider-responses.json \
  --out evals/results/agent-behavior-v1.json
get-fable behavior-eval status
get-fable doctor --json-v1
```

The exported bundle is generated from the current Skill corpus, so the README deliberately does not hard-code a V2 request count.

[Read the behavioral evidence protocol →](docs/BEHAVIOR_EVIDENCE.md)

---

## Local-first by default

`get-fable` is designed to add process without turning your repository into a telemetry product.

- telemetry is disabled by default;
- state and evidence live locally with the project;
- the CLI has zero production npm dependencies;
- Skill installation rejects traversal and symlink escapes;
- the local proxy binds to loopback by default;
- GitHub Actions are pinned to immutable commit SHAs;
- CodeQL, Dependency Review, TruffleHog, and E2E workflows are part of the repository quality surface.

For the full trust boundary, see [SECURITY.md](SECURITY.md).

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

Legacy `--json` output remains available, while supported commands can use the additive versioned `--json-v1` envelope.

[Read the usage guide →](docs/USAGE.md)

---

## Distribution

- **npm** — [`get-fable`](https://www.npmjs.com/package/get-fable)
- **GitHub Releases** — [release history](https://github.com/imMamdouhaboammar/get-fable/releases)
- **Homebrew formula** — [`Formula/get-fable.rb`](Formula/get-fable.rb)
- **Agent packaging** — Claude, Codex, Gemini, Cursor, OpenCode, Kimi, DeepSeek, Kiro, and Pi manifests ship with the project/package

---

## Documentation

The README tells the product story. The implementation details live here:

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

## A better model helps.

### A better harness helps too.

```bash
bun add -g get-fable
get-fable init
```

[Get started](docs/USAGE.md) · [Explore the Skills](docs/CANONICAL_SKILLS.md) · [View releases](https://github.com/imMamdouhaboammar/get-fable/releases) · [Report an issue](https://github.com/imMamdouhaboammar/get-fable/issues)

<br/>

MIT licensed

<sub>get-fable is an independent open-source project and is not affiliated with Anthropic.</sub>

</div>
