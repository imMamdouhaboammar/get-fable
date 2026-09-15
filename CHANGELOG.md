# Changelog

All notable changes to `get-fable` are documented in this file.

## [1.9.0] - 2026-09-15

### Highlights

- **`fable-heal` Autonomous Security Remediation Skill (`skills/fable-heal/`)**:
  - **Automated Security Patch Synthesis**: Automatically parses `fable-redteam` findings and SARIF vulnerability reports (`docs/security/REDTEAM_REPORT.sarif`) to synthesize targeted, safe remediation diffs across application and infrastructure code.
  - **TDD Security Regression Guards**: Generates failing regression test suites that replicate vulnerability proofs (e.g. verifying sensitive file exposure blocks 401/403/404, SQL syntax error reflection mitigations, and credential leak guards) before applying fixes.
  - **Cryptographic Heal Attestations**: Outputs verifiable attestation records (`.fable/heal-attestation.json`) including SHA-256 fingerprint, CWE reference, CVSS base score, before/after checksums, and execution timestamps.
  - **CLI Command (`get-fable heal`)**: Shipped full CLI remediation runner with `--dry-run`, `--sarif`, `--auto`, and `--verify` modes.

- **Cloudflare Security Scanner Adapter (`src/core/redteam/adapters/cloudflare.ts`)**:
  - Native redteam audit adapter for Cloudflare edge configurations: validates SSL/TLS minimum versions, WAF managed rulesets, zone security headers, and DDoS rate limiting.

- **Alibaba OCR Code Review Standards (`src/core/review/` & `skills/fable-review/references/alibaba-ocr-rulesets.md`)**:
  - Integrated enterprise-grade Alibaba OCR code review rulesets into `fable-review`, enforcing deterministic memory budgets, asynchronous execution safety, input validation boundaries, and structured error handling.

- **Rust Native Core Engine Parity (`crates/fable-core/` & `crates/fable-cli/`)**:
  - High-performance Rust native engine (`get-fable-native`) implementing task routing, state schema v3 inspection, and status reporting with 100% semantic parity against the TypeScript reference harness.

- **29 Canonical Skills & Universal 32-Platform Distribution**:
  - Reached 29 canonical skills across 8 lifecycle packs with complete schema v2 package manifests and Deep Playbook V2 documentation.
  - Synchronized and verified native integrations across all 32 supported AI coding hosts and IDE environments.

## [1.8.0] - 2026-09-14

### Highlights

- **`fable-architecture` Architecture Enforcement Skill (`skills/fable-architecture/`)**:
  - **Deterministic Architectural Vector Scoring**: Analyzes project specifications across Scale & Load (traffic, RPS, latency, concurrency), Domain Decoupling (bounded contexts, independent teams, polyglot data models), and Resource Intensity (GPU/TPU, compute-bound vs IO-bound, streaming workloads) to produce an authoritative composite score (0-10).
  - **Hard Monolith Lockout**: Automatically locks out monolithic scaffolding (`allowMonolith: false`) when vector thresholds cross defined thresholds (Scale ≥ 7, Domains ≥ 6, or Resource ≥ 8; or Composite ≥ 7.0), preventing AI agents from collapsing high-scale distributed systems into fragile monoliths.
  - **Dual-Transport Standard (ADR 0007)**: Mandates North-South HTTP/REST for external edge traffic and East-West gRPC Protobuf / Message Brokers for internal inter-service communication, explicitly prohibiting internal HTTP/JSON mesh calls.
  - **Prescriptive Multi-Language Matrix**: Selects purpose-built language and framework stacks based on workload scenario (Scenario 1 Node.js/Bun/Fastify for high-concurrency gateways; Scenario 2 Go/Gin/gRPC for high-throughput distributed microservices; Scenario 3 Python/FastAPI/PyTorch/Ray for AI/ML inference; Scenario 4 Rust/Axum/Tonic for ultra-low-latency mission-critical systems).
  - **Project Inception Hook Interception (`hooks/fable_architecture_guard.py`)**: Intercepts session starts and pre-invocation prompts to inject architectural constraints and enforce microservices decomposition before any code is generated.
  - **CLI Evaluation Command**: Added `get-fable arch-eval "<spec>"` to evaluate project specs and output TOON/JSON manifests on demand.

- **Fable Worker gRPC RPC Framework (`proto/` & `src/rpc/`)**:
  - **High-Performance Worker Service**: Shipped `proto/fable_worker.proto` with Protobuf service definitions (`ExecuteTask`, `StreamLogs`, `GetStatus`, `CancelTask`) for distributed subagent execution.
  - **Fable Worker Server**: Built `FableWorkerServer` (`src/rpc/server.ts`) and client SDK (`src/rpc/client.ts`), runnable via `get-fable worker-serve` or `get-fable rpc-serve`.

