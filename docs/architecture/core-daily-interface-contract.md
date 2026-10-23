# Core <-> Daily Commercial Interface Contract

## 1. Purpose and Boundaries
This contract defines the machine-readable integration boundary between the open-source `get-fable` harness (`get-fable-core`) and the commercial `Fable Daily` / `Fable Enterprise` control plane.

The commercial system acts as an external orchestrator, policy engine, and GitHub Check Run provider. It consumes core CLI commands and reads repository state without forging evidence or corrupting local lifecycle invariants.

---

## 2. Machine-Readable CLI Invocations

The Daily Control Plane and GitHub Actions runner interact with the local repository harness exclusively through standardized JSON-v1 CLI endpoints:

### 2.1 Repository Status Probe
```bash
bun ./bin/get-fable.js status --json-v1
```
- **Returns:** JSON object containing `schemaVersion`, `command: "status"`, and `data.project` with `active: boolean`, `stateSchemaVersion: 3`, and current `phase`.
- **Usage:** Preflight check to verify whether a repository has initialized Fable lifecycle state.

### 2.2 System Health and Integrity Audit
```bash
bun ./bin/get-fable.js doctor --json-v1
```
- **Returns:** JSON object with `ok: boolean` and list of `checks` covering skills, plugins, and configurations.
- **Usage:** Gating check before running automated PR verification workflows.

### 2.3 Task Routing and Specialist Selection
```bash
bun ./bin/get-fable.js route "<task_description>" --json-v1
```
- **Returns:** Deterministic routing packet containing `selectedSkill`, `confidence`, `taskShape`, and `requiredGates`.
- **Usage:** Daily MCP tool execution to suggest appropriate specialists for developer work cards.

---

## 3. Evidence Freshness and Gate Evaluation Protocol

The commercial control plane reads `.fable/state.json` directly to compute GitHub Check Run statuses for Pull Requests.

### 3.1 Invariant Rules
1. **Freshness Invariant:** Verification evidence is considered valid if and only if `verifiedGeneration >= mutationGeneration`.
2. **Commit SHA Binding:** Any gate decision must bind to the immutable git `headSha`. If a new commit (`synchronize` event) is pushed, prior decisions become immediately `STALE`.
3. **Honest Failure Reporting:** If a task produced failure evidence in the current generation, the status must report `BLOCKED` even if passing evidence existed in earlier generations.
4. **No Synthesized Evidence:** The commercial server-side control plane must NEVER write synthetic `pass` records into `.fable/state.json`. Evidence must originate from actual command execution on the runner.

### 3.2 Gate Decision State Mapping
| State Condition | Gate Decision | GitHub Check Run Status |
|---|---|---|
| `verifiedGeneration >= mutationGeneration` and latest evidence passes | `PASS` | `conclusion: "success"` |
| `verifiedGeneration < mutationGeneration` | `STALE` | `conclusion: "action_required"` |
| Latest evidence for active claim has `pass: false` | `BLOCKED` | `conclusion: "failure"` |
| State missing, unreadable, or missing required check | `UNKNOWN` | `conclusion: "neutral"` |

---

## 4. Work Card and TOON Protocol Integration
When commercial workers dispatch multi-agent tasks, they format inter-agent instructions and execution contracts using Token-Optimized Object Notation (TOON) via `@toon-format/toon`:
- Delegation templates: `skills/fable-delegate/templates/delegation-contract.toon`
- Return packets: `return-packet.toon`
- Raw unbounded JSON dumps between agents are prohibited to enforce token budget discipline.
