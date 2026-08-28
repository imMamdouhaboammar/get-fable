export const DEEP_REFERENCES: Record<string, Record<string, string>> = {
  'fable-artifact': {
    'artifact-composition-guide.md': `# Artifact Composition & Visual Presentation Guide

## Purpose
This guide establishes formal rules for composing technical artifacts, architectural diagrams, interactive widgets, and structured documents so that outputs are accessible, responsive, self-contained, and immediately usable.

## Core Composition Principles

### 1. Structure and Visual Hierarchy
- **Header Block**: Every artifact must open with a single clear level-1 header, a concise executive summary paragraph, and an optional metadata block.
- **Section Anchoring**: Use level-2 headers (\`##\`) for primary domains and level-3 headers (\`###\`) for subcomponents. Avoid deeply nested (>4) heading structures.
- **Progressive Chunking**: Break dense technical explanations into distinct visual surfaces: bulleted requirements, comparison tables, fenced code blocks, and visual diagrams.

### 2. Mermaid Diagram Construction
When illustrating architecture, sequence flows, or state machines with Mermaid:
- **Node Quoting**: Always quote node labels that contain punctuation, parentheses, brackets, or spaces (e.g. \`nodeA["Client Gateway (HTTPS/2)"] --> nodeB["Service Mesh"]\`).
- **Directional Clarity**: Use top-down (\`graph TD\`) for hierarchies and left-to-right (\`graph LR\`) for sequential pipelines and dataflows.
- **Subgraphs**: Encapsulate trust boundaries, deployment tiers, and microservices inside named \`subgraph\` blocks with clear boundary labels.
- **Styling Tokens**: Apply semantic class definitions with high-contrast borders and fills compatible with both light and dark themes.

\`\`\`mermaid
graph TD
    Client["Client Interface"] --> Gateway["API Gateway / Proxy"]
    subgraph CoreServices ["Core Services Boundary"]
        Gateway --> Auth["Authentication & Session State"]
        Gateway --> Worker["Task Orchestrator"]
        Worker --> DB[("State Database")]
    end
    Worker --> Queue["Event Stream / RabbitMQ"]
\`\`\`

### 3. Responsive Data Tables
- Use Markdown tables for multi-attribute comparisons, decision matrices, and risk registries.
- Align columns intentionally: left-align descriptive text, center status flags, and right-align numbers/metrics.
- Keep table cell content concise; use reference footnotes for extensive commentary.

### 4. Alert Callouts and Highlights
Use GitHub-flavored alert callouts strategically to emphasize critical engineering details:
- \`> [!NOTE]\`: Essential background context and rationale.
- \`> [!IMPORTANT]\`: Invariants, critical constraints, and mandatory preconditions.
- \`> [!WARNING]\`: Breaking changes, deprecations, and operational hazards.
- \`> [!CAUTION]\`: High-risk actions, irreversible migrations, and data safety warnings.

### 5. Document Integrity and Sanitization
- Never inline private credentials, raw environment tokens, or user-absolute local filesystem paths.
- Embed code snippets with appropriate language tags for syntax highlighting.
- Maintain mathematical precision using KaTeX notation with properly escaped literal dollar signs (\`\\$\`).
`
  },
  'fable-config': {
    'harness-configuration-rules.md': `# Harness Configuration, Permissions & Environment Rules

## Purpose
Defines the authoritative rules for configuring AI agent harness settings, permissions allowlists, environment variable isolation, editor keybindings, and lifecycle hook integrations across diverse runtime hosts.

## Precedence Hierarchy
When resolving configuration settings, adhere to the strict precedence ladder:
1. **Explicit CLI Invocation Flags**: Flags passed directly in the current command line override all file-based configurations.
2. **Project-Local State & Config**: Project settings in \`.fable/state.json\` and \`.agents/config.json\` override user-level defaults for project-scoped tasks.
3. **User-Global Agent Config**: Settings in \`~/.claude/settings.json\`, \`~/.gemini/config/\`, \`~/.codex/config.json\`, or \`~/.cursor/rules/\`.
4. **Default System Fallbacks**: Built-in fallback constants defined by get-fable.

## Permission Model & Command Allowlists

### Safe Commands (Auto-Executable)
Read-only commands and non-destructive inspection tools may be executed without interactive blocking:
- Repository discovery: \`git status\`, \`git diff\`, \`git log\`, \`fd\`, \`rg\`, \`ls\`
- Static type checking: \`tsc --noEmit\`, \`mypy\`, \`pyright\`
- Package inspections: \`bun pm ls\`, \`npm list\`, \`cargo check\`
- Health diagnostics: \`get-fable doctor --json\`, \`get-fable lint\`

### Guarded Commands (Explicit Confirmation / Hook Gated)
Mutating commands that alter disk state or environment state require explicit approval or mutation tracking:
- Code edits and writes: \`write_to_file\`, \`replace_file_content\`
- Package installs: \`bun add\`, \`npm install\`, \`cargo add\`
- Process execution: \`bun run build\`, \`bun test\`, \`pytest\`

### Prohibited Commands (Blocked by Default)
Destructive operations that risk unrecoverable data loss or host compromise:
- Recursive forced deletions: \`rm -rf /\`, \`rm -rf ~\`
- Arbitrary privilege escalation: \`sudo\`, \`chmod 777\`
- Secret printing: \`cat .env\`, \`env\`, \`printenv\` (must be masked or vault-resolved)

## Environment Variable Hygiene
- Never commit \`.env\` files or plaintext secrets to source control.
- Ensure all agent processes read sensitive credentials from secure environment vaults or masked process injections.
- Isolate runtime variables by prefixing with \`FABLE_\` or standard vendor namespaces.
`
  },
  'fable-cowork': {
    'silent-execution-discipline.md': `# Silent Execution Discipline & Autonomous Cowork

## Purpose
Establishes the behavioral invariants and operational protocol for autonomous cowork execution, eliminating conversational noise, batching tool chains, and leading with concise outcome-first reporting.

## The Principle of Conversational Silence
During autonomous background execution, chat noise degrades developer velocity and wastes token budgets. The agent operates under a strict communication discipline:
1. **Zero Conversational Chatter During Execution**: Do not output conversational filler such as "I will now edit file X", "Running tests...", or "Checking the output...".
2. **Continuous Silent Tool Chaining**: Invoke tools consecutively without intervening natural language commentary until the bounded task completes or an unrecoverable blocker is encountered.
3. **Outcome-First Delivery**: When the entire batch finishes, output a clear, structured summary starting with the completed outcome, verified evidence, and changed files.

## Autonomy Boundaries & Checkpoint Triggers

### Green Light (Proceed Silently)
- Executing planned work cards within agreed file boundaries.
- Running automated test suites, typechecks, and linters.
- Refactoring internal logic where all existing unit tests continue to pass.
- Creating temporary test fixtures and scratch files in designated directories.

### Red Light (Stop and Alert the User)
- **Unresolved Load-Bearing Decision**: The task requires choosing an external architectural dependency or altering public API contracts not in the plan.
- **Repeated Test Failure**: An attempted fix fails twice consecutively with the same error signature (\`failureStreak >= 2\`).
- **Destructive Operation**: Workspace state contains uncommitted modifications that would be overwritten by a branch switch or revert.
- **Security Trust Boundary Violation**: Uncovered hardcoded secrets, injection vectors, or unauthenticated endpoints.

## Delivery Template
Upon completing an autonomous cowork session, deliver a compact, evidence-backed summary:

\`\`\`markdown
### Outcome Delivered
[Concise 1-2 sentence statement of what was accomplished]

### Key Changes
- \`src/path/to/fileA.ts\`: Implemented bounded feature logic
- \`src/path/to/fileB.ts\`: Added unit test coverage

### Verification Evidence
- [x] Typecheck: \`tsc --noEmit\` (Passed in 2.1s)
- [x] Test Suite: \`bun test\` (14 tests passed, 0 failed)
- [x] Invariants: Zero scope drift across unaffected modules
\`\`\`
`
  },
  'fable-dataviz': {
    'dataviz-design-system.md': `# Data Visualization Design System & SVG Standards

## Purpose
Provides a complete token catalog, layout rules, color palette, and accessibility standards for rendering clean, responsive, theme-adaptive SVG charts, metric cards, and dashboard components.

## Color Palette & Semantic Tokens
Visualizations must adapt seamlessly to light and dark interfaces using clean CSS variables and semantic color tokens:

| Token Name | Hex Light | Hex Dark | Semantic Purpose |
|---|---|---|---|
| \`--fable-chart-primary\` | \`#059669\` (Emerald 600) | \`#10B981\` (Emerald 500) | Primary series, verified states, hero metrics |
| \`--fable-chart-secondary\` | \`#2563EB\` (Blue 600) | \`#3B82F6\` (Blue 500) | Secondary series, comparison baselines |
| \`--fable-chart-accent\` | \`#7C3AED\` (Violet 600) | \`#8B5CF6\` (Violet 500) | Highlighting outliers, forecast bands |
| \`--fable-chart-warning\` | \`#D97706\` (Amber 600) | \`#F59E0B\` (Amber 500) | Degraded performance, near-threshold states |
| \`--fable-chart-danger\` | \`#DC2626\` (Red 600) | \`#EF4444\` (Red 500) | Regression failures, critical security gates |
| \`--fable-chart-grid\` | \`#E5E7EB\` (Gray 200) | \`#374151\` (Gray 700) | Axis lines, grid subdividers |
| \`--fable-chart-text\` | \`#1F2937\` (Gray 800) | \`#F3F4F6\` (Gray 100) | Labels, legends, values |

## SVG Geometry & ViewBox Rules
- **Standard ViewBox**: Always define explicit \`viewBox="0 0 width height"\` (e.g. \`viewBox="0 0 800 400"\`) with \`preserveAspectRatio="xMidYMid meet"\`.
- **Responsive Sizing**: Set \`width="100%"\` and omit fixed pixel \`width\` and \`height\` attributes on the root \`<svg>\` element to permit fluid scaling.
- **Padding & Insets**: Reserve a minimum of 40px left padding for Y-axis labels and 30px bottom padding for X-axis timestamps.

## Typography & Legibility
- **Font Stack**: Use clean system sans-serif: \`font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"\`.
- **Title Size**: 16px font-weight 600.
- **Axis Label Size**: 12px font-weight 400.
- **Data Value Size**: 14px font-weight 500.

## Accessibility Standards
- Include a descriptive \`<title>\` and \`<desc>\` element inside the \`<svg>\`.
- Set \`role="img"\` and \`aria-label="[Concise chart summary]"\`.
- Never encode information solely through color hue; use dashed lines, shape markers, or direct data point labels.
`
  },
  'fable-delegate': {
    'subagent-contracts.md': `# Subagent Delegation Contracts & Workspace Boundaries

## Purpose
Defines the protocol for creating unambiguous subagent ownership contracts, workspace isolation boundaries, merge convergence rules, and acceptance criteria when delegating independent tasks to parallel workers.

## The Contract Invariant
Subagent delegation is permitted **only for genuinely disjoint work**. If two tasks mutate the same files, share mutable in-memory state, or require sequential design iterations, delegation is prohibited.

## The 4 Components of a Delegation Contract

### 1. Explicit File Ownership Boundary
Every worker receives a disjoint whitelist of files it is permitted to create or modify.
- Worker A: \`src/components/UserCard.tsx\`, \`test/components/UserCard.test.tsx\`
- Worker B: \`src/api/user-routes.ts\`, \`test/api/user-routes.test.ts\`
- **Zero Overlap Rule**: Any file not listed in the whitelist is strictly read-only for that worker.

### 2. Upstream Context & Shared Types
Provide the worker with immutable input interfaces, API schemas, and architectural invariants before launching. The worker must not redesign shared type definitions independently.

### 3. Machine-Checkable Acceptance Criterion
Each delegated contract must define an exact, executable command that determines whether the worker's deliverable is complete:
- \`bun test test/components/UserCard.test.tsx\`
- \`tsc --noEmit\`

### 4. Convergence & Integration Gate
Upon completion of all parallel subagents:
1. Validate that no worker mutated files outside its declared whitelist.
2. Run the unified repository test suite across the combined workspace.
3. Re-verify that mutation generations align and no stale assumptions remain.
`
  },
  'fable-discover': {
    'evidence-gathering-protocol.md': `# Evidence Gathering Protocol & Codebase Investigation

## Purpose
Standardized protocol for gathering concrete, verifiable evidence about unfamiliar codebases, runtime execution paths, and component boundaries without getting lost in exploratory rabbit holes.

## The 3 Truth Levels
When recording codebase observations, every fact must be explicitly tagged with its certainty level:
1. \`[measured]\`: Directly verified by reading source code, executing a command, or inspecting an active AST/schema.
2. \`[inferred]\`: Reasonably deduced from conventions, config defaults, or indirect calls, but not directly observed in runtime execution.
3. \`[unresolved]\`: An open unknown that has not yet been verified. If load-bearing, it blocks architectural decisions until resolved.

## Investigation Protocol

### Step 1: Topology & Root Inspection
Identify the foundation before reading implementation files:
- Inspect \`package.json\`, \`Cargo.toml\`, \`pyproject.toml\`, or \`go.mod\` for declared dependencies and entry points.
- Identify the build tool and test runner (\`bun\`, \`vite\`, \`jest\`, \`cargo\`, \`pytest\`).
- Check workspace configurations and multi-package layouts.

### Step 2: Entry Point & Flow Tracing
Trace execution from the observable outside boundary:
- CLI tools: Locate binary scripts in \`bin/\` or \`src/cli.ts\`.
- HTTP APIs: Locate router declarations and middleware chains.
- Background jobs: Locate queue listeners and worker loops.

### Step 3: Dynamic Dispatch & Plugin Resolution
When direct symbol references disappear:
- Check dynamic imports (\`import()\`, \`require()\`).
- Inspect plugin registers, hook tables, and reflection mechanisms.
- Look for code generation scripts and build artifacts in \`dist/\` or \`generated/\`.

### Step 4: Stop Condition
Stop discovery when all load-bearing questions needed for the next work card are answered with \`[measured]\` evidence. Do not continue exploring adjacent subsystems that are out of scope.
`
  },
  'fable-eval': {
    'eval-harness-protocol.md': `# Eval Harness Protocol, Baselines & Regression Control

## Purpose
Defines the formal protocol for evaluating agent behavior, system prompts, skills, and routing heuristics against deterministic benchmarks, holdout sets, and regression thresholds.

## The 3-Tier Evaluation Architecture

### Tier 1: Deterministic Static Linting
- Frontmatter schema validation: name format, version semver, description formula compliance.
- Structural completeness: existence of SKILL.md, references, examples, templates, and evals.
- Progressive disclosure validation: SKILL.md line count (<500 lines) and reference file sizes (>=1000 bytes).

### Tier 2: Benchmark Suite Execution
- Run candidate skills against a fixed set of realistic user prompts.
- Score triggering accuracy: ensure the skill fires on should-trigger queries and stays silent on should-not-trigger negatives.
- Measure execution latency and token consumption metrics.

### Tier 3: Blinded Holdout Verification
- Maintain a separate holdout dataset of tricky edge cases and adversarial queries.
- The optimization loop is blinded to holdout questions during prompt iteration.
- Gate approval: A candidate version is accepted only if the holdout pass rate does not regress compared to the baseline.

## Regression Thresholds & Rollback Invariants
- **Zero Holdout Regressions**: A change that fixes a train scenario but breaks an existing holdout case is rejected.
- **Deterministic Reproducibility**: All benchmark runs must record model parameters, temperature (0.0), and seed values.
- **Rollback Snapshot**: Always preserve the prior passing version snapshot before deploying an evaluated update.
`
  },
  'fable-execute': {
    'mutation-containment.md': `# Mutation Containment & Blast Radius Control

## Purpose
Rules for bounding code modifications to accepted cards, preserving surrounding module invariants, and preventing unintended scope drift during execution.

## Invariants of Bounded Execution

### 1. Single Responsibility per Edit
Implement only the specific changes defined in the accepted work card. Do not perform opportunistic refactoring or reformat unrelated files during feature execution.

### 2. Workspace Invariant Preservation
- Preserve existing public API signatures unless the card explicitly specifies a breaking change.
- Keep third-party dependencies unchanged unless dependency modification is a card requirement.
- Maintain existing linting and code style rules without re-indenting unaffected code blocks.

### 3. Immediate Local Verification
Immediately after editing a file:
1. Run static type checking on the touched module.
2. Run the specific unit test file covering that module.
3. Verify that git diff shows only intentional, minimal edits.

### 4. Mutation Generation Synchronization
Every write operation advances the workspace \`mutationGeneration\`. Any previous verification evidence recorded before the mutation becomes stale and cannot be used to close the task until re-verified.
`
  },
  'fable-handoff': {
    'continuity-schema.md': `# Continuity Schema & Durable Handoff Protocol

## Purpose
Specification for serializing session state, open blockers, evidence ledgers, and exact continuation moves into durable artifacts for flawless cross-session agent resumption.

## The Handoff Data Contract
Every handoff document must capture the complete engineering state in a structured format:

\`\`\`markdown
# Session Handoff: [Task Name]

## 1. Executive Status
- **Phase**: [idle | planned | executing | verifying | recovering | complete]
- **Active Card**: [Card ID and title, or null]
- **Mutation Generation**: [N]
- **Verified Generation**: [M]
- **Failure Streak**: [0 | N]

## 2. Completed Milestones & Evidence
- [x] Milestone 1: Implemented feature logic (\`src/feature.ts\`) -- evidence: \`bun test\` passed
- [x] Milestone 2: Verified API contract -- evidence: schema validation green

## 3. Current In-Flight Work
[Exact details of the file and function currently being edited]

## 4. Unresolved Blockers & Load-Bearing Questions
- Blocker A: [Description of external dependency or ambiguity]

## 5. Exact Next Action (Single Move)
[Unambiguous command or edit for the resuming agent to execute immediately]
\`\`\`

## Resumption Protocol
When an agent resumes from a handoff:
1. Read the handoff document and verify that workspace files match the recorded state.
2. Check \`git status\` and confirm no untracked file collisions exist.
3. Execute the single "Exact Next Action" without re-planning or asking redundant questions.
`
  },
  'fable-loop': {
    'loop-control-guidelines.md': `# Loop Control, Exponential Backoff & Circuit Breakers

## Purpose
Guidelines for implementing robust, bounded polling loops, CI monitoring, and asynchronous status tracking with exponential backoff, jitter, and hard circuit breakers.

## Core Loop Control Rules

### 1. Mandatory Bounded Timeouts
Every polling loop must declare a hard maximum duration and maximum iteration count. Infinite or unbounded loops (\`while (true)\` without timeouts) are strictly prohibited.

### 2. Exponential Backoff with Jitter
To prevent thundering herd problems and API rate limits:
- Base interval: 2 seconds.
- Backoff multiplier: 1.5x to 2.0x per iteration.
- Max interval cap: 30 seconds.
- Add +/- 10% randomized jitter to each sleep interval.

\`\`\`typescript
function calculateBackoff(iteration: number, baseMs: number = 2000, maxMs: number = 30000): number {
  const raw = Math.min(baseMs * Math.pow(1.5, iteration), maxMs);
  const jitter = raw * (0.9 + Math.random() * 0.2);
  return Math.round(jitter);
}
\`\`\`

### 3. Circuit Breaker Conditions
Terminate the loop immediately and alert the user if:
- **Terminal Failure State**: The remote job reports a fatal status (e.g. \`FAILED\`, \`CANCELLED\`, \`ERROR\`).
- **HTTP 4xx Client Error**: Authentication or resource not found error.
- **Max Consecutive Transient Errors**: 3 consecutive network timeouts or 5xx server errors.
- **Timeout Exceeded**: Elapsed wall-clock time exceeds the declared budget.
`
  },
  'fable-memory': {
    'memory-management-protocol.md': `# Memory Management Protocol & Durable Fact Lifecycle

## Purpose
Defines the file-based persistence protocol for recording, indexing, recalling, and updating cross-session user preferences, project conventions, and architectural constraints in \`MEMORY.md\`.

## The Memory Lifecycle

\`\`\`
[User Feedback / Constraint] ──> [Synthesize Fact] ──> [Validate Invariant]
                                                            │
[Purge Stale Facts] <── [Index in MEMORY.md] <── [Write Single Fact File]
\`\`\`

### 1. Capture & Synthesis
- Extract durable preferences from user corrections and explicit rules (e.g. "always use Bun first", "never use Colima").
- Formulate the fact as a clear, positive invariant statement with its original rationale.

### 2. Storage & Single Fact Files
- Save individual memory records in \`.fable/memory/facts/<fact-slug>.md\`.
- Include metadata: category (convention, preference, architecture, security), created date, and source conversation.

### 3. Central Index Synchronization
- Maintain a concise, scannable index in \`MEMORY.md\` at the project or user root.
- Keep the central index under 150 lines by linking out to detailed fact files.

### 4. Contradiction Resolution & Purging
- When a user explicitly changes a previously stored preference, locate the superseded fact file, mark it as deprecated or deleted, and update the index immediately.
`
  },
  'fable-plan': {
    'decomposition-rules.md': `# Work Card Decomposition & Dependency DAG Rules

## Purpose
Rules for breaking down broad software features and migrations into right-sized, independent work cards with explicit acceptance criteria and dependency ordering.

## Card Sizing Rules (The 1-3 File Invariant)
- **Bounded Scope**: A single work card should touch no more than 1 to 3 closely related files.
- **Single Behavioral Unit**: A card should deliver one coherent, testable capability.
- **Time/Complexity Budget**: A skilled agent should be able to implement and locally verify the card in a single execution turn.

## Anatomy of an Accepted Work Card
Every work card must contain four mandatory sections:
1. **Goal Statement**: What capability is being added or fixed.
2. **Target File Boundaries**: Explicit list of files to create, modify, or delete.
3. **Machine-Checkable Acceptance Test**: The exact command that proves the card succeeded (e.g. \`bun test test/auth/jwt.test.ts\`).
4. **Architectural Invariants**: Specific constraints that must remain true (e.g. "no breaking changes to public /v1 routes").

## Dependency Ordering & DAG Construction
- Order cards so that dependencies are resolved upstream before downstream consumers are implemented:
  1. Interfaces / Schemas / Data Types
  2. Storage / Model / Database Adapters
  3. Service Logic / Business Rules
  4. API Endpoints / CLI Commands
  5. UI Components / Public Interfaces
- Group independent cards at the same DAG depth for parallel execution via \`fable-delegate\`.
`
  },
  'fable-recover': {
    'attribution-ladder.md': `# Diagnostic Attribution Ladder & Failure Recovery

## Purpose
A 5-level diagnostic hierarchy to isolate root causes of repeated failures, distinguishing harness/environment issues from true application code bugs before editing source code.

## The 5-Level Attribution Ladder
When a command or test fails repeatedly, climb the ladder from lowest level (environment) to highest level (application logic):

\`\`\`
Level 5: Application Logic Bug ── [Falsified by isolated unit test]
Level 4: Test Harness & Assertions ── [Falsified by verifying test assumptions]
Level 3: Build, Transpilation & Caches ── [Falsified by clean rebuild]
Level 2: Workspace & Git State ── [Falsified by git status / branch check]
Level 1: Host Environment & Runtime ── [Falsified by checking tool binary & versions]
\`\`\`

### Level 1: Environment & Runtime
- Verify node/bun/python versions match expected engines.
- Check environment variables and path precedence (\`which bun\`, \`node -v\`).

### Level 2: Workspace & Branch State
- Check \`git status\` for dirty working directories, merge conflicts, or wrong active branch.
- Verify that required submodules or linked worktrees are properly initialized.

### Level 3: Build & Cache Artifacts
- Check if tests are executing stale files in \`dist/\`, \`.turbo/\`, \`.cache/\`, or \`node_modules/\`.
- Run a clean build (\`rm -rf dist && bun run build\`) before modifying code.

### Level 4: Test Harness & Fixtures
- Check if test mock fixtures reflect current API contracts.
- Check for race conditions, unhandled async promises, or shared test database pollution.

### Level 5: Application Logic Bug
- Only after Levels 1-4 are verified clean, diagnose the algorithm or code logic using \`fable-tdd\`.
`
  },
  'fable-release': {
    'release-gates.md': `# Release Gates, Artifact Verification & Publication Protocol

## Purpose
Defines the mandatory release gates, semantic versioning rules, supply chain checks, and publication verification steps required before merging to production or publishing packages.

## The 5 Mandatory Pre-Release Gates

### Gate 1: Clean Working Tree & Fresh State
- \`git status\` must report zero uncommitted changes and zero untracked files.
- Current branch must be up-to-date with upstream origin.
- Workspace state in \`.fable/state.json\` must be verified at the current mutation generation.

### Gate 2: Full Repository Test & Build Gate
- Static typecheck passes: \`bun run typecheck\`
- Full unit and integration test suite passes: \`bun test\`
- Clean production build succeeds: \`bun run build\`
- Linting and schema validation pass: \`bun ./bin/get-fable.js lint\`

### Gate 3: Semantic Versioning & Changelog
- Version in \`package.json\` and manifests must follow strict SemVer (\`MAJOR.MINOR.PATCH\`).
- \`CHANGELOG.md\` must contain release notes summarizing new features, fixes, and breaking changes.

### Gate 4: Supply Chain & Dependency Hygiene
- Zero high/critical security advisories in dependencies.
- Third-party GitHub Actions pinned to full commit SHAs.
- No exposed credentials or secret tokens in release bundles.

### Gate 5: Artifact & Package Inspection
- Inspect the packed distribution tarball (\`npm pack --dry-run\`) to confirm all required skills, assets, and binaries are present while development fixtures and sensitive files are excluded.
`
  },
  'fable-research': {
    'primary-source-hierarchy.md': `# Primary Source Hierarchy & Research Grounding

## Purpose
Establishes the evidence hierarchy and verification protocol for researching external APIs, third-party libraries, framework documentation, and deprecation schedules.

## The 4-Tier Source Hierarchy
When resolving external technical questions, prioritize sources according to their authoritative grounding:

| Tier | Source Type | Trust Level | Examples |
|---|---|---|---|
| **Tier 1** | **Authoritative Primary Source** | Highest | Official vendor documentation, open-source repository source code, formal RFCs, published API specifications. |
| **Tier 2** | **Official Release Material** | High | GitHub release tags, package changelogs, official migration guides, vendor deprecation notices. |
| **Tier 3** | **Verified Secondary Sources** | Moderate | Maintained third-party SDK documentation, package registry metadata (npm/PyPI), verified community adapters. |
| **Tier 4** | **Unverified Anecdotal Sources** | Low / Untrusted | Blog posts, community forums, outdated StackOverflow threads, hallucinated model training memory. |

## Research Protocol
1. **Extract Exact Version Target**: Identify the exact version of the library or tool in the workspace (\`package.json\` / lockfile).
2. **Consult Primary Documentation First**: Search official documentation for the matching major.minor version.
3. **Verify API Signatures in Source**: If documentation is ambiguous, inspect the published TypeScript \`.d.ts\` declarations or source repository directly.
4. **Synthesize with Source Attribution**: Cite primary URLs, version tags, and method signatures in the research deliverable.
`
  },
  'fable-review': {
    'diff-review-checklist.md': `# Behavioral Diff Review Checklist & Standards

## Purpose
A rigorous, evidence-grounded review checklist to evaluate git diffs independently from implementation, catching regressions, architectural violations, security risks, and code smells.

## Diff Review Checklist

### 1. Correctness & Behavioral Fidelity
- [ ] Diff directly satisfies the user's requested behavior without introducing unintended side effects.
- [ ] Edge cases, empty states, error conditions, and null/undefined values are handled gracefully.
- [ ] Asynchronous code correctly handles promise rejections and timeouts without swallowing errors.

### 2. Architectural Integrity & Boundaries
- [ ] No violation of package or module encapsulation boundaries.
- [ ] Code follows existing project patterns and naming conventions.
- [ ] No cyclical dependencies or leaky abstractions introduced.

### 3. Security & Data Protection
- [ ] No hardcoded secrets, API keys, passwords, or personal credentials.
- [ ] User input is sanitized and validated before execution or persistence (preventing injection/XSS).
- [ ] Authorization checks are enforced at service and API boundaries.

### 4. Test Coverage & Verifiability
- [ ] Every behavior change is backed by an automated regression test.
- [ ] Tests verify actual behavioral outcomes rather than mocking out the entire system.
- [ ] All existing tests continue to pass.

### 5. Performance & Resource Discipline
- [ ] No unindexed database queries or N+1 query patterns.
- [ ] Memory-intensive buffers, file handles, and child processes are properly closed.
- [ ] Clean algorithmic time and space complexity.
`
  },
  'fable-run': {
    'runtime-process-management.md': `# Runtime Process Management & Smoke Probes

## Purpose
Protocol for safely spawning, managing, probing, and gracefully terminating live applications (servers, CLI binaries, background processes, TUIs) during runtime verification.

## Process Lifecycle Protocol

### 1. Spawning with Dedicated Working Directory
- Always spawn processes with explicit working directory (\`cwd\`) and isolated port bindings to avoid port collisions.
- Redirect standard output and error to captured logs for inspection.

### 2. Readiness Probe Polling
Do not rely on fixed arbitrary sleeps (\`sleep 5\`). Poll for readiness deterministically:
- **HTTP Servers**: Poll health endpoints (\`GET /health\` or \`GET /\`) with exponential backoff until HTTP 200 is received.
- **CLI Tools**: Execute with \`--version\` or \`--help\` to verify successful process startup and exit code 0.
- **Background Daemons**: Monitor process PID and log file until "Ready" or "Listening" marker is observed.

### 3. Live Smoke Verification
Execute targeted HTTP requests, CLI commands, or UI interactions against the live running process to verify end-to-end functionality.

### 4. Graceful Teardown & Port Release
- Always terminate child processes at the end of the verification session.
- Send \`SIGTERM\` first, allow a 2-second grace period for clean teardown, and fallback to \`SIGKILL\` if unresponsive.
- Confirm the bound port is completely released before returning control.
`
  },
  'fable-security': {
    'secret-sanitization.md': `# Secret Sanitization & Credential Hygiene Protocol

## Purpose
Guidelines for detecting, masking, sanitizing, and preventing credential leaks across codebase files, commit history, logs, and agent artifacts.

## Credential Detection Patterns
Scan for high-entropy tokens, private keys, and vendor credential patterns:
- AWS Access Keys (\`AKIA[0-9A-Z]{16}\`)
- GitHub Personal Access Tokens (\`ghp_[0-9a-zA-Z]{36}\`, \`github_pat_*\`)
- OpenAI / Anthropic API Keys (\`sk-ant-*\`, \`sk-[0-9a-zA-Z]{48}\`)
- Stripe Secret Keys (\`sk_live_[0-9a-zA-Z]{24}\`)
- Private RSA/SSH Keys (\`-----BEGIN (RSA|OPENSSH) PRIVATE KEY-----\`)
- Database Connection Strings (\`postgres://user:pass@host:port/db\`)

## Sanitization Protocol
1. **Masking in Logs & Artifacts**: Redact detected keys immediately, displaying only the first 4 and last 4 characters (e.g. \`sk-ant-1234...abcd\`).
2. **Environment Vault Storage**: Move plaintext secrets into secure local environment vaults or \`.env.local\` (added to \`.gitignore\`).
3. **Git History Scrubbing**: If a secret was committed to git history, treat it as compromised. Advise immediate key revocation and rotation, then purge git history using \`git filter-repo\` or BFG Repo-Cleaner.
`,
    'threat-modeling-matrix.md': `# STRIDE Threat Modeling Matrix & Trust Boundaries

## Purpose
A structured threat modeling matrix based on STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) for evaluating system security boundaries.

## STRIDE Threat Matrix

| Threat Category | Definition | Potential Vulnerability | Mitigation Strategy |
|---|---|---|---|
| **Spoofing** | Impersonating a user or service | Forged JWTs, missing origin verification | Strong cryptographic signatures, OAuth 2.1 PKCE, mTLS |
| **Tampering** | Modifying data in transit or at rest | Parameter tampering, SQL injection | Input validation, parameterized queries, HMAC integrity checks |
| **Repudiation** | Denying an action took place | Missing audit logs, unsigned actions | Immutable audit logs, structured event logging, signed receipts |
| **Information Disclosure** | Exposing confidential data | Verbose stack traces, leaked secrets | Secret masking, sanitized error responses, encrypted storage |
| **Denial of Service** | Degrading system availability | Unbounded query limits, memory leaks | Rate limiting, request size limits, connection timeouts |
| **Elevation of Privilege** | Gaining unauthorized access | Broken object level auth (BOLA/IDOR) | Strict RBAC/ABAC middleware, least-privilege service roles |

## Trust Boundary Review Protocol
Identify every point where untrusted data crosses a boundary:
1. Client -> API Gateway (TLS termination, CORS, rate limits)
2. API Gateway -> Service Layer (JWT authentication, claim validation)
3. Service Layer -> Database / Queue (Parameterized queries, encrypted connections)
`
  },
  'fable-simplify': {
    'refactoring-patterns.md': `# Code Simplification Patterns & Altitude Improvement

## Purpose
A catalog of behavior-preserving refactoring patterns to flatten nested logic, eliminate redundant code, improve readability, and increase code altitude without changing functionality.

## Core Simplification Patterns

### 1. Guard Clauses & Early Returns
Replace deeply nested \`if/else\` structures with inverted early returns to keep the happy path unindented and linear.

\`\`\`typescript
// Before: Deep nesting
function processOrder(order: Order) {
  if (order) {
    if (order.isValid) {
      if (order.hasInventory) {
        return execute(order);
      } else {
        throw new Error('Out of stock');
      }
    } else {
      throw new Error('Invalid order');
    }
  }
}

// After: Clean guard clauses
function processOrder(order: Order) {
  if (!order) return;
  if (!order.isValid) throw new Error('Invalid order');
  if (!order.hasInventory) throw new Error('Out of stock');
  return execute(order);
}
\`\`\`

### 2. Method Extraction for High-Level Altitude
Extract low-level details (DOM manipulation, regex parsing, byte calculations) into dedicated helper functions with descriptive names so the main orchestrator reads like a high-level narrative.

### 3. Deduplication & Shared Abstraction
Identify copy-pasted blocks across modules, extract a unified parameter-driven helper, and update all call sites.

### 4. Removal of Dead Code & Speculative Abstractions
Delete unused functions, dead branches, commented-out code, and unreferenced type definitions.
`
  },
  'fable-simulator': {
    'oracle-derivation-guide.md': `# Independent Oracle Derivation & Simulation Boundaries

## Purpose
Guide for constructing independent verification oracles, reference models, and simulation harnesses to verify complex algorithmic logic, state machines, and data pipelines.

## Principles of Independent Oracles

### 1. Independence from Implementation
An oracle must NOT share code or assumptions with the implementation under test. If the implementation uses an optimized BitSet, the oracle should use a simple, mathematically obvious \`Set<number>\` reference model.

### 2. Differential Testing Architecture
Generate randomized inputs across edge cases and feed them simultaneously to both the production implementation and the reference oracle, asserting strict output equality.

\`\`\`typescript
test('differential verification between production and reference oracle', () => {
  for (let i = 0; i < 1000; i++) {
    const input = generateRandomTestCase(i);
    const prodResult = productionAlgorithm(input);
    const oracleResult = referenceOracle(input);
    expect(prodResult).toEqual(oracleResult);
  }
});
\`\`\`

### 3. Headless Browser Simulation
For UI and web workflows, use headless browser drivers to simulate real user interactions (clicking buttons, filling forms, observing DOM state changes) rather than shallow virtual DOM unit tests.
`
  },
  'fable-spark': {
    'silence-policy.md': `# Spark Silence Policy: Situational Silence # Fable Spark: Situational Silence & Noise Elimination Noise Elimination

## Purpose
Defines the situational silence policy for Fable Spark, establishing when the situational awareness micro-policy must remain completely silent to avoid distracting the developer or agent.

## The Silence Invariants

### 1. Default to Silence
If the workspace is in a healthy, steady state and the next action is completely obvious, Spark emits no suggestions (\`suggestion: null\`, \`silent: true\`).

### 2. When Spark Must Remain Silent
- **Task in Progress**: The agent is actively executing a known work card.
- **Passing Verification**: All tests and checks have passed and no new mutation has occurred.
- **Low Confidence (<0.70)**: The situational intent is ambiguous or insufficiently grounded in state.
- **Read-Only Inspection**: The user is simply viewing logs, help topics, or status summaries.

### 3. When Spark Speaks
Spark triggers an atomic next-move recommendation only when:
- An unverified mutation just occurred (\`mutationGeneration > verifiedGeneration\`).
- A command just failed (\`failureStreak > 0\`).
- An open card is missing an explicit acceptance test.
`
  },
  'fable-tdd': {
    'red-green-refactor.md': `# Red-Green-Refactor Discipline & Test-First Development

## Purpose
Detailed guide to the Red-Green-Refactor discipline, observing honest failure before writing code, isolating test fixtures, and preventing false-positive tests.

## The 3 Phases of TDD

### Phase 1: RED (Observe Honest Failure)
1. Write a focused test that defines the expected behavior, edge case, or bug reproduction.
2. Run the test suite and **observe it fail for the exact expected reason**.
3. If the test passes before code is changed, the test is tautological or testing the wrong assertion. Revise the test.

### Phase 2: GREEN (Minimal Implementation)
1. Write the minimal amount of code necessary to make the failing test pass.
2. Do not write speculative extra features or gold-plate the implementation.
3. Run the test suite and confirm green.

### Phase 3: REFACTOR (Clean Code with Continuous Green)
1. Improve code structure, readability, and performance while keeping all tests green.
2. Remove duplication and extract helper functions.
3. Re-run the test suite after every small refactoring step.
`
  },
  'fable-verify': {
    'falsification-heuristics.md': `# Falsification Heuristics & Boundary Testing

## Purpose
Techniques for actively attempting to falsify code implementations, probing edge cases, stress conditions, and boundary values before declaring completion.

## The Falsification Mindset
Verification is not a rubber-stamp pass; it is an active effort to break the implementation. If you cannot find a way to falsify it, you have earned confidence that it works.

## Core Falsification Heuristics
1. **Empty / Null / Undefined Inputs**: Test with empty arrays, null objects, zero numbers, and empty strings.
2. **Boundary Values**: Test at exact boundary limits ($0$, $1$, $N-1$, $N$, $N+1$, \`MAX_SAFE_INTEGER\`).
3. **Concurrency & Race Conditions**: Test with parallel rapid calls, out-of-order responses, and simulated network delays.
4. **Error & Disconnection Handling**: Test with dropped database connections, invalid JSON payloads, and filesystem permissions errors.
5. **Mutation Freshness Check**: Confirm that tests were executed **after** the latest code edit, not before.
`,
    'evidence-recording.md': `# Evidence Recording & Verification Schema

## Purpose
Specification for recording typed verification evidence in \`.fable/state.json\`, binding test outputs to mutation generations, and ensuring evidence integrity.

## The Evidence Data Schema
Every evidence entry recorded in state must conform to schema version 3:

\`\`\`json
{
  "kind": "test",
  "command": "bun test test/auth.test.ts",
  "generation": 3,
  "passed": true,
  "details": "14 tests passed, 0 failures",
  "timestamp": "2026-08-28T09:30:00.000Z"
}
\`\`\`

## Evidence Validity Rules
- **Generation Binding**: Evidence is valid only if \`evidence.generation === state.mutationGeneration\`. Any subsequent file edit increments \`mutationGeneration\`, immediately invalidating prior evidence.
- **Completion Gate**: Substantial tasks cannot transition to \`complete\` unless the newest completion-capable evidence belongs to the current mutation generation and has \`passed: true\`.
`
  },
  'get-fable': {
    'lifecycle-routing-matrix.md': `# Lifecycle Routing Matrix & Evidence Precedence

## Purpose
Comprehensive routing matrix and precedence rules governing transitions between all 25 canonical Get Fable skills.

## Master Routing Table

| Current Workspace State | Incoming User Intent | Selected Skill | Precedence Rationale |
|---|---|---|---|
| \`failureStreak >= 2\` | Any coding task | \`fable-recover\` | Stop execution churn; diagnose root cause. |
| Security / Auth risk | Security audit or diff | \`fable-security\` | Security gates override general review. |
| Unknown codebase | "How does X work?", "Explore" | \`fable-discover\` | Gather local facts before designing. |
| External API question | "Check latest docs for Y" | \`fable-research\` | Ground external facts in primary sources. |
| Multi-file feature | "Design X", "Plan architecture" | \`fable-plan\` | Decompose into bounded cards. |
| Reproducible bug / TDD | "Fix bug X", "Write test" | \`fable-tdd\` | Red-Green-Refactor discipline. |
| Independent subtasks | "Run parallel workers" | \`fable-delegate\` | Disjoint ownership and contracts. |
| Accepted work card | "Implement card X" | \`fable-execute\` | Bounded single-scope execution. |
| Code modified | "Run tests", "Check if working" | \`fable-verify\` | Falsification and fresh proof. |
| PR / Diff ready | "Review my changes" | \`fable-review\` | Independent grounded code review. |
| Release candidate | "Ship to prod", "Release tag" | \`fable-release\` | Certification and gate validation. |
| Session ending | "Pause work", "Save context" | \`fable-handoff\` | Durable state serialization. |
| Agent prompt / skill | "Benchmark skill", "Eval prompt" | \`fable-eval\` | Baseline and holdout evaluation. |
| New skill needed | "Create a skill", "Author skill" | \`skill-creator\` | 6-mode skill lifecycle. |
`
  },
  'skill-creator': {
    'eval-benchmarking.md': `# BinEval Scoring Methodology & Evaluation Benchmarking

## Purpose
Detailed specification of the BinEval evaluation method, the 5 quality dimensions, the binary question bank, the 60/40 train/held-out split, and the gated self-update loop for agent skills.

## The 5 BinEval Dimensions
Every skill artifact is evaluated across 5 core dimensions using atomic binary (1/0) questions:
1. **Discovery**: Does the description trigger accurately for target queries and reject non-target queries?
2. **Clarity**: Are the instructions unambiguous, concise, and written in imperative voice without jargon?
3. **Structure**: Does the skill adhere to progressive disclosure budgets (<500 line SKILL.md, >=1000 byte references)?
4. **Robustness**: Are failure modes, edge cases, and negative boundaries explicitly handled without leaking secrets?
5. **Completeness**: Are templates, examples, platform profiles, and evaluation suites fully populated?

## The Gated Self-Update Loop
When refining a skill:
1. **Freeze Train/Held-Out Split**: Deterministically split eval queries (60% train, 40% held-out).
2. **Train Analysis**: Identify failing questions on train scenarios only; the held-out set remains unopened.
3. **Atomic Edits**: Apply at most 3 targeted edits to SKILL.md or references.
4. **Gate Acceptance Rule**: Accept the update IF AND ONLY IF:
   - Train pass rate strictly improves.
   - Zero regressions occur on the held-out set (pass -> fail).
   - No new critical failures are introduced.
`,
    'description-formula.md': `# Canonical Skill Description Formula & Trigger Optimization

## Purpose
The definitive guide to authoring skill descriptions that achieve maximum trigger accuracy and avoid under-triggering or over-triggering across diverse LLM client architectures.

## The 4-Slot Description Formula

\`\`\`
[Slot 1: What it does]
+ [Slot 2: Use when 4-5 phrasings users actually say]
+ [Slot 3: Pushy clause: "even if they do not explicitly say '<canonical term>'"]
+ [Slot 4: Do NOT use for <explicit negative domains>]
\`\`\`

### Worked Example: GOOD Description
> Author, evaluate, refine, optimize, and package autonomous AI agent skills across multi-agent ecosystems with BinEval scoring and description tuning. Use when creating a new skill from scratch, editing an existing skill that misfires or undertriggers, authoring test suites for skills, optimizing skill descriptions, or packaging skills for distribution — even if the user does not explicitly say "skill-creator" (e.g. "create a skill", "build a new skill", "optimize skill description", "package this skill", "teach the agent to do X"). Do NOT use for general application code changes or non-skill tasks.

### Description Invariants
- Maximum length: 1024 characters.
- Zero angle brackets (\`<>\` or \`[]\` inside text).
- **No process steps**: Never include workflow steps like \`then\`, \`step 1\`, \`followed by\`, \`after that\`.
`,
    'authoring-principles.md': `# The 10 Canonical Skill Authoring Principles

## Purpose
The foundational 10 authoring principles from /skill-conductor and /skill-creator for engineering robust, self-evaluating, and token-efficient agent skills.

## The 10 Canonical Principles

1. **Pre-flight Requirement**: Every skill must define runtime preconditions and explicit stop conditions before mutating workspace files.
2. **No-Process-in-Description**: Never place execution workflow steps inside the frontmatter description. The description's sole job is discovery.
3. **Map of Content (MOC)**: \`SKILL.md\` is a compact navigation map (<500 lines) pointing to modular \`references/\`, not a giant text dump.
4. **Fresh-Practitioner Perspective**: Write instructions assuming the executing agent is competent in general programming but completely new to this specific domain procedure.
5. **TWI Methodology (Step + Key Point + Why)**: Structure non-trivial steps with the action verb, the critical nuance to watch for, and the operational reason why it matters.
6. **The Blind-Agent Test**: An agent reading only the skill package must be able to execute the workflow successfully without access to hidden external chat context.
7. **Inline Risk Checklists**: Place checklists directly at high-risk decision points, rather than clustering them in a detached summary section at the end.
8. **One Term per Concept**: Choose a single canonical term (e.g. "template", "card", "gate") and use it consistently throughout all documents.
9. **Zero Inlined Credentials**: Never include real API keys, passwords, private tokens, or user-absolute paths in skill files.
10. **Match the Form to the Failure**: When fixing an agent failure, calibrate freedom: use deterministic scripts for fragile steps, pseudocode for guided workflows, and prose for open-ended design.
`
  }
};