- **Native `no-mistakes` Quality Gate Integration (`src/integrations/no-mistakes-installer.ts`)**:
  - **Automated Installation & Setup**: Introduced `get-fable install-no-mistakes` (aliased to `get-fable install-quality-gate`), automatically configuring the no-mistakes gate, template `.no-mistakes/` configuration, and Git pre-push hook integration.

- **Automated Contributor Outreach Relay (`src/outreach/`)**:
  - **Trusted Community Outreach**: Merged idempotent GitHub relay pipeline converting external contributor PRs and issues into structured GitHub Discussions with strict provenance verification and bot candidate filtering.

- **DSH Web UI Script Sanitizer & Prebuilt Distribution**:
  - Shipped `scripts/build-client.ts` to automatically strip ESM export statements from `dist/client.js`, enabling clean script concatenation in DeepSeek Harness / Cordis classic script combo bundling.

## [1.7.0] - 2026-09-14

### Highlights

- **Grok Bot & xAI Provider Adapter (`tools/adapters/grok/`)**:
  - **Autonomous Grok Bot Integration**: Added official Grok Bot agent persona (`agents/grok-bot.md`) and command-line execution (`get-fable grok "<task>"` and `get-fable grok-bot --status`).
  - **Full xAI Provider Adapter (`GrokBotAdapter`)**: Implemented complete provider bridge connecting xAI `grok-2-latest` API with offline simulation mode for testing, first-principles truth discovery, and strict TDD enforcement.
  - **Adapter Parity**: Registered Grok tool adapter in `tools/adapters/grok/index.json`, host contracts, and multi-agent lifecycle hooks.

- **TOON (Token-Optimized Object Notation) Protocol**:
  - **High-Density Tabular Serialization**: Introduced TOON format with `src/core/toon.ts`, achieving 30–50% token reduction across multi-agent communications.
  - **Lossless Subagent Delegation & Return Packets**: Shipped `skills/fable-delegate/templates/delegation-contract.toon` and `return-packet.toon` for standardized, fail-closed subagent task delegation.
  - **Durable State Compaction**: Compacted FableState and evidence arrays into high-density TOON blocks for prompt budget preservation.

- **`fable-learning` Self-Improvement Lifecycle Skill (Evolution Pack)**:
  - **Autonomous Learning Capture**: Added `fable-learning` canonical skill with dedicated Deep Playbook V2 documentation, templates, and evaluation benchmarks.
  - **Session-Learning Hook Dispatcher (`hooks/fable_session_learn.py`)**: Automatic extraction of durable lessons, behavioral facts, and tactical playbooks into `.fable/learnings.json` upon task completion.

- **Universal Multi-Agent Host Synchronization (32 Platforms)**:
  - Updated and synchronized plugin manifests and marketplace definitions across all 32 supported hosts including Claude Code, Google Antigravity, OpenAI Codex, ChatGPT, Cursor, Windsurf, DeepSeek Harness, OpenCode, Devin, Roo Code, Cline, and Kiro.

## [1.6.1] - 2026-09-13

### Highlights

- **Prebuilt DSH Plugin Bundles & Zero-Build Installation**:
  - Included prebuilt runtime bundles (`dist/index.js`, `dist/cli.js`, `dist/client.js`) in repository and npm package distribution, enabling instantaneous zero-build installation on DeepSeek Harness / Cordis without hitting the default `allowBuilds` security block.
  - Added native `dsh.plugin.json` declaring `get-fable` plugin with prebuilt entrypoints, browser client export, and `"build": false`.
  - Updated upstream DeepSeek Harness catalog manifest (`data/plugins/imMamdouhaboammar__get-fable.yml`) with full 26-skill canonical lifecycle routing and interactive web dashboard.

## [1.6.0] - 2026-09-13

### Highlights

- **Enterprise RedTeam Security Orchestration Engine (`fable-redteam`)**:
  - **Dynamic CIDR Subnet Scoping & Cloud Metadata Protection**: Strict network perimeter validation via `isIpInCidr`, proactive blocking of cloud instance metadata services (`169.254.169.254`) across AWS/GCP/Azure, and maintenance window enforcement.
  - **Adaptive Circuit Breaker & Resilient Throttling**: Finite-state machine circuit breaker (`CLOSED` → `OPEN` → `HALF_OPEN`) halting probing upon encountering repeated server errors (502/503/504), paired with exponential backoff and randomized jitter on HTTP 429 rate limits.
  - **Automated CVSS v3.1 Scoring & Compliance Cross-Referencing**: Programmatic CVSS v3.1 vector calculation and base score generation. Findings are automatically mapped against OWASP Top 10 2021, OWASP API Security Top 10 2023, PCI-DSS v4.0, and SOC 2 Type II trust criteria.
  - **CI/CD Quality Gates & Baseline Diffing**: Regression detection with `--baseline`, suppression via `--suppress`, and automated pipeline termination via `--fail-on-cvss <score>`.
  - **Cryptographic Attestation & Audit Trail**: SHA-256 tamper-evident attestation records (`.fable/run-attestation.json`) binding probe signatures, target metadata, and finding hashes.
  - **Executive Risk Scorecards & MTTR**: Executive scoring (grades A through F) with estimated Mean Time to Remediate (MTTR) calculation in executive summaries.
  - **Enriched SARIF v2.1.0 Export**: Full compatibility with GitHub Advanced Security code scanning, containing `security-severity` scores and multi-standard compliance taxonomies.

