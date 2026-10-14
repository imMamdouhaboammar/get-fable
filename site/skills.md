# get-fable 42 Canonical Skills Catalog

> The canonical skill registry is deterministic and authoritative. Each skill enforces explicit phase contracts, mutation tracking, and verification gates.

## Total Skills: 42 across 8 Packs

### Core Pack (7 Skills)
Essential lifecycle navigation, planning, bounded execution, and error recovery.

- **[get-fable](./skills/get-fable.md)** (`idle`): Orchestrate software engineering workflows across the canonical get-fable coding lifecycle with deterministic routing and evidence precedence. (Intents: `route`, `resume`, `orchestrate`)
- **[fable-discover](./skills/fable-discover.md)** (`discovering`): Gather the smallest set of repository, environment, documentation, and runtime evidence needed before planning or changing code. (Intents: `inspect-repository`, `trace-behavior`, `resolve-unknowns`)
- **[fable-plan](./skills/fable-plan.md)** (`planned`): Convert discovery evidence into bounded, testable work cards with explicit acceptance criteria and architectural invariants. (Intents: `architecture`, `migration`, `decomposition`)
- **[fable-execute](./skills/fable-execute.md)** (`executing`): Implement one accepted, bounded work card with immediate local verification, invariant preservation, and zero scope drift. (Intents: `implement-card`, `bounded-change`, `small-feature`)
- **[fable-verify](./skills/fable-verify.md)** (`verifying`): Falsify software implementations and gather fresh, machine-checked acceptance proof across tests, builds, typechecks, and runtime smoke checks before completion. (Intents: `run-tests`, `typecheck`, `falsify-behavior`, `validate-acceptance`)
- **[fable-recover](./skills/fable-recover.md)** (`recovering`): Diagnose repeated command failures, stale build caches, branch drift, or contradictory evidence before attempting further code edits. (Intents: `debug-failure`, `stale-execution`, `contradictory-evidence`)
- **[fable-method](./skills/fable-method.md)** (`executing`): Step-by-step problem-solving loop classifying asks, defining done, acting surgically, and verifying by observation. (Intents: `execute-method-loop`, `classify-ask`, `define-done`)

### Intelligence Pack (1 Skills)
Primary source research, external fact verification, and grounding.

- **[fable-research](./skills/fable-research.md)** (`discovering`): Resolve current external facts, official documentation, library behaviors, and API contracts against primary sources before implementation. (Intents: `external-research`, `current-docs`, `api-behavior`)

### Build Pack (4 Skills)
Test-driven development, safe delegation, native code matching, and scope discipline.

- **[fable-tdd](./skills/fable-tdd.md)** (`executing`): Drive testable behavior changes and bug fixes through disciplined red-green-refactor cycles with observable regression tests. (Intents: `feature`, `bug-fix`, `behavior-change`)
- **[fable-delegate](./skills/fable-delegate.md)** (`executing`): Delegate independent subtasks to parallel workers or subagents with strict disjoint ownership, bounded scope, and explicit acceptance contracts. (Intents: `parallel-work`, `subagents`, `delegation`)
- **[fable-native-code](./skills/fable-native-code.md)** (`executing`): Codebase idiom matching and anti-bloat policy ensuring diffs read like native code. (Intents: `write-native-code`, `strip-bloat`, `match-idiom`)
- **[fable-scope-discipline](./skills/fable-scope-discipline.md)** (`executing`): Anti-scope-creep and atomic diff policy keeping changes strictly bounded to requests. (Intents: `bound-scope`, `prevent-drift`, `surgical-diff`)

### Proof Pack (6 Skills)
Adversarial review, penetration testing, automated healing, and evidence precedence.

