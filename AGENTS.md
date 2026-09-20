# get-fable — Authoritative Agent Rules

Version: **1.9.1** · Schema: **v3** · Skills: **42** · Platforms: **32**

Every AI agent operating in or consuming this repository **must** follow these rules. They are not suggestions. They define the contract between the agent, the lifecycle harness, and the evidence state.

---

## 1. Repository identity

| Property | Value |
|---|---|
| Package | `get-fable` |
| Registry source | `skills/get-fable/registry.json` (schema v2) |
| State file | `.fable/state.json` (schema v3) |
| Ledger | `.fable/LEDGER.md` |
| Progress log | `.fable/PROGRESS.md` |
| Spec | `docs/SPEC.md` |
| Event journal | `.fable/events.jsonl` |
| Pending mutations | `.fable/pending-mutations/` |
| CLI binary | `bin/get-fable.js` |
| Runtime | Bun ≥ 1.3.0 |
| Package manager | **Bun only** (npm/yarn prohibited) |

---

## 2. Lifecycle entry rule

**Before touching any code, configuration, or state file**, the agent must:

1. Inspect the repository structure — `skills/`, `src/`, `hooks/`, `docs/` — not guess.
2. Check current lifecycle phase: `bun ./bin/get-fable.js status --json-v1`
3. Check health: `bun ./bin/get-fable.js doctor --json-v1`
4. Route the task: `bun ./bin/get-fable.js route "<task>" --json-v1`

Only after routing should the agent activate the selected specialist skill. Do not load all 42 skills into context — compile only the selected skill body, routing reasons, required gates, and compact state.

---

## 3. Canonical skill registry (42 skills)

The registry at `skills/get-fable/registry.json` is the only authoritative source. Every routing decision references it by `id`. Skills are organized across 8 packs:

### Core pack
| Skill | Phase | Job |
|---|---|---|
| `get-fable` | idle | Deterministic routing across all 42 skills with evidence precedence |
| `fable-discover` | discovering | Trace real repository/runtime execution paths before planning |
| `fable-plan` | planned | Convert evidence into bounded, testable work cards |
| `fable-execute` | executing | Implement one accepted card with zero scope drift |
| `fable-verify` | verifying | Falsify implementations with fresh machine-checked evidence |
| `fable-recover` | recovering | Diagnose harness and execution-path failures before retrying |
| `fable-method` | executing | Step-by-step problem-solving loop classifying asks, defining done, acting surgically, and verifying by observation |

### Intelligence pack
| Skill | Phase | Job |
|---|---|---|
| `fable-research` | discovering | Resolve external facts against primary sources before implementation |

### Build pack
| Skill | Phase | Job |
|---|---|---|
| `fable-tdd` | executing | Drive behavior changes through red-green-refactor with observable regression tests |
| `fable-delegate` | executing | Parallelize only when write, semantic, and verification independence are real |
| `fable-native-code` | executing | Codebase idiom matching and anti-bloat policy ensuring diffs read like native code |
| `fable-scope-discipline` | executing | Anti-scope-creep and atomic diff policy keeping changes strictly bounded to requests |

### Proof pack
| Skill | Phase | Job |
|---|---|---|
| `fable-review` | verifying | Inspect the actual diff for concrete failure scenarios |
| `fable-security` | verifying | Trace attacker-controlled input across trust boundaries |
| `fable-redteam` | verifying | Automated penetration testing with CVSS v3.1, SARIF, circuit breaker, and attestation |
| `fable-heal` | executing | Synthesize, apply, and verify security remediations from `fable-redteam` findings |
| `fable-prove-it` | verifying | Evidence precedence and verification rung enforcement preventing unverified claims |
| `fable-judge` | verifying | Adversarial verification of finished work detecting weakened tests and false completion claims |

### Delivery pack
| Skill | Phase | Job |
|---|---|---|
| `fable-release` | verifying | Certify release readiness against quality gates and verified distribution artifacts |
| `fable-handoff` | verifying | Compact session decisions into structured continuation state |
| `fable-finish-your-turn` | executing | Autonomous task completion policy preventing premature stops, upward delegation, and unexecuted TODOs |
| `fable-outcome-first` | verifying | Response styling policy enforcing direct first-sentence answers and zero sycophancy |
| `fable-tend` | executing | Autonomous dutiful junior maintainer for repository CI repair, PR conflict resolution, and triage |

