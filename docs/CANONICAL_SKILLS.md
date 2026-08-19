# Canonical Skill Catalog

Generated from `skills/get-fable/registry.json` by `bun run generate:catalog`. Do not edit by hand.

| Order | Pack | Skill | Phase | Job |
| ---: | --- | --- | --- | --- |
| 0 | core | `get-fable` | idle | Entry router and global execution contract. |
| 10 | core | `fable-discover` | discovering | Gather repository, environment, documentation, and load-bearing evidence before architecture. |
| 15 | intelligence | `fable-research` | discovering | Resolve current external facts against primary sources before they influence design or implementation. |
| 20 | core | `fable-plan` | planned | Convert evidence into bounded work cards with explicit acceptance criteria. |
| 30 | build | `fable-tdd` | executing | Drive testable behavior changes through red, minimal implementation, green, and focused cleanup. |
| 32 | build | `fable-delegate` | executing | Delegate independent work only through explicit ownership, scope, and acceptance contracts. |
| 40 | core | `fable-execute` | executing | Implement one accepted card with immediate acceptance checks and no scope drift. |
| 50 | core | `fable-verify` | verifying | Try to falsify the implementation and collect concrete acceptance evidence. |
| 60 | proof | `fable-review` | verifying | Review the actual diff against the requested behavior and repository standards independently from implementation. |
| 70 | proof | `fable-security` | verifying | Route security-sensitive work to threat modeling, diff review, repository audit, or finding validation as appropriate. |
| 80 | delivery | `fable-release` | verifying | Establish merge or release readiness from required quality gates and current repository state. |
| 85 | delivery | `fable-handoff` | verifying | Compact decisions, evidence, blockers, and the exact next action into durable continuation state. |
| 90 | evolution | `fable-eval` | verifying | Evaluate changes to prompts, skills, hooks, routers, or agent controls against baselines, holdouts, and regressions. |
| 100 | core | `fable-recover` | recovering | Diagnose repeated failure, stale execution, or contradictory evidence before another edit. |
| 110 | system | `fable-dataviz` | executing | Create accessible, cohesive charts, plots, graphs, stat tiles, and data visualizations across all rendering mediums. |
| 120 | system | `fable-artifact` | executing | Design structured technical proposals, responsive artifacts, architecture diagrams, and interactive components. |
| 130 | system | `fable-simplify` | executing | Clean up code quality, simplify logic, remove dead code, and improve altitude without changing runtime behavior. |
| 140 | system | `fable-loop` | executing | Run bounded recurring task loops, interval polling, or self-paced test cycles with explicit timeouts. |
| 150 | system | `fable-run` | verifying | Launch and drive live applications (CLI, server, TUI, Electron, browser) to verify end-to-end runtime behavior. |
| 160 | system | `fable-memory` | discovering | Manage persistent file-based memory, indexing cross-session user preferences, feedback, and project constraints. |
| 170 | system | `fable-config` | planned | Configure agent harness settings, permissions allowlists, environment variables, keybindings, and hooks. |
| 180 | system | `fable-simulator` | verifying | Verify code changes with independent oracles, contract derivation, headless UI testing, and workspace safety. |
| 190 | system | `fable-cowork` | executing | Autonomous cowork execution with silent tool chaining, outcome-first reporting, and safety boundary enforcement. |
| 200 | system | `fable-spark` | idle | Situational awareness micro-policy predicting the smallest atomic next move without scope drift. |
| 210 | creator | `skill-creator` | executing | Author, refine, optimize, and evaluate autonomous skills for multi-agent ecosystems. |