- **[fable-review](./skills/fable-review.md)** (`verifying`): Perform an independent, evidence-grounded review of git diffs against requested specifications, architectural invariants, and code standards. (Intents: `code-review`, `diff-audit`, `standards-check`)
- **[fable-security](./skills/fable-security.md)** (`verifying`): Conduct threat modeling, vulnerability assessments, secret sanitization, and security reviews across trust boundaries, auth flows, and untrusted inputs. (Intents: `security-review`, `threat-model`, `audit-auth`, `validate-finding`)
- **[fable-redteam](./skills/fable-redteam.md)** (`verifying`): Execute native agentic ethical penetration testing and automated security audits against staging or authorized targets. (Intents: `redteam`, `pentest`, `security-audit`, `vulnerability-discovery`)
- **[fable-heal](./skills/fable-heal.md)** (`executing`): Automatically synthesize, apply, and verify security remediations for vulnerabilities identified by fable-redteam. (Intents: `heal`, `security-fix`, `remediate-vulnerability`, `patch-security`)
- **[fable-prove-it](./skills/fable-prove-it.md)** (`verifying`): Evidence precedence and verification rung enforcement preventing unverified claims. (Intents: `prove-claims`, `verify-rung`, `check-evidence`)
- **[fable-judge](./skills/fable-judge.md)** (`verifying`): Adversarial verification of finished work detecting weakened tests and false completion claims. (Intents: `judge-work`, `hunt-frauds`, `verify-diff`)

### Delivery Pack (5 Skills)
Release certification, handoff management, autonomous completion, and maintainer care.

- **[fable-release](./skills/fable-release.md)** (`verifying`): Audit and certify repository merge and release readiness against required quality gates, clean git working trees, and verified distribution artifacts. (Intents: `release`, `merge`, `publish`)
- **[fable-handoff](./skills/fable-handoff.md)** (`verifying`): Compact session decisions, durable evidence, open blockers, and exact next actions into structured continuation state for cross-session resumption. (Intents: `handoff`, `resume-later`, `continue-session`)
- **[fable-finish-your-turn](./skills/fable-finish-your-turn.md)** (`executing`): Autonomous task completion policy preventing premature stops, upward delegation, and unexecuted TODOs. (Intents: `finish-turn`, `complete-task`, `diagnose-error`)
- **[fable-outcome-first](./skills/fable-outcome-first.md)** (`verifying`): Response styling policy enforcing direct first-sentence answers and zero sycophancy. (Intents: `report-outcome`, `deliver-answer`, `strip-sycophancy`)
- **[fable-tend](./skills/fable-tend.md)** (`executing`): Autonomous dutiful junior maintainer for repository CI repair, PR conflict resolution, and triage. (Intents: `triage-ci`, `fix-ci`, `resolve-conflicts`, `maintain-repo`)

### Evolution Pack (2 Skills)
Agent-behavior evaluation and durable project engineering knowledge capture.

- **[fable-eval](./skills/fable-eval.md)** (`verifying`): Evaluate changes to agent prompts, skills, routing policies, and harnesses against reproducible baselines, held-out suites, and regression benchmarks. (Intents: `agent-eval`, `self-improvement`, `prompt-change`)
- **[fable-learning](./skills/fable-learning.md)** (`verifying`): Analyze conversation transcripts, session logs, and agent executions to extract structured learnings, reusable patterns, post-training signals, and agent-kernel Playbooks. (Intents: `extract-learnings`, `convo-learn`, `synthesize-knowledge`, `playbook-generation`)

### System Pack (15 Skills)
Low-level cognitive reflexes, architecture enforcement, memory, and orchestration.

