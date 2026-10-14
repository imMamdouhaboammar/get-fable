# Fable Frontier Testing Engine: Super-Agentic Multi-Tool Platform

## 1. Mission & Core Philosophy

> **"Do not reinvent the wheel. The get-fable testing agent is a super-agentic worker that discovers, provisions, orchestrates, and leverages proven, world-class testing engines as supported tools."**
>
> **بمعنى:**  
> **"إن `get-fable testing agent` هو عبارة عن Super-Agentic Worker بيثبت أدوات اختبار مستقلة بالفعل قائمة، وبيشغلها ويستخدمها. فكرته مش بيعيد اختراع العجلة، بالعكس هو بيثبت أنجح وأقوى الأدوات وبيستغلها في المشاريع بذكاء وتناغم تام."**

Instead of constraining developers and autonomous agents to a single rigid test runner, `get-fable` acts as a **Frontier Testing Orchestrator**. It analyzes the repository's topology (Frontend, Backend API, Microservices, Mobile, Distributed Mesh), selects the optimal tools, provisions configuration and starter files, executes multi-layer test pipelines, and synthesizes verifiable evidence with root-cause failure classification.

---

## 2. REA Evidence Ledger (Studied Upstream Repositories)

Under the Reverse Engineering & Decompilation (`rea`) Evidence-First methodology, five cutting-edge repositories were analyzed and reconstructed into clean-room TypeScript adapters:

| Tool / Engine | Source Repository | Category | SHA-256 Digest | Core Innovation Reconstructed |
| :--- | :--- | :--- | :--- | :--- |
| **Midscene** | `web-infra-dev/midscene` | `ai-vision-e2e` | `8f02f70a59def047...` | Vision-driven GUI agent; locates elements by visual appearance via multimodal LLM; zero selector maintenance; tests `<canvas>` and cross-origin iframes; HTML visual inspection reports. |
| **Keploy** | `keploy/keploy` | `api-record-replay` | `50d396fdab006c36...` | Zero-code API testing & infra virtualization; records network traffic (HTTP, Postgres, MySQL, Mongo, Redis, Kafka) via eBPF/proxy; replays deterministically without live infrastructure. |
| **Distributed E2E** | `efficientgo/e2e` | `distributed-orchestration` | `24c8503356375cc7...` | Programmatic multi-container/process distributed systems orchestration; internal vs external peer endpoints; readiness health probes; metric assertions as first-class citizens (`WaitSumMetrics`). |
| **Tester-Army E2E** | `tester-army/e2e` | `ai-action-cache` | `cc4c678ba99719c8...` | Natural language testing with **Action Caching**; verified agent steps are recorded; subsequent runs replay deterministically with zero model calls until application DOM/UI changes. |
| **Minimal Repro** | `cypress-io/cypress-test-tiny` | `minimal-repro` | `1d0561081be67d0e...` | Minimalist reproducible test harness pattern; strips out noisy boilerplate to isolate defects into executable single-file proofs for red-green falsification. |

---

## 3. Architecture & Subsystems (`src/core/frontier-test/`)

```
src/core/frontier-test/
├── types.ts              # Domain contracts & FRONTIER_TEST_REA_EVIDENCE_LEDGER
├── adapters/
│   ├── base.ts           # BaseFrontierAdapter with safe execution & timeout guards
│   ├── midscene.ts       # Midscene multimodal vision GUI testing adapter
│   ├── keploy.ts         # Keploy zero-code API recording & replay adapter
│   ├── distributed-e2e.ts# EfficientGo-style container orchestration & metric assertion adapter
│   ├── tester-army.ts    # Tester-Army natural language & Action Caching adapter
│   ├── minimal-repro.ts  # Cypress-Tiny minimal reproducible test harness adapter
│   ├── native-runner.ts  # Bun-test, Vitest, and Playwright native runner adapters
│   └── skill-adapters.ts # Open-Agent Testing Skills (Playwright CLI, Anthropic WebApp, etc.)
├── scanner.ts            # /repo-scan & /agentic-repo-discovery topology analyzer & fit scorer
├── orchestrator.ts       # FrontierTestOrchestrator: 14 tools & skills registry
├── evidence-bridge.ts    # Bridges run results to Fable lifecycle evidence & Test-Value Spearhead
└── index.ts              # Public exports
```