### Evolution pack
| Skill | Phase | Job |
|---|---|---|
| `fable-eval` | verifying | Measure agent prompt/skill/router changes against reproducible baselines |
| `fable-learning` | verifying | Convert sessions into durable project engineering knowledge and failure lessons under `Failure-lessons/`, `agent-kernel`, and `gbrain` |

### System pack
| Skill | Phase | Job |
|---|---|---|
| `fable-dataviz` | executing | Generate accessible SVG charts and dashboard tiles |
| `fable-artifact` | executing | Author technical proposals, architecture diagrams, and interactive components |
| `fable-simplify` | executing | Reduce complexity without quietly changing behavior |
| `fable-loop` | executing | Bounded polling loops with explicit state machines, budgets, and backoff |
| `fable-run` | verifying | Launch exact runtime artifact with readiness probes and clean teardown |
| `fable-memory` | discovering | Manage persistent file-based memory with provenance and secret-safe rules |
| `fable-config` | planned | Change harness settings with least privilege and behavioral verification |
| `fable-simulator` | verifying | Compare against an independent oracle without confusing simulation with production proof |
| `fable-cowork` | executing | Execute long autonomous scoped work without throwing away lifecycle gates |
| `fable-spark` | idle | Predict the smallest atomic next move — or stay silent |
| `fable-architecture` | planned | Evaluate scale/domain/resource vectors; enforce microservices when thresholds cross |
| `fable-eco` | planned | Provision curated capabilities, manage reproducible capability locks, verify host integrations, and compile capability execution contracts |
| `fable-context-thrift` | discovering | Conserve token budget by eliminating redundant reads, batching queries, and targeting lookups |
| `fable-council` | planned | Convene multi-agent council across installed CLI agents to deliberate before finalizing plans |
| `fable-wise` | planned | Low-level agentic design patterns and cognitive reflexes across Depth, Breadth, Coil, and Mesh |

### Creator pack
| Skill | Phase | Job |
|---|---|---|
| `fable-skill-creator` | executing | Author new Skills to the Deep Playbook V2 standard |
| `fable-domain` | discovering | Research-grounded domain adapter and workflow generator translating Fable methodology to sector nouns |

---

## 4. Routing rules (precedence order)

The router is deterministic. Apply signals in this exact order:

1. **Repeated failure** (`failureStreak >= 2`) → `fable-recover` unconditionally
2. **Stale verification** (`verifiedGeneration < mutationGeneration`) → verify before completing
3. **Explicit security or trust-boundary work** → `fable-security` or `fable-redteam`
4. **Security findings present** → `fable-heal` after `fable-redteam`
5. **Release or publish intent** → `fable-release`
6. **Handoff or cross-session continuation** → `fable-handoff`
7. **Agent-control evaluation** → `fable-eval`
8. **Current external facts needed** → `fable-research` before implementing
9. **Repository unknowns** → `fable-discover` before planning
10. **Architecture evaluation at inception** → `fable-architecture`
11. **Broad multi-step work** → `fable-plan`
12. **Testable behavior change or bug fix** → `fable-tdd`
13. **Independent parallel subtasks** → `fable-delegate` (only after semantic independence verified)
14. **Bounded single-card implementation** → `fable-execute`
15. **Review existing diff** → `fable-review`
16. **Default orchestration** → `get-fable`

**Never skip recovery routing on two consecutive failures. Never claim completion with stale evidence.**

---

## 5. State machine

### Phases
```
idle -> discovering -> planned -> executing -> verifying -> complete
                                           -> recovering
                                           -> blocked
```

### State fields (schema v3)
```
schemaVersion          integer (3)
stateRevision          monotonically increasing
workspaceId            short digest of canonical real workspace path
phase                  idle | discovering | planned | executing | verifying | recovering | complete | blocked
currentSkill           active specialist id
failureStreak          consecutive failure count
substantial            boolean — work requires fresh evidence to complete
mutationGeneration     advances on every recognized write-tool execution or failed write attempt
verifiedGeneration     advances when fresh passing completion evidence is recorded
activeCard             current bounded work description
lastDecision           routing decision with selectedSkill, confidence, reasons, taskShape
evidence[]             typed, timestamped, generation-stamped records
updatedAt              ISO 8601 timestamp
```

