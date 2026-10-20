# get-fable Public Roadmap

This roadmap outlines the capabilities, platform support, and architectural evolution of `get-fable`.

---

## 🗺️ Milestone Horizons

```text
Horizon 1: Foundation & Governance (v1.0 - v1.8) [COMPLETED]
├── 44 Canonical Skills with Deep Playbook V2 documentation
├── Schema v3 Deterministic State Machine with evidence-driven gates
├── Universal 32-Platform Harness Integration (Claude Code, Antigravity, Codex, Cursor...)
└── ADR 0007 Transport Architecture & Dual-Protocol Model

Horizon 2: Defense & Distributed Execution (v1.9 - v1.14) [CURRENT]
├── Native Rust Fast-Path Engine (`get-fable-native` & `fable-anti-slop`)
├── Autonomous Ethical Redteaming (`fable-redteam`) & Self-Healing (`fable-heal`)
├── Distributed Subagent Execution via gRPC Worker Service (`fable_worker.proto`)
├── Anti-Churn Engine: work-identity deduplication & typed evidence invalidation
└── Dual-Repository Cut & Synchronous Clean Distribution Pipeline

Horizon 3: Ecosystem Expansion & Autonomy (v1.15 - v2.0) [PLANNED]
├── Autonomous Multi-Agent Council & Deliberation Engine (`fable-council`)
├── Dynamic Capability Lockfile & Remote Skill Provisioning (`fable-eco`)
├── Neural Agent Behavior Evaluation Harness with Live Telemetry
├── Fine-Grained Memory Persistence with Local Vector Embeddings (`fable-memory`)
└── Zero-Overhead WASM Runtime for Embedded Agent Environments
```

---

## 🎯 Capability Pillars

### 1. Evidence-Driven Coding Lifecycle
- **Status:** Production Active (v1.14.0)
- **Features:**
  - Mutation-aware state transitions (`mutationGeneration` vs `verifiedGeneration`).
  - Precedence-ranked evidence gates (`test`, `build`, `runtime`, `review`, `observation`).
  - Automatic failure-streak circuit breaking (`failureStreak >= 2` routes unconditionally to `fable-recover`).

### 2. Multi-Host Integration Matrix (32 Platforms)
- **Status:** Universal Tier Coverage
- **Tiers:**
  - **Tier 1 (Full Lifecycle):** Claude Code, Google Antigravity / Gemini CLI, Grok Build.
  - **Tier 2 (Skill + Rule + Plugin):** OpenAI Codex, ChatGPT.
  - **Tier 3 (Skill + Rule):** Devin, OpenCode, Roo Code, Cline, OpenHands, Kilo Code, Hermes Agent.
  - **Tier 4 (Advisory):** Cursor, Copilot, Windsurf, Replit, Amazon Q, Trae, Warp, Kimi, etc.

### 3. Agent Quality & Slop Prevention
- **Status:** Integrated Engine
- **Features:**
  - Rust-powered anti-slop scanner (`fable-anti-slop`) enforcing SARIF-compatible quality gates.
  - Test tampering detection and weak assertion rejection.
  - Red-green-refactor enforcement (`fable-tdd`) and verification rung ladders (`fable-prove-it`).

### 4. Distributed Multi-Agent & Worker Mesh
- **Status:** Active Deployment
- **Features:**
  - Protobuf contract (`proto/fable_worker.proto`) supporting `ExecuteTask`, `StreamLogs`, `GetStatus`, `CancelTask`.
  - TOON (Token-Optimized Object Notation) serialization delivering 30–50% token reduction across agent boundaries.
  - Strict disjoint ownership verification before parallel agent delegation (`fable-delegate`).

---

## 📅 Release & Versioning Policy

- **SemVer 2.0.0:** Strict semantic versioning for all public APIs, skill schemas, and CLI commands.
- **Evidence-Backed Releases:** Releases are gated by fresh passing test, build, and behavioral evaluation suites.
- **Dual-Repo Hygiene:** Public distribution (`imMamdouhaboammar/get-fable`) contains verified skills, documentation, and installation interfaces; core execution engines remain in private development (`get-fable-core`).