### Key Capabilities:

1. **Repository Topology Scanner (`scanner.ts`)**:
   - Detects package managers (`bun`, `npm`, `pnpm`, `cargo`, `go`, `pip`).
   - Identifies project type (`web-frontend`, `backend-api`, `microservices`, `monorepo`, `library`).
   - Detects frameworks (`Next.js`, `React`, `Vue`, `Express`, `Fastify`, `Hono`).
   - Scores testing tool fit from 0 to 100 with actionable reasons and priority tiers.

2. **Super-Agentic Orchestrator (`orchestrator.ts`)**:
   - Generates multi-layer verification plans (`orchestrator.plan(projectRoot, goal)`).
   - Auto-provisions and scaffolds missing tool configurations (`orchestrator.provision(...)`).
   - Executes tests sequentially or in parallel waves (`orchestrator.runPlan(...)`).

3. **Evidence Bridge & Test-Value Integration (`evidence-bridge.ts`)**:
   - Translates tool outputs into cryptographically digested Fable evidence records.
   - Enforces the **Zero-Selection Guard**: Fails closed if exit code is 0 but 0 tests were executed.
   - Connects to the `test-value` failure classifier (`PRODUCT_REGRESSION`, `OBSOLETE_OR_OVERFIT_ASSERTION`, `ENVIRONMENT_DEPENDENCY_FAILURE`, `UNSTABLE_TEST`).

---

## 4. Zero-Decision Autonomous Auto-Pilot Architecture

### The Core Principle:
> **"المستخدم لا يحتاج ان يقرر (النظام يقرر وينفذ تلقائياً بذكاء)"**  
> *"The user does not need to decide: the system autonomously discovers, selects, provisions, executes, and stamps test evidence with zero manual friction."*

When triggered via CLI (`get-fable test-engine`, `get-fable test-engine auto`, or through lifecycle verification gates like `fable-verify`), the Frontier Testing Engine acts as an autonomous auto-pilot:
1. **Autonomous Topology Discovery**: Analyzes codebase shape (languages, frameworks, microservices, containerization, and test inventory).
2. **Autonomous Toolchain Ranking & Selection**: Dynamically picks the top multi-layer verification tools without requiring human prompts.
3. **Autonomous Auto-Provisioning**: Checks tool configuration status; if missing, auto-scaffolds configurations and starter fixtures immediately on the fly.
4. **Autonomous Multi-Wave Execution**: Runs the multi-layer pipeline (Unit -> API Traffic Mock Replay -> Visual Vision AI E2E -> Distributed Mesh).
5. **Zero-Selection Guard & Failure Diagnosis**: Fails closed if 0 tests ran, classifies any failures (`PRODUCT_REGRESSION`, `OBSOLETE_OR_OVERFIT_ASSERTION`, etc.), and auto-scaffolds minimal repro harnesses (`minimal-repro`) to isolate defects.
6. **Autonomous Lifecycle Evidence Stamping**: Writes cryptographically hashed evidence records directly to `.fable/state.json` and updates `verifiedGeneration`.

---

## 5. CLI Reference (`get-fable test-engine`)

```bash
# Autonomous Auto-Pilot (Default — Zero-Decision Execution)
bun ./bin/get-fable.js test-engine [--dry-run] [--json-v1]
bun ./bin/get-fable.js test-engine auto [dir] [--dry-run] [--no-evidence]

# Inspection & Specific Subcommands (Optional)
bun ./bin/get-fable.js test-engine status [--json-v1]
bun ./bin/get-fable.js test-engine scan [dir] [--json-v1]
bun ./bin/get-fable.js test-engine plan "Full system regression test" [--json-v1]
bun ./bin/get-fable.js test-engine install <tool-id>
bun ./bin/get-fable.js test-engine run <tool-id> [--dry-run]
bun ./bin/get-fable.js test-engine repro "Defect Isolation Scenario"
bun ./bin/get-fable.js test-engine provenance [--json-v1]
```

---

## 5. Doctor Health Check

The Fable System Doctor (`bun ./bin/get-fable.js doctor`) mechanically validates:
- Presence of all 5 REA-attested upstream repository entries with authentic 64-character SHA-256 digests.
- Active registration of all 8 Frontier Test adapters.
- Diagnostic check ID: `frontier-test-engine` -> `PASS`.
