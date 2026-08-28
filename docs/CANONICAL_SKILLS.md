# Canonical Skill Catalog

Generated from `skills/get-fable/registry.json` by `bun run generate:catalog`. Do not edit by hand.

| Order | Pack | Skill | Phase | Job |
| ---: | --- | --- | --- | --- |
| 0 | core | `get-fable` | idle | Orchestrate software engineering workflows across the canonical get-fable coding lifecycle with deterministic routing and evidence precedence. |
| 10 | core | `fable-discover` | discovering | Gather the smallest set of repository, environment, documentation, and runtime evidence needed before planning or changing code. |
| 15 | intelligence | `fable-research` | discovering | Resolve current external facts, official documentation, library behaviors, and API contracts against primary sources before implementation. |
| 20 | core | `fable-plan` | planned | Convert discovery evidence into bounded, testable work cards with explicit acceptance criteria and architectural invariants. |
| 30 | build | `fable-tdd` | executing | Drive testable behavior changes and bug fixes through disciplined red-green-refactor cycles with observable regression tests. |
| 32 | build | `fable-delegate` | executing | Delegate independent subtasks to parallel workers or subagents with strict disjoint ownership, bounded scope, and explicit acceptance contracts. |
| 40 | core | `fable-execute` | executing | Implement one accepted, bounded work card with immediate local verification, invariant preservation, and zero scope drift. |
| 50 | core | `fable-verify` | verifying | Falsify software implementations and gather fresh, machine-checked acceptance proof across tests, builds, typechecks, and runtime smoke checks before completion. |
| 60 | proof | `fable-review` | verifying | Perform an independent, evidence-grounded review of git diffs against requested specifications, architectural invariants, and code standards. |
| 70 | proof | `fable-security` | verifying | Conduct threat modeling, vulnerability assessments, secret sanitization, and security reviews across trust boundaries, auth flows, and untrusted inputs. |
| 80 | delivery | `fable-release` | verifying | Audit and certify repository merge and release readiness against required quality gates, clean git working trees, and verified distribution artifacts. |
| 85 | delivery | `fable-handoff` | verifying | Compact session decisions, durable evidence, open blockers, and exact next actions into structured continuation state for cross-session resumption. |
| 90 | evolution | `fable-eval` | verifying | Evaluate changes to agent prompts, skills, routing policies, and harnesses against reproducible baselines, held-out suites, and regression benchmarks. |
| 100 | core | `fable-recover` | recovering | Diagnose repeated command failures, stale build caches, branch drift, or contradictory evidence before attempting further code edits. |
| 110 | system | `fable-dataviz` | executing | Design and generate accessible, cohesive data visualizations, SVG charts, metric cards, and dashboard tiles with theme-adaptive styling and verified viewports. |
| 120 | system | `fable-artifact` | executing | Design and author structured technical proposals, responsive artifacts, architecture diagrams, Mermaid charts, and interactive components. |
| 130 | system | `fable-simplify` | executing | Refactor and simplify settled, recently modified code to improve readability, remove dead branches, flatten deeply nested logic, and reduce duplication while preserving behavior. |
| 140 | system | `fable-loop` | executing | Execute bounded recurring polling loops, CI build babysitting, interval-based status monitors, and self-paced test cycles with explicit timeouts and backoff. |
| 150 | system | `fable-run` | verifying | Launch, manage, and verify live applications across CLI binaries, web servers, TUIs, Electron apps, and background daemons with readiness probes and clean teardown. |
| 160 | system | `fable-memory` | discovering | Manage persistent file-based memory, indexing cross-session user preferences, feedback, and architectural constraints in structured MEMORY.md stores. |
| 170 | system | `fable-config` | planned | Configure and audit AI agent harness settings, permissions allowlists, environment variables, editor keybindings, and lifecycle hook integrations. |
| 180 | system | `fable-simulator` | verifying | Verify complex code changes against independent mathematical oracles, derived specifications, headless browser environments, and isolated sandbox states. |
| 190 | system | `fable-cowork` | executing | Execute autonomous multi-step cowork sessions with silent tool chaining, outcome-first progress reporting, and strict safety boundary enforcement. |
| 200 | system | `fable-spark` | idle | Predict the smallest atomic next engineering action from current workspace state, evidence gates, and mutation freshness with situational silence. |
| 210 | creator | `fable-skill-creator` | executing | Author, evaluate, refine, optimize, and package autonomous AI agent skills across multi-agent ecosystems with BinEval scoring and description tuning. |