### Fixed

- **Durable mutation debt under state-lock contention**: when a Python lifecycle mutation hook cannot acquire the bounded state lock and lifecycle storage remains writable, it now writes a unique, content-free ownership token under `.fable/pending-mutations/`. Stop blocks while any token is present, and the next successful Python or TypeScript state transaction validates and folds its token snapshot into `mutationGeneration` before it can accept new verification or completion. Malformed, foreign, symlinked, or special-file debt fails conservatively.
- **Lifecycle filesystem boundary**: reject symlinked `.fable` directories and non-regular lifecycle files before state, ledger, lock, initialization, or repair I/O. Python Stop treats an unsafe local boundary as a blocking error, not as an uninitialized project. Event journal paths receive the same static-path protection. Atomic writes reject existing temporary paths without modifying or deleting them. This does not eliminate concurrent path-swap races.
- **Explicit hook workspace authority**: lifecycle hooks now fall back to their process working directory only when a host omits workspace authority. A supplied but invalid, missing, non-directory, or malformed canonical `cwd` or supported host alias no longer reads or mutates `.fable` state belonging to the hook process workspace.
- **Linked-worktree state isolation**: Python lifecycle hooks now treat every `.git` filesystem entry as a repository boundary. A linked worktree without local `.fable/` state can no longer read or mutate an ancestor workspace's durable state.

## [1.5.1] - 2026-08-28

### Fixed

- **Packaged npm Doctor Supply-Chain Resolution**: Fixed `get-fable doctor` supply-chain check when running from packaged npm/bun distributions where `.github/workflows` is excluded by design from the distribution tarball.

## [1.5.0] - 2026-08-28

### Highlights

- **Universal Multi-Agent Ecosystem Expansion (30+ Supported AI Platforms)**: Extended get-fable rules, prompts, instructions, and canonical skills across 30 AI coding platforms including Claude Code, Google Antigravity & Gemini CLI, OpenAI Codex & ChatGPT, GitHub Copilot, Devin, Windsurf, Replit Agent, Amazon Q Developer, Grok Build, JetBrains Junie, Roo Code, Cline, OpenHands, OpenCode, Aider, Cursor, Continue, Kilo Code, Plandex, AutoGPT, Hermes Agent, Moonshot Kimi, DeepSeek, Kiro, Pi Code, Trae, Warp AI, Atlarix, Vellum, Codegen, Muse Code, Qodo, and Agent Kernel.
- **Universal Codex & ChatGPT Plugin Package (`.codex-plugin/`)**: Implemented complete Codex plugin roots with `.codex-plugin/plugin.json`, native hooks integration (`hooks.codex.json`), and standalone marketplace submission assets.
- **Host-Neutral Lifecycle Hook Dispatcher (`fable_hook_dispatch.py`)**: Added a unified Python hook dispatcher supporting Claude Code, Google Antigravity, and OpenAI Codex event schemas with privacy-safe lifecycle journaling (`.fable/events.jsonl`).
- **Antigravity Five-Event Native Hook Bundle**: Added native PreToolUse, PostToolUse, PreInvocation, PostInvocation, and Stop lifecycle hook integrations for Google Antigravity.
- **Deterministic & State-Aware Routing Policy**: Hardened task router with tie-breaking, suppression handling, and evidence-driven parallel candidate selection.

### Added

- `hooks/fable_hook_dispatch.py`: Canonical host-agnostic hook dispatcher.
- `hooks/hooks.codex.json` & `assets/antigravity/hooks.json`: Native lifecycle hook definitions for Codex and Antigravity.
- `.agents/plugins/marketplace.json`: Repo-local marketplace submission manifest.
- Prompts, directives, and rules for 20+ additional AI coding agents in `prompts/`.
- Official vector SVG logos in `assets/logos/` and `site/assets/logos/`.

## [1.4.0] - 2026-08-28

### Highlights