### Critical invariants
- `workspaceId` is derived from the canonical real path. Symlink aliases resolve to the same identity. Copied state from another workspace is **rejected**.
- A linked worktree without its own `.fable/` cannot read or mutate an ancestor workspace's state.
- `.fable` must be a real directory — symlinked `.fable` is rejected. All lifecycle files must be regular files.
- `mutationGeneration` advances even on **failed** write attempts. A failed editor may have partially changed the workspace.

---

## 6. Evidence protocol

### Recording evidence
```bash
bun ./bin/get-fable.js evidence pass <kind> "<source>" "<detail>"
bun ./bin/get-fable.js evidence fail <kind> "<source>" "<detail>"
```

### Evidence kinds
| Kind | Closes substantial work? | Use for |
|---|---|---|
| `test` | yes | Automated test suite results |
| `build` | yes | Compilation and type check |
| `runtime` | yes | Smoke checks, integration verification |
| `review` | yes | Independent diff review |
| `observation` | yes | Manual behavioral verification |
| `security` | only for security jobs | Security review closing security-routed work |
| `research` | no | Supports decisions only |
| `receipt` | no | Execution provenance only |
| `handoff` | no | Continuity only |

### Completion gate rules
1. `verifiedGeneration >= mutationGeneration` — evidence must be **fresh** (post last mutation)
2. The newest evidence for the routed claim must **pass** and contain substantive detail
3. Substantial work must be in phase `complete`
4. Security evidence closes only explicitly security-routed work — it does not close a feature or bug fix
5. A current-generation **failure** blocks completion even if a passing record exists in the same generation

### Staleness
Every workspace mutation advances `mutationGeneration`. All earlier verification becomes stale. **Proof must be re-recorded after the final mutation.**

---

## 7. Lifecycle hook contract

Five Python hooks enforce invariants mechanically. They are model-agnostic and require `.fable/` to be present (opt-in only).

| Hook file | Host event | Responsibility |
|---|---|---|
| `hooks/fable_profile_inject.py` | `SessionStart` | Inject phase, specialist, failureStreak, activeCard, mutation/verified generation into context |
| `hooks/fable_spawn_guard.py` | `PreToolUse` on Agent/Task/Workflow | Require a live open ledger card before substantial delegation |
| `hooks/fable_fail_streak.py` | `PostToolUse` + `PostToolUseFailure` on Bash | Reset streak on success; increment on failure; select `fable-recover` at streak >= 2 |
| `hooks/fable_mutation.py` | `PostToolUse` + `PostToolUseFailure` on write/edit tools | Advance `mutationGeneration` after any write attempt (success or failure) |
| `hooks/fable_close_guard.py` | `Stop` / `SessionEnd` | Block if: open cards, stale proof, substantial work not at `complete`, or unreconciled pending mutations |

### Additional hooks
| Hook file | Responsibility |
|---|---|
| `hooks/fable_architecture_guard.py` | Intercept `SessionStart` and `PreInvocation` to inject architecture constraints before any code is generated |
| `hooks/fable_session_learn.py` | Extract learnings into `.fable/learnings.json` at task completion |
| `hooks/fable_hook_dispatch.py` | Universal host-agnostic dispatcher for Claude Code, Antigravity, Codex, and Grok |

### Pending mutation debt
When a Python hook cannot acquire the state lock, it writes a unique token to `.fable/pending-mutations/`. The `Stop` hook blocks while any token is present. The next successful state transaction reconciles tokens before accepting new verification or completion.

---

## 8. CLI reference

