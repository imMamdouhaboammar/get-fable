# Install & Initialize get-fable (`install-and-init-get-fable`)

Deterministic, step-by-step onboarding, host installation, workspace initialization, and toolchain provisioning guide for AI agents and human developers across **32 AI coding platforms** and **46 canonical skills**.

---

## 1. Activation Contract (When to Run This Playbook)

Any autonomous agent or developer entering a machine or repository must execute this playbook if:
1. `get-fable` CLI is not installed globally or not in `PATH`.
2. The current repository does not have an initialized [`.fable/`](file:///.fable/) state directory.
3. Installed AI host configurations (Claude, Antigravity, Codex, Cursor, Windsurf, etc.) lack the 46 canonical skills or 5 Python lifecycle hooks.
4. `get-fable doctor --json-v1` reports missing tools, unconfigured hooks, or errors.

---

## 2. Pre-Flight Runtime Requirements & Invariants

Before mutating any global or workspace configuration, verify the host runtime environment:

| Runtime / Tool | Minimum Version | Required For | Failure Remediation |
|---|---|---|---|
| **Bun** | `≥ 1.3.0` | Mandatory CLI runtime, script execution, package management | `curl -fsSL https://bun.sh/install \| bash` (never use `npm` or `yarn`) |
| **Git** | `≥ 2.30.0` | Version control, worktree isolation, pre-commit/pre-push hooks | System package manager (`brew install git` / `apt install git`) |
| **Python** | `≥ 3.9` | 5 mechanical zero-overhead lifecycle hooks (`hooks/*.py`) | System package manager (`brew install python3` / `apt install python3`) |

### Pre-Flight Probe Command
```bash
bun --version && git --version && python3 --version
which get-fable get-fable-native no-mistakes cargo 2>/dev/null || true
```

> [!CAUTION]
> **Bun-Only Invariant**: Every JavaScript/TypeScript execution in `get-fable` must use Bun first. `npm` and `yarn` are strictly prohibited.
> **No Symlink State**: `.fable` must be a real directory. Symlinked `.fable` directories are rejected by the security engine.

---

## 3. Global CLI Installation

Install the `get-fable` binary on the machine using one of the following methods:

### Method A: Bun Global (Recommended across all platforms)
```bash
bun add -g get-fable
```

### Method B: Homebrew (macOS & Linux)
```bash
brew tap imMamdouhaboammar/get-fable https://github.com/imMamdouhaboammar/get-fable
brew install get-fable
```

### Method C: Standalone One-Line Installer (CI / Docker / Bare Metal)
```bash
curl -fsSL https://raw.githubusercontent.com/imMamdouhaboammar/get-fable/main/install.sh | sh
```

### Method D: Direct Cloned Source Repo
```bash
bun install && bun run build && bun link
```

### Verification
```bash
get-fable --version
```

---

## 4. Multi-Host Integration & Skill Deployment (32 Platforms)

`get-fable` integrates natively with 32 AI agent platforms, delivering the **46 canonical skills** across 8 lifecycle packs and wiring mechanical lifecycle hooks.

### Step 4.1: Deploy Host Integrations & Lifecycle Hooks
```bash
# Configure all detected hosts on the system at once
get-fable install all

# Or target specific hosts:
get-fable install antigravity
get-fable install claude
get-fable install codex
get-fable install cursor
get-fable install windsurf
get-fable install grok
```

Full Lifecycle hosts (`claude`, `antigravity`, `grok`) receive the 5 mechanical Python hooks:
1. `hooks/fable_profile_inject.py`: Session start context injection (phase, mutation generation, streak).
2. `hooks/fable_spawn_guard.py`: Guard against unauthorized large delegation without an open ledger card.
3. `hooks/fable_fail_streak.py`: Automatic failure streak tracking; switches to `fable-recover` on `streak >= 2`.
4. `hooks/fable_mutation.py`: Mutation generation tracking on write tool calls.
5. `hooks/fable_close_guard.py`: Blocks completion when verification is stale or cards remain unverified.

### Step 4.2: Install Canonical Skills Pack
```bash
# Deploy all 46 skills across Core, Intelligence, Build, Proof, Delivery, Evolution, System, and Creator packs
get-fable skills install all

# Universal skill package manager alternative
bunx skills add imMamdouhaboammar/get-fable
```

Verify skill distribution:
```bash
get-fable packs
```

---

## 5. Workspace Lifecycle Initialization (`.fable/`)

Run inside the root of any target Git repository to bootstrap the evidence state machine:

```bash
get-fable init
```

### Initialized Directory Layout (Schema v3)
```text
.fable/
├── state.json              # Canonical runtime state (schema v3, workspaceId digest)
├── LEDGER.md               # Persistent task ledger & active work cards
├── PROGRESS.md             # Chronological milestone log
├── events.jsonl            # Append-only structured event journal
└── pending-mutations/      # Lock recovery tokens for concurrent writes
docs/
└── SPEC.md                 # Project requirement & verification specification
```

### Critical Workspace Invariants
- `workspaceId`: SHA-256 digest of canonical repository path. Copied state from another workspace is rejected (`Rejected foreign state`).
- `schemaVersion`: 3.
- `stateRevision`: Monotonically increasing counter.

---

## 6. Supporting Toolchain & Quality Gates

Install accompanying engineering quality gates and developer productivity enhancements:

```bash
# 1. Canonical Git pre-commit & pre-push lifecycle hooks
get-fable install git

# 2. no-mistakes mandatory Git push quality gate (pre-push automated review, test, lint, and docs)
get-fable install-no-mistakes

# 3. TypeSafe AI Jev environment configuration template (.env + LLM provider fallback)
get-fable install jev

# 4. Shell prompt integration & power-user command aliases
get-fable install shell
```

### Installed Shell Aliases
| Alias | Canonical Command | Responsibility |
|---|---|---|
| `gfr` | `get-fable route` | Deterministic task routing |
| `gfs` | `get-fable spark` | Next-atomic-step situational awareness |
| `gfc` | `get-fable card` | Work card open/clear |
| `gfe` | `get-fable evidence pass` | Evidence recording |
| `gfm` | `get-fable mutation` | Explicit workspace mutation tracking |
| `gfst` | `get-fable status` | Quick lifecycle inspection |
| `gfd` | `get-fable doctor` | System health diagnostics |
| `gfl` | `get-fable lint` | Ledger and state semantics lint |

---

## 7. Interactive Capability Provisioning (`/fable-eco`)

`get-fable` provides curated external tooling profiles managed deterministically through `.fable/eco.json` and `.fable/eco.lock`.

### Step 7.1: Discover Capability Deficits
```bash
get-fable eco discover --json-v1
```

### Step 7.2: Select and Install Profile
Choose the capability profile that fits the project:

| Profile | Included Tools & Capabilities | Target Workload |
|---|---|---|
| `core` *(Recommended)* | `ripgrep`, `fd`, `jq`, `git-lfs`, `gh` | High-speed search, JSON querying, GitHub CLI |
| `dev-fast` | `core` + `uv`, `bun`, `ast-grep`, `hyperfine`, `watchexec` | Fast Python/TypeScript tooling, AST lint, file watch |
| `polyglot` | `dev-fast` + `rustup`, `go`, `just`, `shellcheck`, `actionlint` | Systems engineering, Go/Rust runtimes, CI workflow lint |
| `mcp-core` | Curated MCP servers (`filesystem`, `git`, `fetch`, `memory`) | Model Context Protocol tool enrichment |
| `agency` | Multi-agent CLI orchestration helpers | Parallel subagent delegation & council workflows |
| `full` | All curated CLI tools, MCP servers, and workflow packs | Complete developer workstation suite |

### Step 7.3: Plan & Apply Provisioning
```bash
# Preview operations
get-fable eco plan core --json-v1

# Install capabilities
get-fable eco install core --yes

# Verify ecosystem health
get-fable eco doctor --json-v1
```

---

## 8. Health Verification & Auto-Repair

Execute the full diagnostic suite to ensure 0 errors:

```bash
# Auto-repair minor harness anomalies
get-fable doctor --fix

# Verify state and checks
get-fable status --json-v1
get-fable doctor --json-v1
get-fable lint
```

Acceptance Gate: `doctor` must report **0 ERROR-severity checks**.

---

## 9. The Daily 6-Step Autonomous Coding Loop

Once installed and initialized, all feature work follows this canonical loop:

```bash
# 1. Route the task to the right specialist skill
get-fable route "implement user authentication with JWT" --apply --json-v1

# 2. Open an active work card in .fable/LEDGER.md
get-fable card "Add JWT authentication middleware and tests"

# 3. Transition lifecycle phase to executing
get-fable state executing --substantial

# 4. Implement changes (edits automatically advance mutationGeneration)
# Manual mutation record if not running on a Full Lifecycle host:
get-fable mutation "src/auth.ts"

# 5. Execute verification gates and record fresh machine-checked evidence
bun run typecheck && bun test && bun run build
get-fable evidence pass test "bun test" "All unit and integration tests pass"
get-fable evidence pass build "bun run build" "Production bundle compiles cleanly"

# 6. Complete lifecycle, clear active card, and codify durable learnings
get-fable state complete
get-fable card --clear
get-fable learn --failure-lessons
```

---

## 10. Agent Failure Recovery Matrix

| Failure Symptom | Root Cause | Automated Remediation |
|---|---|---|
| `bun: command not found` | Bun runtime missing from `PATH` | Run `curl -fsSL https://bun.sh/install \| bash` and export `PATH="$HOME/.bun/bin:$PATH"` |
| `verifiedGeneration < mutationGeneration` | Workspace mutated after last test pass | Re-run test/build verification suite and record fresh `evidence pass` |
| `Rejected foreign state` | `.fable/state.json` was copied from another repo | Delete foreign state and run `get-fable init` to generate a native `workspaceId` |
| `Pending mutation debt` | Hook could not acquire file lock during write | Run `get-fable doctor --fix` to reconcile pending mutation tokens |
| `failureStreak >= 2` | 2 consecutive tool or command failures | Fable Circuit Breaker locks execution; route to `fable-recover` immediately |
