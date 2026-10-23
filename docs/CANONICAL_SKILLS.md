# Canonical Skill Catalog

Generated from `skills/get-fable/registry.json` by `bun run generate:catalog`. Do not edit by hand.

| Order | Pack | Audience | Skill | Phase | Job |
| ---: | --- | --- | --- | --- | --- |
| 0 | core | consumer | `get-fable` | idle | Orchestrate software engineering workflows across the canonical get-fable coding lifecycle with deterministic routing and evidence precedence. |
| 10 | core | consumer | `fable-discover` | discovering | Gather the smallest set of repository, environment, documentation, and runtime evidence needed before planning or changing code. |
| 15 | intelligence | consumer | `fable-research` | discovering | Resolve current external facts, official documentation, library behaviors, and API contracts against primary sources before implementation. |
| 20 | core | consumer | `fable-plan` | planned | Convert discovery evidence into bounded, testable work cards with explicit acceptance criteria and architectural invariants. |
| 30 | build | consumer | `fable-tdd` | executing | Drive testable behavior changes and bug fixes through disciplined red-green-refactor cycles with observable regression tests. |
| 32 | build | consumer | `fable-delegate` | executing | Delegate independent subtasks to parallel workers or subagents with strict disjoint ownership, bounded scope, and explicit acceptance contracts. |
| 40 | core | consumer | `fable-execute` | executing | Implement one accepted, bounded work card with immediate local verification, invariant preservation, and zero scope drift. |
| 50 | core | consumer | `fable-verify` | verifying | Falsify software implementations and gather fresh, machine-checked acceptance proof across tests, builds, typechecks, and runtime smoke checks before completion. |
| 60 | proof | consumer | `fable-review` | verifying | Perform an independent, evidence-grounded review of git diffs against requested specifications, architectural invariants, and code standards. |
| 70 | proof | consumer | `fable-security` | verifying | Conduct threat modeling, vulnerability assessments, secret sanitization, and security reviews across trust boundaries, auth flows, and untrusted inputs. |
| 75 | proof | consumer | `fable-redteam` | verifying | Execute native agentic ethical penetration testing and automated security audits against staging or authorized targets. |
| 78 | proof | consumer | `fable-heal` | executing | Automatically synthesize, apply, and verify security remediations for vulnerabilities identified by fable-redteam. |
| 80 | delivery | consumer | `fable-release` | verifying | Audit and certify repository merge and release readiness against required quality gates, clean git working trees, and verified distribution artifacts. |
| 85 | delivery | consumer | `fable-handoff` | verifying | Compact session decisions, durable evidence, open blockers, and exact next actions into structured continuation state for cross-session resumption. |
| 95 | evolution | consumer | `fable-learning` | verifying | Analyze conversation transcripts, session logs, and agent executions to extract structured learnings, reusable patterns, post-training signals, and agent-kernel Playbooks. |
| 100 | core | consumer | `fable-recover` | recovering | Diagnose repeated command failures, stale build caches, branch drift, or contradictory evidence before attempting further code edits. |
| 110 | system | consumer | `fable-dataviz` | executing | Design and generate accessible, cohesive data visualizations, SVG charts, metric cards, and dashboard tiles with theme-adaptive styling and verified viewports. |
| 120 | system | consumer | `fable-artifact` | executing | Design and author structured technical proposals, responsive artifacts, architecture diagrams, Mermaid charts, and interactive components. |
| 130 | system | consumer | `fable-simplify` | executing | Refactor and simplify settled, recently modified code to improve readability, remove dead branches, flatten deeply nested logic, and reduce duplication while preserving behavior. |
| 140 | system | consumer | `fable-loop` | executing | Execute bounded recurring polling loops, CI build babysitting, interval-based status monitors, and self-paced test cycles with explicit timeouts and backoff. |
| 142 | proof | consumer | `fable-test` | verifying | Orchestrate, author, and verify automated tests in any application codebase, enforcing Test-Guard anti-bloat rules, test-value calculus, and tool dispatch. |
| 150 | system | consumer | `fable-run` | verifying | Launch, manage, and verify live applications across CLI binaries, web servers, TUIs, Electron apps, and background daemons with readiness probes and clean teardown. |
| 160 | system | consumer | `fable-memory` | discovering | Manage persistent file-based memory, indexing cross-session user preferences, feedback, and architectural constraints in structured MEMORY.md stores. |
| 170 | system | consumer | `fable-config` | planned | Configure and audit AI agent harness settings, permissions allowlists, environment variables, editor keybindings, and lifecycle hook integrations. |
| 180 | system | consumer | `fable-simulator` | verifying | Verify complex code changes against independent mathematical oracles, derived specifications, headless browser environments, and isolated sandbox states. |
| 190 | system | consumer | `fable-cowork` | executing | Execute autonomous multi-step cowork sessions with silent tool chaining, outcome-first progress reporting, and strict safety boundary enforcement. |
| 200 | system | consumer | `fable-spark` | idle | Predict the smallest atomic next engineering action from current workspace state, evidence gates, and mutation freshness with situational silence. |
| 220 | system | consumer | `fable-architecture` | planned | Evaluate project specifications at inception (Step One), assess Scale, Domain Decoupling, and Resource Intensity vectors, and automatically enforce a decoupled Microservices Architecture. |
| 230 | system | consumer | `fable-eco` | planned | Provision curated capabilities, manage reproducible capability locks, verify host integrations, and compile capability execution contracts. |
| 240 | system | consumer | `fable-context-thrift` | discovering | Conserve token budget by eliminating redundant reads, batching queries, and targeting lookups. |
| 250 | delivery | consumer | `fable-finish-your-turn` | executing | Autonomous task completion policy preventing premature stops, upward delegation, and unexecuted TODOs. |
| 260 | build | consumer | `fable-native-code` | executing | Codebase idiom matching and anti-bloat policy ensuring diffs read like native code. |
| 270 | delivery | consumer | `fable-outcome-first` | verifying | Response styling policy enforcing direct first-sentence answers and zero sycophancy. |
| 280 | proof | consumer | `fable-prove-it` | verifying | Evidence precedence and verification rung enforcement preventing unverified claims. |
| 285 | proof | consumer | `fable-anti-slop-engineering` | verifying | Prevent, detect, and repair AI coding slop, dirty engineering, test tampering, weak assertions, error swallowing, and contract drift across repositories. |
| 287 | proof | consumer | `fable-anti-churn` | verifying | Prevent duplicate agent actions, infinite retry loops, and unverified churn across all lifecycles. Reuses matching accepted evidence, enforces typed invalidations for changed work, gates deterministic local failures for local repair, and manages candidate promotion readiness with zero token overhead. |
| 290 | build | consumer | `fable-scope-discipline` | executing | Anti-scope-creep and atomic diff policy keeping changes strictly bounded to requests. |
| 300 | creator | consumer | `fable-domain` | discovering | Research-grounded domain adapter and workflow generator translating Fable methodology to sector nouns. |
| 310 | proof | consumer | `fable-judge` | verifying | Adversarial verification of finished work detecting weakened tests and false completion claims. |
| 320 | core | consumer | `fable-method` | executing | Step-by-step problem-solving loop classifying asks, defining done, acting surgically, and verifying by observation. |
| 330 | system | consumer | `fable-council` | planned | Convene multi-agent council across installed CLI agents to deliberate before finalizing plans. |
| 350 | system | consumer | `fable-wise` | planned | Low-level agentic design patterns and cognitive reflexes across Depth, Breadth, Coil, and Mesh. |