```bash
# Lifecycle
bun ./bin/get-fable.js init
bun ./bin/get-fable.js route "<task>" [--apply] [--json-v1]
bun ./bin/get-fable.js state <phase> [--substantial]
bun ./bin/get-fable.js card "<text>" [--clear]
bun ./bin/get-fable.js mutation [source]
bun ./bin/get-fable.js evidence <pass|fail> <kind> "<source>" "<detail>"
bun ./bin/get-fable.js learn [--failure-lessons] [--target <target>] [--format <format>]
bun ./bin/get-fable.js spark ["<task>"] [--json-v1]

# Diagnostics
bun ./bin/get-fable.js status [--json-v1]
bun ./bin/get-fable.js doctor [--json-v1]
bun ./bin/get-fable.js lint

# Architecture
bun ./bin/get-fable.js arch-eval "<spec>"

# Security
bun ./bin/get-fable.js redteam scan --target <url> [--profile <profile>]
bun ./bin/get-fable.js redteam scan --target <url> --baseline .fable/baseline.json --fail-on-cvss 7.0

# gRPC worker
bun ./bin/get-fable.js worker-serve
bun ./bin/get-fable.js rpc-serve

# Behavioral evaluation
bun ./bin/get-fable.js behavior-eval export --out <file>
bun ./bin/get-fable.js behavior-eval score <responses> --out <file>
bun ./bin/get-fable.js behavior-eval status

# Discovery
bun ./bin/get-fable.js feed list
bun ./bin/get-fable.js graph
bun ./bin/get-fable.js recipes
bun ./bin/get-fable.js packs

# Installation
bun ./bin/get-fable.js install all
bun ./bin/get-fable.js install <host>
bun ./bin/get-fable.js install-no-mistakes
bun ./bin/get-fable.js install-quality-gate
```

---

## 9. Verification gate (repository)

Before marking any substantial work complete, run in order:

```bash
bun run typecheck                     # TypeScript type check — must pass
bun test                              # Full test suite — must pass
bun run build                         # Production build — must pass
bun ./bin/get-fable.js lint           # Ledger + state semantics check
```

For lifecycle, plugin, routing, or hook changes, additionally verify:

- `skills/get-fable/registry.json` — no dead `next`, `fallback`, or skill targets
- Every canonical skill has valid YAML frontmatter
- Schema-v1 state migration still works after any state-schema changes
- Claude and Antigravity hook semantics match the canonical state contract
- `.codex-plugin/plugin.json` and `.claude-plugin/plugin.json` parse and use strict semver
- Branding assets (`assets/mascot.svg`) exist and are square
- `bun ./bin/get-fable.js doctor --json-v1` reports no error-severity checks
- npm package inspection contains the canonical skills and lifecycle eval surface

Record evidence after the final mutation:

```bash
bun ./bin/get-fable.js evidence pass test "bun test" "all tests pass"
bun ./bin/get-fable.js evidence pass build "bun run build" "build succeeds"
```

---

## 10. Multi-agent and delegation rules

### When delegation is permitted
`fable-delegate` is activated **only** when all three conditions hold:

1. **Write independence**: workers touch disjoint files or modules
2. **Semantic independence**: workers do not share or mutate the same contract, interface, or type definition
3. **Verification independence**: worker completion can be verified without waiting for another worker's output

### Spawn guard
`fable_spawn_guard.py` blocks large delegation (`Agent`, `Task`, `Workflow` tools) if no open ledger card is present. Small payloads, forks, and explicitly paused rounds are exempt.

### TOON protocol
Multi-agent communication uses TOON (Token-Optimized Object Notation) via `@toon-format/toon`. Delegation contracts: `skills/fable-delegate/templates/delegation-contract.toon`. Return packets: `return-packet.toon`. Do not bypass TOON with raw JSON blobs for delegation state — TOON achieves 30–50% token reduction.

### gRPC worker service
Distributed subagent execution uses the Fable Worker gRPC service:

- Proto: `proto/fable_worker.proto`
- RPCs: `ExecuteTask`, `StreamLogs`, `GetStatus`, `CancelTask`
- Start: `bun ./bin/get-fable.js worker-serve`

---

## 11. Architecture enforcement rules

`fable-architecture` and `hooks/fable_architecture_guard.py` enforce these invariants at session start:

| Vector | Lockout threshold | Consequence |
|---|---|---|
| Scale & Load | >= 7 | `allowMonolith: false` enforced |
| Domain Decoupling | >= 6 | `allowMonolith: false` enforced |
| Resource Intensity | >= 8 | `allowMonolith: false` enforced |
| Composite score | >= 7.0 | `allowMonolith: false` enforced |

