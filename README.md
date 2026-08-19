<div align="center">

<img src="assets/mascot.svg" alt="get-fable rabbit mascot" width="120" height="120"/>

# get-fable

### Reusable coding lifecycle discipline and specialist Skills for AI coding agents

**Route the job. Track the state. Prove the result. Recover when assumptions break.**

[![CI](https://github.com/imMamdouhaboammar/get-fable/actions/workflows/ci.yml/badge.svg)](https://github.com/imMamdouhaboammar/get-fable/actions/workflows/ci.yml)
[![Security](https://github.com/imMamdouhaboammar/get-fable/actions/workflows/security.yml/badge.svg)](https://github.com/imMamdouhaboammar/get-fable/actions/workflows/security.yml)
[![E2E](https://github.com/imMamdouhaboammar/get-fable/actions/workflows/e2e.yml/badge.svg)](https://github.com/imMamdouhaboammar/get-fable/actions/workflows/e2e.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square)](./LICENSE)
[![npm version](https://img.shields.io/npm/v/get-fable?style=flat-square&color=3178C6)](https://www.npmjs.com/package/get-fable)
[![Bun](https://img.shields.io/badge/runtime-Bun%201.3%2B-FBF0DF?style=flat-square&logo=bun&logoColor=14151A)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**Codex · Claude Code · Antigravity · Gemini CLI · Cursor · OpenCode · Kimi · DeepSeek · Kiro · Pi Code**

</div>

---

## Why get-fable

Capable AI coding agents solve isolated programming puzzles quickly, but frequently fail on real-world engineering tasks:

- **Skipping Discovery**: Jumping into code edits before inspecting repository architecture, configuration, or load-bearing contracts.
- **Lost Context**: Storing plans and decisions only in transient chat context that gets truncated or forgotten across long sessions.
- **Stale Verification**: Declaring a feature `done` because a test passed earlier, even though subsequent edits modified the codebase.
- **Retry Loops**: Retrying the same failed command or syntax without diagnosing root causes or updating hypotheses.
- **Unverified Releases**: Shipping or merging code without verifying build artifacts, package boundaries, or security constraints.

`get-fable` solves this by wrapping the coding agent in a deterministic, observable software engineering lifecycle backed by specialist Skills, durable state tracking, generation-based verification freshness, and empirical behavioral evidence.

---

## How It Works

The core lifecycle moves through explicit, verifiable phases:

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

[On Repeated Failure or Contradictory Evidence]
  ↓
RECOVER (Form new diagnosis before editing code)
```

- **Fable Spark**: Provides situational micro-policy guidance, suggesting the exact next atomic move based on current workspace phase, active cards, and mutation generations.
- **Generational Freshness**: Workspace edits advance `mutationGeneration`. A task cannot transition to `complete` until `verifiedGeneration` matches the current mutation generation with typed evidence.
- **Narrow Typed Evidence**: Distinguishes `test`, `build`, `runtime`, `review`, `security`, `research`, and `receipt` proof so that research notes or build passes cannot masquerade as functional correctness.

---

## Installation

### Global CLI

Install globally using your preferred package manager:

```bash
# Using npm
npm install -g get-fable

# Using Bun
bun add -g get-fable
```

Run directly without installation:

```bash
# Using npx
npx get-fable --help

# Using bunx
bunx get-fable --help
```

### Supported Host Integrations

Install get-fable skills and lifecycle rules into your agent environment:

| Agent / Host | Installation Command | Integration Details |
| :--- | :--- | :--- |
| **All Hosts** | `get-fable install all` | Installs rules and skills across all detected agent configurations |
| **Claude Code** | `get-fable install claude` | Installs skills, settings, and lifecycle hooks (`CLAUDE.md`, `settings.json`) |
| **Antigravity / Gemini** | `get-fable install antigravity` | Configures Antigravity rule (`fable5-mode.md`), plugin manifest, and lifecycle hooks |
| **Codex / ChatGPT** | `get-fable install codex` | Installs Codex agent profiles, plugin metadata (`.codex-plugin/plugin.json`), and skills |
| **Cursor** | `get-fable install cursor` | Configures Cursor rules in `~/.cursor/rules/fable-lifecycle.mdc` |
| **OpenCode** | `get-fable install opencode` | Configures OpenCode agent instructions and canonical skills |
| **Kimi** | `get-fable install kimi` | Configures Kimi rules in `~/.kimi/rules/fable.md` |
| **DeepSeek** | `get-fable install deepseek` | Configures DeepSeek rules in `~/.deepseek/rules/fable.md` |
| **Kiro** | `get-fable install kiro` | Configures Kiro rules and lifecycle hooks |
| **Pi Code** | `get-fable install pi` | Configures Pi Code rules in `~/.pi/rules/fable.md` |

For Claude Code marketplace integration:
```bash
/plugin marketplace add imMamdouhaboammar/get-fable
/plugin install get-fable@get-fable
```

---

## Quick Start

Initialize a repository with durable Fable state and project skills:

```bash
# 1. Initialize project working state and skills
get-fable init

# 2. Route an incoming task to the right specialist Skill
get-fable route "Fix race condition in token refresh and verify with tests"

# 3. Check situational next action
get-fable spark

# 4. Verify system diagnostics
get-fable doctor

# 5. Inspect available Skill feed and details
get-fable feed list
get-fable skills inspect fable-tdd

# 6. Verify evidence freshness and machine-readable output
get-fable behavior-eval status
get-fable doctor --json-v1
```

---

## Canonical Skill Packs

`get-fable` ships **25 canonical Skills** organized into specialized functional packs:

```text
├── Core Lifecycle
│   ├── get-fable          # Entry router and global execution contract
│   ├── fable-discover     # Codebase inspection and execution path tracing
│   ├── fable-research     # Primary-source documentation grounding
│   ├── fable-plan         # Architecture design and bounded card decomposition
│   ├── fable-tdd          # Test-driven development and regression prevention
│   ├── fable-delegate     # Independent worker delegation with ownership boundaries
│   ├── fable-execute      # Bounded task implementation
│   ├── fable-verify       # Empirical falsification and verification
│   ├── fable-review       # Grounded diff inspection and code review
│   ├── fable-security     # Threat modeling and security diff auditing
│   ├── fable-release      # Pre-flight release verification and packaging
│   ├── fable-handoff      # Compact context compaction for session handoff
│   └── fable-recover      # Systematic root-cause diagnosis after repeated failures
├── Intelligence
│   ├── fable-spark        # Situational next-action predictor
│   ├── fable-simulator    # Autonomous execution simulator
│   └── fable-memory       # Durable structured project memory
├── Build
│   ├── fable-run          # Bounded runtime process launcher
│   ├── fable-loop         # Budget-capped autonomous polling loops
│   └── fable-simplify     # Behavior-preserving refactoring and cleanup
├── Proof
│   ├── fable-eval         # Benchmark evaluation and regression suites
│   ├── fable-dataviz      # Metric visualization and SVG generation
│   └── fable-artifact     # Structured technical documentation artifacts
├── Delivery
│   └── fable-cowork       # Autonomous silent delivery workflows
├── System
│   └── fable-config       # Safe permissions and environment configuration
└── Creator
    └── skill-creator      # Scaffolding and benchmark generation for new Skills
```

### Evidence-Backed Maturity (M0–M5)

Skills are classified by observable proof, never by self-assertion:
- **M0–M2**: Incomplete structure or unintegrated runtime.
- **M3**: Integrated into runtime task router, awaiting empirical holdout evidence.
- **M4 (Proven)**: Verified across 5 adversarial categories (`known`, `negative`, `ambiguous`, `adversarial`, `holdout`) with >=90–95% pass rates against independent external LLMs.
- **M5**: Full enterprise gate sign-off.

*All 25 canonical skills currently hold fresh, verified **M4** maturity proof.*

---

## Behavioral Evidence Pipeline

`get-fable` provides an end-to-end evaluation harness that tests whether AI agents actually follow Skill instructions under adversarial conditions:

1. **Oracle-Free Request Export**:
   ```bash
   get-fable behavior-eval export --out /tmp/behavior-requests.json
   ```
   Exports blinded evaluation requests containing task instructions and context without leaking expected outputs, forbidden traps, or evaluation category tags.

2. **Independent Provider Execution**:
   The requests are executed against an independent external model (e.g., Gemini 2.5 Flash, Claude 3.5 Sonnet, GPT-4o) returning action selections and outputs.

3. **Cryptographic Scoring & Verification**:
   ```bash
   get-fable behavior-eval score /tmp/provider-responses.json --out evals/results/agent-behavior-v1.json
   ```
   Scores responses against the oracle, checks forbidden action violations, binds results to SHA-256 hashes of the exact Skill corpus and oracle definitions, and marks evidence stale if any Skill is modified.

For full technical specifications, see [`docs/BEHAVIOR_EVIDENCE.md`](docs/BEHAVIOR_EVIDENCE.md).

---

## CLI Command Reference

| Command | Description | Machine-Readable Output |
| :--- | :--- | :--- |
| `init` | Initialize durable project state (`.fable/`) and canonical skills | `--json` |
| `route <task>` | Route intent to the optimal specialist Skill | `--json`, `--json-v1` |
| `spark [intent]` | Predict situational atomic next action from current state | `--json`, `--json-v1` |
| `state <phase>` | Transition lifecycle phase (`discovering`, `planning`, `executing`, `verifying`, `idle`, `recovering`) | `--json` |
| `card <text>` | Set the active work card | `--json` |
| `mutation [source]` | Record workspace edit and stale older verification | `--json` |
| `evidence ...` | Record typed verification evidence (`pass`/`fail` for `test`, `build`, `runtime`, `review`, `security`) | `--json` |
| `lint` | Verify consistency across ledger, state, cards, and evidence | `--json` |
| `doctor` | Run 42 system diagnostics and evidence checks | `--json`, `--json-v1` |
| `feed list` | Search and list the canonical Skill feed | `--json`, `--json-v1` |
| `skills inspect <id>` | Inspect full manifest, resources, and evaluation data for a Skill | `--json` |
| `graph` | View neural links between lifecycle Skills | `--json`, ASCII |
| `recipes` | View reusable multi-step engineering workflows | `--json`, ASCII |
| `packs` | Inspect Skill pack collections (`core`, `intelligence`, `build`, `proof`, `delivery`, `full`) | `--json` |
| `behavior-eval <export\|score\|status>` | Manage blinded behavioral evaluation suites | `--json`, `--json-v1` |
| `status` | Display current workspace installation and lifecycle state | `--json`, `--json-v1` |
| `telemetry` | View local usage metrics (opt-in, disabled by default) | `--json` |
| `serve [port]` | Launch local contextual request proxy (`127.0.0.1:8080`) | N/A |

*Note: `--json` is preserved for legacy backward compatibility; `--json-v1` outputs standardized envelopes validated against `schemas/cli-json-envelope.schema.json`.*

---

## Security and Trust

- **Zero NPM Runtime Dependencies**: The core CLI runtime is built entirely on native Bun/Node APIs with zero third-party production dependencies.
- **Path Traversal & Symlink Protection**: Strict containment boundary checks prevent path traversal attacks or symlink escapes during skill installation and resource loading.
- **Transactional State Management**: State transitions and evidence updates execute atomically under file locks.
- **Safe Network Defaults**: The local request proxy binds to loopback (`127.0.0.1`) by default, sanitizes headers, and enforces request/response byte limits.
- **Telemetry Privacy**: Local storage only, disabled by default, and never transmits data to external servers without explicit consent.
- **Supply-Chain Integrity**: All third-party GitHub Actions are pinned to immutable 40-character commit SHAs. Automated workflows run CodeQL analysis, TruffleHog secret scanning, and npm OIDC Trusted Publishing.

---

## CI and Quality Gates

Every commit and pull request must pass exhaustive pre-flight quality gates:

- **Test Suite**: **273 unit and integration tests passed** across 61 test files (**2,152 expectations**, 0 failures).
- **Cypress E2E Suite**: End-to-end browser smoke verification of the public landing page and interactive terminal simulator.
- **Doctor Diagnostics**: **41 checks PASS**, 0 warnings, 0 errors.
- **Zero Drift**: Generated TypeScript catalogs, Python constants, and documentation (`public/llms.txt`) verified for 100% parity.

---

## Distribution

- **npm**: [`get-fable`](https://www.npmjs.com/package/get-fable)
- **GitHub Releases**: [Latest Release](https://github.com/imMamdouhaboammar/get-fable/releases)
- **Homebrew**: `Formula/get-fable.rb`
- **Agent Skill Catalogs**: [`skills.sh.json`](skills.sh.json), `.claude-plugin/`, `.codex-plugin/`, `.gemini-plugin/`, `.cursor-plugin/`, `.opencode-plugin/`, `.kimi-plugin/`, `.deepseek-plugin/`, `.kiro-plugin/`, `.pi-plugin/`.

---

## Documentation

- [Usage Guide](docs/USAGE.md)
- [Architecture & Design](docs/ARCHITECTURE.md)
- [Behavioral Evidence Protocol](docs/BEHAVIOR_EVIDENCE.md)
- [Compatibility Matrix](docs/COMPATIBILITY.md)
- [Canonical Skills Catalog](docs/CANONICAL_SKILLS.md)
- [Plugin Distribution](docs/PLUGIN.md)
- [Release Process](docs/RELEASE.md)
- [Security Policy](SECURITY.md)
- [Support Guidelines](SUPPORT.md)
- [Contributing](CONTRIBUTING.md)

---

## License

Original `get-fable` code is released under the [MIT License](./LICENSE).
Third-party notices and terms are documented in [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