- **Canonical Skill Pack Deepening (/skill-conductor & /skill-creator compliance)**: Upgraded all 25 canonical specialist skills across 8 lifecycle packs with 4-part description formulas, 30+ Deep Playbook V2 reference guides (>1,000 to >3,000 bytes each), concrete execution templates, and 10-scenario evaluation benchmarks.
- **Official Vector SVG Logos Integration (`@lobehub/icons`)**: Integrated authentic, official vector SVG logos from `@lobehub/icons` and host repositories for Claude Code, Google Antigravity & Gemini, OpenAI Codex & ChatGPT, Cursor IDE, OpenCode, DeepSeek Harness, Moonshot Kimi, Kiro, Pi Code, VS Code, and Windsurf in `assets/logos/` and `site/assets/logos/`.
- **Master Multi-Platform Installation Guide (`docs/INSTALLATION.md`)**: Added unified installation documentation covering Vercel/skills.sh CLI (`npx skills add imMamdouhaboammar/get-fable`), Homebrew formula with shell completions and prompt hooks, global Bun/npm CLI, universal curl installer, and 10 AI coding agent hosts.
- **Upgraded Plugins & Marketplaces**: Upgraded `.claude-plugin/`, `.codex-plugin/`, and `.chatgpt-plugin/` manifests with updated metadata, keyword taxonomy, and OpenAI Custom Actions.

### Added

- `docs/INSTALLATION.md`: Complete installation and host integration guide with real SVG logos and quick-start matrix.
- `assets/logos/` & `site/assets/logos/`: Bundled vector SVG assets for all major AI coding agents and IDEs.
- `site/index.html`: Interactive multi-agent ecosystem showcase cards and responsive styles.
- `assets/get-fable-infographic.gif`: Repository architectural infographic deliverable.

## [1.3.0] - 2026-08-19

### Highlights

- **Evidence-Backed Skill Maturity (M4)**: Transitioned all 25 canonical Skills to evidence-backed M4 maturity via an independent, oracle-free behavioral evaluation pipeline.
- **Oracle-Free Behavioral Evaluation**: Introduced `get-fable behavior-eval export` and `score` commands for blinded provider evaluation across 5 adversarial categories (`known`, `negative`, `ambiguous`, `adversarial`, `holdout`) with tamper-proof SHA-256 corpus and oracle binding.
- **Stable Machine-Readable CLI Envelopes (`--json-v1`)**: Added structured, versioned schema envelopes to CLI commands (`route`, `doctor`, `spark`, `behavior-eval`, `feed`, `status`) while maintaining backward-compatible `--json` support.
- **Supply-Chain & Security Hardening**: Pinned all 19 third-party GitHub Actions across 6 workflows to full 40-character commit SHAs, integrated TruffleHog secret scanning, CodeQL static analysis, and npm OIDC Trusted Publishing.
- **End-to-End Test Suite**: Added automated Cypress.io E2E smoke testing for the public web portal and documentation simulator.
- **Multi-Host Parity**: Full installer and lifecycle support verified across 9 agent environments (Claude Code, Antigravity / Gemini, Codex, OpenCode, Cursor, Kimi, DeepSeek, Kiro, Pi Code).

### Added

- `get-fable behavior-eval export`: Exports blinded evaluation requests without leaking oracles, expected outcomes, or forbidden actions.
- `get-fable behavior-eval score`: Scores independent provider response bundles and records signed evidence snapshots.
- `get-fable behavior-eval status`: Verifies evidence freshness against current Skill corpus and oracle digests.
- `--json-v1` flag across all major CLI commands adhering to `schemas/cli-json-envelope.schema.json`.
- TruffleHog OSS secret scanning workflow in `.github/workflows/security.yml`.
- Cypress E2E smoke tests in `.github/workflows/e2e.yml` and `cypress/e2e/site.cy.ts`.
- Automated GitHub Release drafting workflow in `.github/workflows/github-release.yml`.
- Isolated host installer matrix integration testing across all 9 supported host targets.

### Changed

- Lifted maturity distribution across all 25 canonical skills to `M4: 25`, backed by real execution results from Google Cloud Vertex AI (`gemini-2.5-flash`).
- Hardened `doctor` diagnostics to 42 system checks with explicit evidence boundaries distinguishing structural packages from behavioral proof.
- Hardened state transitions to enforce generation-based staleness invalidation when workspace mutations occur.
- Replaced all floating GitHub Actions version tags with immutable 40-character commit SHAs.
- Standardized package distribution whitelist in `package.json` ensuring clean runtime distribution while excluding developer holdouts and internal plans.

### Security & Integrity

- Zero npm dependencies in core runtime; frozen Bun lockfile in CI and local execution.
- High-risk parser fuzzing protecting against path traversal, symlink spoofing, and malformed state revisions.
- Request proxy security boundary with loopback default bind (`127.0.0.1`), header sanitization, and body byte limits.