**Transport standard (ADR 0007)**:
- North-South (external edge): HTTP/REST
- East-West (internal services): gRPC Protobuf or message broker
- **Prohibited**: Internal HTTP/JSON mesh calls between services

**Language matrix by workload**:
- High-concurrency gateway: Node.js / Bun / Fastify
- High-throughput distributed: Go / Gin / gRPC
- AI/ML inference: Python / FastAPI / PyTorch / Ray
- Ultra-low-latency: Rust / Axum / Tonic

Evaluate a specification: `bun ./bin/get-fable.js arch-eval "<spec>"`

---

## 12. Security invariants

These invariants are never relaxed regardless of task urgency:

- **No credentials in state**: Do not persist API keys, tokens, service-role keys, or raw credentials in `.fable/state.json`, evidence records, prompts, or any committed file.
- **No path traversal**: Skill installation rejects symlink escapes and directory traversal.
- **No unsafe lifecycle boundaries**: Reject symlinked `.fable`, non-regular lifecycle files, and foreign pending-mutation tokens.
- **Proxy loopback default**: The local request proxy binds to `127.0.0.1` by default. Non-loopback bindings require `FABLE_PROXY_AUTH_TOKEN` and `FABLE_TRUST_PROXY_TLS_TERMINATION=1`.
- **No raw prompts in evidence**: Evidence detail fields must be substantive behavioral descriptions, not raw prompts, source code, or command stdout.
- **GitHub Actions pinned**: All third-party Actions pinned to full 40-character commit SHAs. Never use floating tags.
- **HTTPS required for bearer forwarding**: Any upstream request carrying `Authorization` requires HTTPS.
- **redteam scope gate**: `fable-redteam` validates target CIDR scope, blocks cloud metadata endpoints (169.254.169.254), and enforces maintenance windows before probing begins.

---

## 13. Anti-patterns (explicitly prohibited)

| Anti-pattern | Correct behavior |
|---|---|
| Editing production code before discovery | Run `fable-discover` first |
| Assuming external facts from training data | Run `fable-research` against primary sources |
| Treating an old test run as current proof after further mutations | Re-record evidence after the final mutation |
| Delegating work that shares a contract or interface | Verify semantic independence first |
| Blind retry after the same failure twice | Route to `fable-recover` |
| Calling completion with `research`, `receipt`, or `handoff` evidence | Use `test`, `build`, `runtime`, `review`, or `observation` |
| Using security evidence to close a feature or bug fix | Security evidence closes only explicitly security-routed work |
| Running `get-fable install` as a side-effect of unrelated work | Installation must be explicit and idempotent |
| Persisting raw local absolute paths in state | Use `workspaceId` digest |
| Claiming model-tier equivalence in agent messages | Do not assign or compare model tiers |
| Scaffolding a monolith when architecture vectors exceed thresholds | Enforce microservices decomposition |
| Internal HTTP/JSON mesh between services | Use gRPC Protobuf or message broker |

---

## 14. Recovery protocol

When `failureStreak >= 2`, `fable-recover` is activated automatically by `fable_fail_streak.py`. Follow this diagnosis order — never skip a level:

```
1. Harness and environment
   -> broken binary, wrong Bun version, missing dependency, bad PATH, permission error

2. Actual execution path
   -> wrong branch, stale build cache, generated output mismatch, wrong runtime identity

3. Product logic
   -> incorrect algorithm, wrong data shape, missing edge case

4. Violated invariant
   -> state contract mismatch, registry inconsistency, schema migration bug
```

A recovery attempt must produce new evidence or change the diagnosis. The same repair attempted again without new diagnosis is not a recovery.

---

## 15. Session handoff contract

When ending a session with substantial work in progress, `fable-handoff` must produce:

- Current phase and selected specialist
- All open ledger cards with acceptance criteria
- Latest evidence records and their generation stamps
- `mutationGeneration` and `verifiedGeneration` values
- Explicit next action for the resuming session
- Any blocking findings or pending mutations

```bash
bun ./bin/get-fable.js evidence pass handoff "session-end" "handoff created with open card X and next action Y"
```