- **[fable-dataviz](./skills/fable-dataviz.md)** (`executing`): Design and generate accessible, cohesive data visualizations, SVG charts, metric cards, and dashboard tiles with theme-adaptive styling and verified viewports. (Intents: `dataviz`, `create-chart`, `visualize-data`, `dashboard-metrics`)
- **[fable-artifact](./skills/fable-artifact.md)** (`executing`): Design and author structured technical proposals, responsive artifacts, architecture diagrams, Mermaid charts, and interactive components. (Intents: `create-artifact`, `diagram-architecture`, `interactive-component`)
- **[fable-simplify](./skills/fable-simplify.md)** (`executing`): Refactor and simplify settled, recently modified code to improve readability, remove dead branches, flatten deeply nested logic, and reduce duplication while preserving behavior. (Intents: `simplify-code`, `remove-duplication`, `clean-architecture`)
- **[fable-loop](./skills/fable-loop.md)** (`executing`): Execute bounded recurring polling loops, CI build babysitting, interval-based status monitors, and self-paced test cycles with explicit timeouts and backoff. (Intents: `recurring-loop`, `poll-status`, `babysit-ci`)
- **[fable-run](./skills/fable-run.md)** (`verifying`): Launch, manage, and verify live applications across CLI binaries, web servers, TUIs, Electron apps, and background daemons with readiness probes and clean teardown. (Intents: `run-app`, `live-smoke-test`, `start-server`)
- **[fable-memory](./skills/fable-memory.md)** (`discovering`): Manage persistent file-based memory, indexing cross-session user preferences, feedback, and architectural constraints in structured MEMORY.md stores. (Intents: `record-memory`, `recall-facts`, `index-memory`)
- **[fable-config](./skills/fable-config.md)** (`planned`): Configure and audit AI agent harness settings, permissions allowlists, environment variables, editor keybindings, and lifecycle hook integrations. (Intents: `update-config`, `manage-permissions`, `configure-hooks`)
- **[fable-simulator](./skills/fable-simulator.md)** (`verifying`): Verify complex code changes against independent mathematical oracles, derived specifications, headless browser environments, and isolated sandbox states. (Intents: `simulator-verify`, `derive-contract`, `headless-browser-test`)
- **[fable-cowork](./skills/fable-cowork.md)** (`executing`): Execute autonomous multi-step cowork sessions with silent tool chaining, outcome-first progress reporting, and strict safety boundary enforcement. (Intents: `cowork-mode`, `autonomous-execution`, `clean-tool-chain`)
- **[fable-spark](./skills/fable-spark.md)** (`idle`): Predict the smallest atomic next engineering action from current workspace state, evidence gates, and mutation freshness with situational silence. (Intents: `predict-next-move`, `situational-awareness`, `minimal-action`)
- **[fable-architecture](./skills/fable-architecture.md)** (`planned`): Evaluate project specifications at inception (Step One), assess Scale, Domain Decoupling, and Resource Intensity vectors, and automatically enforce a decoupled Microservices Architecture. (Intents: `evaluate-architecture`, `enforce-microservices`, `assign-tech-stack`, `scaffold-distributed-system`)
- **[fable-eco](./skills/fable-eco.md)** (`planned`): Provision curated capabilities, manage reproducible capability locks, verify host integrations, and compile capability execution contracts. (Intents: `discover-environment`, `plan-capabilities`, `install-capabilities`, `update-capabilities`, `repair-capabilities`, `explain-run`)
- **[fable-context-thrift](./skills/fable-context-thrift.md)** (`discovering`): Conserve token budget by eliminating redundant reads, batching queries, and targeting lookups. (Intents: `conserve-context`, `budget-tokens`, `batch-reads`)
- **[fable-council](./skills/fable-council.md)** (`planned`): Convene multi-agent council across installed CLI agents to deliberate before finalizing plans. (Intents: `convene-council`, `deliberate-plan`, `gather-peer-feedback`)
- **[fable-wise](./skills/fable-wise.md)** (`planned`): Low-level agentic design patterns and cognitive reflexes across Depth, Breadth, Coil, and Mesh. (Intents: `apply-wise-pattern`, `rewrite-v0`, `consolidate-ssot`, `strip-slop`)

### Creator Pack (2 Skills)
Deep Playbook V2 skill creation and domain adaptation.

- **[fable-skill-creator](./skills/fable-skill-creator.md)** (`executing`): Author, evaluate, refine, optimize, and package autonomous AI agent skills across multi-agent ecosystems with BinEval scoring and description tuning. (Intents: `create-skill`, `modify-skill`, `benchmark-skill`, `optimize-skill`)
- **[fable-domain](./skills/fable-domain.md)** (`discovering`): Research-grounded domain adapter and workflow generator translating Fable methodology to sector nouns. (Intents: `generate-domain-adapter`, `build-domain-workflow`, `create-trap-fixture`)