Handoff evidence does **not** close the behavior-completion gate.

---

## 16. Host integration tiers

| Tier | What the host enforces | Hosts |
|---|---|---|
| **Full Lifecycle** | 5 Python hooks + skills + rule file | Claude Code, Google Antigravity / Gemini CLI, Grok Build |
| **Skill + Rule + Plugin** | Skills + plugin manifest + rule file | OpenAI Codex, ChatGPT |
| **Skill + Rule** | Canonical skills + rule file | Devin, OpenCode, Roo Code, Cline, OpenHands, Kilo Code, Hermes Agent |
| **Rule + Hooks** | Rule file + lifecycle hook definitions | Kiro |
| **Advisory Rule** | Rule file only — no enforcement | Cursor, Copilot, Windsurf, Replit, Amazon Q, Trae, Warp, Kimi, Atlarix, Vellum, Codegen, Muse, Junie, Qodo, Aider, Continue, Plandex, AutoGPT, Pi Code |
| **Cordis Plugin + Web UI** | Cordis patch bundle + prebuilt `dist/client.js` | DeepSeek Harness (DSH) |

An Advisory Rule host does not enforce lifecycle gates. The agent on such a host must apply evidence and completion rules manually via the CLI.

---

## 17. Behavioral evaluation

Behavioral proof distinguishes "the skill exists" from "the skill behaves correctly":

```bash
# Export blinded evaluation requests (does not leak oracles)
bun ./bin/get-fable.js behavior-eval export --out /tmp/fable-behavior-requests.json

# Score independent provider responses
bun ./bin/get-fable.js behavior-eval score /tmp/provider-responses.json \
  --out evals/results/agent-behavior-v1.json

# Check evidence freshness against current Skill corpus
bun ./bin/get-fable.js behavior-eval status
```

Evidence hashes make older behavioral results stale when skills change materially. Do not inherit a previous badge for updated skills without re-running the evaluation.

---

## 18. Durable learning & Failure-lessons knowledge base

`fable-learning`, `get-fable learn`, and `hooks/fable_session_learn.py` extract failure lessons and durable project knowledge into `Failure-lessons/`, `.fable/learnings.json`, `agent-kernel`, and `gbrain`.

> **Pay for an engineering mistake once. After that, the project should remember it.**

The canonical failure knowledge base resides in:
```text
Failure-lessons/
├── README.md                     # Knowledge base principles, triggers, and maintenance rules
├── lessons-index.md              # Compact registry table and "Rules We Now Enforce"
├── testing-and-verification.md   # Regression test mappings, oracle proofs, and test strategies
└── <topic-specific-lessons>.md   # Grouped by failure class (e.g. state-management.md)
```

Learnings must be:
- **Organized by failure class, not ticket number**: Prefer descriptive failure mechanisms over Jira/GitHub IDs.
- **Fact vs. hypothesis separated**: Explicitly label root causes as Confirmed, Strongly indicated, Open hypothesis, or Unknown.
- **14-section schema compliant**: Document context, symptoms, root cause, architectural condition, fix, verification, prevention rule, and regression tests.
- **Connected to tests**: Map failures to automated regression tests (`failure -> regression test -> invariant being protected`).
- **Atomic & Secret-safe**: One invariant per rule; strip credentials, tokens, and private host paths.

---

## Related files

| File | Purpose |
|---|---|
| `CLAUDE.md` | Claude Code-specific rules and hook configuration |
| `skills/get-fable/registry.json` | Canonical skill registry (authoritative source) |
| `hooks/README.md` | Lifecycle hook contract and safety rules |
| `docs/ARCHITECTURE.md` | System architecture documentation |
| `docs/USAGE.md` | CLI usage guide |
| `docs/INSTALLATION.md` | Full installation and host integration guide |
| `docs/CANONICAL_SKILLS.md` | Generated skill catalog (do not edit by hand) |
| `docs/BEHAVIOR_EVIDENCE.md` | Behavioral proof protocol |
| `docs/HOSTS.md` | Multi-host platform matrix |
| `SECURITY.md` | Full security trust boundary |
| `CHANGELOG.md` | Release history |
