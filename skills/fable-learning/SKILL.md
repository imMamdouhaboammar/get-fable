---
name: fable-learning
description: "Convert sessions and trajectories into durable project engineering knowledge and failure lessons under Failure-lessons/, agent-kernel, and gbrain. Use when extracting session learnings, synthesizing knowledge from conversations, capturing root causes, documenting failure lessons, or recording durable engineering invariants — even if the user does not explicitly say \"fable-learning\" (e.g. \"what did we learn\", \"convo-learn\", \"failure lessons\", \"extract learnings\", \"save what we learned\", \"rules we now enforce\"). Do NOT use for general code review or diff audits (use fable-review)."
version: 1.9.2
pack: evolution
inputs:
  - session_transcript
requires:
  - substantive_conversation
produces:
  - learning_evidence
  - extracted_patterns
  - failure_lessons
  - playbook_candidate
gates:
  - evidence_grounded
  - atomic_claims
fallback: fable-eval
mutatesWorkspace: true
parallelSafe: true
neural_links:
  precursors:
    - fable-handoff
    - fable-eval
    - fable-verify
  continuations:
    - fable-eval
    - fable-plan
    - fable-skill-creator
    - get-fable
  lateral_peers:
    - fable-memory
  recovery: fable-recover
---

# Fable Learning — Failure Lessons & Knowledge Synthesis Engine

Turn any engineering conversation, agent trajectory, or session realities into durable, reusable project knowledge saved in **`Failure-lessons/`**, **`agent-kernel` rules**, **`gbrain` chunks**, **compound solution docs** (`docs/solutions/`), and portable **Playbooks**.

$$\text{Session Realities} \xrightarrow{\text{Reality Mining}} \text{Failures, Fixes, Invariants, Tests} \xrightarrow{\text{Distillation \& Rigor}} \text{Failure-lessons/ + agent-kernel + gbrain} \xrightarrow{\text{Evolution}} \text{Playbooks \& Skills}$$

---

## Mission

### Mission Statement: Convert This Session Into Durable Project Learnings

This session contains engineering knowledge that should not disappear when the conversation ends.

Your task is to extract the reusable lessons from the work completed and persist them as durable project knowledge.

> **Do not produce a simple session summary.**  
> **Do not merely list what changed.**  
> **Convert failures, discoveries, corrections, architectural decisions, debugging insights, testing strategies, and implementation mistakes into reusable engineering lessons that future contributors and coding agents can act on.**

The core objective is:

> **Pay for an engineering mistake once.**  
> **After that, the project should remember it.**

---

## Activate When

- Extracting takeaways, verified fixes, or patterns from a completed or in-progress session.
- User invokes `/learn`, `learn`, `convo-learn`, `fable-learning`, "what did we learn?", "extract learnings", "save what we learned", or "convert session into durable learnings".
- Resolving a non-trivial bug, test regression, or configuration obstacle and establishing a reusable prevention invariant.
- Creating or updating the repository's `Failure-lessons/` knowledge base.
- Capturing user corrections, confirmations, or escalations as post-training signals.
- Synthesizing 3+ related problem-solution pairs into an `agent-kernel` Playbook.
- Compiling conversation takeaways into a new portable Skill package via `fable-skill-creator`.
- Running headless at session completion (`Stop` / `SessionEnd` hook events) to record learning chunks.

---

## Do Not Activate When

- Reviewing code diffs or pull requests without transcript analysis (`fable-review`).
- Verifying whether an application feature or bugfix works against tests (`fable-verify`).
- Storing user preferences or static environment facts into memory (`fable-memory`).
- Running quantitative benchmarks or comparing prompt models (`fable-eval`).

---

## Situation Classification

| Invocation Pattern | Mode | Primary Target Storage | Action & Depth | Output Artifact |
|---|---|---|---|---|
| User asks for failure lessons, postmortem, or root cause codification | `FAILURE_LESSONS` | `Failure-lessons/` + `agent-kernel` + `gbrain` | Full 22-step failure extraction & regression linking | `Failure-lessons/*.md` + Report |
| Explicit session ID or transcript file | `ANALYZE` | `Failure-lessons/` + `agent-kernel` + `gbrain` | Full 4-category extraction & synthesis | Structured markdown report |
| Short session or `--depth lightweight` | `QUICK` | `agent-kernel` + `gbrain` | Top 5 atomic $L3+$ rules | Terminal output |
| Resolved non-trivial bug or harness issue | `COMPOUND` | `docs/solutions/` + `CONCEPTS.md` | Single atomic problem-solution doc | `docs/solutions/YYYY-MM-DD-<slug>.md` |
| "make a skill from this" or `--compile` | `COMPILE` | `skills/<name>/` | Full extraction + author `SKILL.md` via `fable-skill-creator` | Skill package |
| "what did we learn?" or `--recall` | `RECALL` | Terminal output / summary | Query `gbrain` and `agent-kernel` to synthesize | Interactive digest |
| Post-session hook (`Stop` / `SessionEnd`) | `HEADLESS` | `agent-kernel` + `gbrain` | Automated background extraction with fail-soft safety | `Documentation complete` / `skipped` |

---

## Protocol

### The 22-Step Failure-Lessons Extraction Protocol

### 1. Use the Learning Tools Available to You
Inspect what tools are actually available in the host environment:
- `/learn`, `learn`
- `gsd:extract-learnings`
- `/convo-learn`, `/fable-learning`
- `agent-kernel remember`
- `gbrain remember`

Rules:
- Inspect what is actually available; do not pretend an unavailable command was executed.
- Use equivalent available tooling when appropriate.
- The repository documentation (`Failure-lessons/`) remains the durable source of truth even when agent-memory tools are unavailable.

### 2. Review the Entire Relevant Session
Before writing anything, reconstruct what actually happened. Review the conversation, implementation history, diffs, tests, tool output, review feedback, and current repository state.
Look for more than the final successful result. Extract knowledge from:
- bugs encountered and incorrect assumptions
- failed approaches and debugging discoveries
- root causes and architectural weaknesses
- implementation fixes and regressions
- edge cases and test failures
- reviewer findings and tooling limitations
- API-contract problems and performance issues
- data problems and security issues
- operational issues and backwards-compatibility problems
- decisions that were revised or places where completion was claimed too early
- things that worked particularly well and should become standard practice

> **Do not sanitize the history.** A failed approach often contains a more valuable lesson than the final fix.

### 3. Separate Facts From Hypotheses
For every important finding distinguish between:
- `Confirmed root cause`: Proven by code, log traces, or reproducible tests.
- `Strongly indicated cause`: Highly probable, supported by strong correlation, but mechanism not 100% isolated.
- `Open hypothesis`: Plausible explanation requiring further validation.
- `Unknown`: Observable symptom documented honestly, cause not yet determined.

> **Never convert speculation into historical fact.**

### 4. Create or Update the Project Failure-Lessons Knowledge Base
Use the directory:
```text
Failure-lessons/
├── README.md                     # Knowledge base principles, triggers, and maintenance rules
├── lessons-index.md              # Compact registry table and "Rules We Now Enforce"
├── testing-and-verification.md   # Regression test mappings, oracle proofs, and test strategies
└── <topic-specific-lessons>.md   # Lessons grouped by failure domain (e.g. state-management.md)
```
If `Failure-lessons/` does not exist, create it. If the repository already has an equivalent established location, preserve the existing convention unless explicitly instructed otherwise. Do not create a competing knowledge system unnecessarily.

Topic document examples:
`authentication.md`, `state-management.md`, `database-integrity.md`, `api-contracts.md`, `background-jobs.md`, `caching.md`, `artifact-lifecycle.md`, `performance.md`, `frontend-state.md`, `deployment.md`, `testing.md`, `security.md`, `data-quality.md`, `model-lineage.md`, `observability.md`.
*Do not create empty files simply to match a template.*

### 5. Organize by Failure Class, Not Ticket Number
Avoid documentation organized by ticket numbers or ephemeral references:
- ❌ `Bug #143`, `Bug #188`, `Issue from Tuesday`, `Problem we fixed in PR #92`

Prefer stable, descriptive failure classes:
- ✅ `Non-atomic resource publication`
- ✅ `Validation logic duplicated across entry points`
- ✅ `Background jobs without terminal-state guarantees`
- ✅ `Client and server disagreeing about API semantics`
- ✅ `Regression tests that never reproduced the original failure`

### 6. Use the Canonical Failure-Lesson Schema
Every meaningful lesson follows this 14-section schema:
```markdown
## [Failure / lesson name]

### Context
Where this class of problem appeared.

### What happened
Short factual description.

### Observable symptom
What engineers or users actually saw.

### Impact
Why the failure mattered.

### Incorrect assumption
What the system or implementation implicitly assumed that turned out to be wrong.

### Root cause
State one of: Confirmed | Strongly indicated | Unresolved. Then explain the evidence.

### Why the architecture allowed it
Explain the deeper system condition that made the failure possible.

### Fix
Describe the implemented solution at the appropriate abstraction level. Avoid documenting only a one-line patch if the meaningful fix was architectural.

### Verification
Document how the fix was proven. Reference real tests, commands, fixtures, or reproducible experiments.

### Prevention rule
Write the invariant future implementations should preserve.

### Reusable lesson
Explain where else this lesson applies.

### Related code
Reference stable modules, symbols, or paths where useful.

### Related tests
Reference relevant regression or integration tests.

### Related lessons
Cross-link other entries when applicable.

### Status
One of: Resolved | Partially mitigated | Unresolved | Superseded.
```

### 7. Extract the Lesson Behind the Bug
Do not stop at superficial summaries (*"We forgot to validate X"*).
Ask:
- *Why could validation be forgotten?*
- *Was the same invariant implemented independently across entry points?*
- *Was the contract unclear or failure mode hidden?*
- *Was the test too narrow or state duplicated?*

Transform:
> *"Endpoint B forgot the tenant validation."*
Into:
> *"Domain invariants implemented independently across entry points will drift. Route all entry points through one canonical validation service."*

### 8. Capture Successful Patterns Too
Record practices that clearly prevented or exposed failures:
- Deterministic fixtures
- Property tests and fuzzing
- Contract and schema enforcement
- State-machine modeling with terminal-state guarantees
- Explicit capability registries
- Fault injection and chaos testing
- Red-green regression verification

### 9. Capture Mistakes Made During the Fix
Review whether the implementation process itself contained mistakes:
- Fixing the symptom instead of the shared cause
- Creating another duplicate abstraction
- Writing a test that could never fail
- Over-mocking an integration boundary
- Trusting stale test output or claiming completion without evidence
- Changing an API without checking consumers
- Weakening tests to make them pass

### 10. Maintain `Failure-lessons/README.md`
The README explains the purpose of the directory and captures this principle:
> *This directory records engineering failures by reusable failure class, including what happened, why it happened, how it was fixed, how the fix was verified, and which invariant now prevents recurrence.*

State when entries should be updated: recurrence, deeper root cause discovered, architecture changes, stronger verification added, previous fix proven incomplete, or consolidation of shared causes.

### 11. Maintain a Lessons Index (`Failure-lessons/lessons-index.md`)
Maintain a compact table:
| Lesson | Failure Class | Prevention Rule | System | Status | Document |
|---|---|---|---|---|---|

### 12. Maintain "Rules We Now Enforce"
Add a compact section in `lessons-index.md` containing the strongest invariants learned from the project (e.g. single source of invariant truth, completion implies resource readiness, terminal-state guarantees, caller mistakes must not be internal server faults).

### 13. Connect Lessons to Real Code
Confirm symbols and paths exist in the current repository. Use stable references (`src/jobs/state_machine.ts`, `ModelRegistry.resolve(...)`). Do not invent planned components that were never implemented.

### 14. Connect Lessons to Tests
Every resolved high-impact failure must map to regression coverage:
$$\text{Failure} \longrightarrow \text{Regression Test} \longrightarrow \text{Protected Invariant}$$
If a fix has no meaningful regression test, flag it as an unresolved learning item.

### 15. Verify Regression Tests Are Real (The 3-Step Falsifiability Test)
A strong regression test must fail when the defect is present:
1. `fixed implementation` $\to$ test passes
2. `broken/reverted defect` $\to$ test fails
3. `restored implementation` $\to$ test passes

If a test still passes after the fix is removed, it does not protect what it claims to protect.

### 16. Capture Testing Patterns Worth Reusing
Document what failure classes were exposed by specific testing techniques (deterministic fixtures, property tests, contract tests, fault injection), when to use them, and when they offer false confidence.

### 17. Deduplicate Existing Knowledge
Search `Failure-lessons/`, `docs/`, ADRs, and agent memory before adding new lessons. If the lesson already exists, update or consolidate it. Cross-link shared root causes.

### 18. Preserve History Without Preserving Noise
Store distilled engineering knowledge. Do not preserve giant raw logs, temporary IDs, credentials, secrets, access tokens, or raw conversation dumps.

### 19. Update Agent Learning Systems
Synchronize distilled invariants into agent learning and memory systems:
- `agent-kernel remember "<prevention invariant>" --type rule --level critical`
- `gbrain remember "<failure class>: <invariant>" --provenance "session:<id>" --entity "failure-lessons/<domain>"`

### 20. Review the Result Like Code
Inspect the documentation diff (`git diff -- Failure-lessons`). Verify:
- No unsupported claims or inverted root causes.
- No invented implementation names or stale references.
- All entries have status labels and prevention rules.
- Verification evidence is documented.
- No accidental secrets or private local paths.

### 21. Commit Separately
Do not hide learning documentation inside an unrelated implementation commit. Prefer:
```text
docs: capture engineering failure lessons
```

### 22. Deliver Concise Final Report
Emit a final summary structured with the 8 required sections:
1. **Learning tools used**
2. **Files created**
3. **Files updated**
4. **Core lessons extracted**
5. **Rules we now enforce**
6. **Failure-to-test mappings**
7. **Unresolved knowledge**
8. **Repository changes**

---

## Decision Rules

- **Empirical Grounding Over Speculation**: Never persist an unverified hypothesis as an invariant. Only persist solutions backed by verified evidence.
- **Systemic Root Causes Over Local Patches**: Always investigate why the system architecture allowed the defect before finalizing the prevention rule.
- **Atomicity in Rules**: Rules pushed to `agent-kernel` and `gbrain` must contain one condition and one action.
- **Sanitization Invariant**: Strip API keys, tokens, session IDs, private local paths, and PII before persistence.
- **Fail-Soft Runtime**: Hooks and scripts must fail open without blocking terminal workflows or exits.

---

## Invariants

- Every persisted learning chunk is grounded in transcript or artifact evidence.
- Root causes must be honestly separated into Confirmed, Strongly indicated, Open hypothesis, or Unknown.
- Knowledge is organized strictly by reusable failure class, never ticket numbers or ephemeral references.
- All high-impact failure lessons connect to reproducible regression tests (`failure -> regression test -> invariant being protected`).
- No confidential credentials, session tokens, or private PII are written to storage.

---

## Failure Taxonomy

### Unverified Fixes
The conversation contains attempted solutions that failed or were abandoned. Discard abandoned attempts; record only the final verified resolution.

### Superficial Diagnoses
Documenting a one-line patch without understanding why the system architecture permitted the failure. Enforce the 14-section schema to capture the underlying systemic condition.

### Non-Falsifiable Regression Tests
Regression tests that continue to pass even when the defect is reintroduced. Require 3-step falsifiability verification before certifying coverage.

### Secret Exposure Risk
Transcript contains sensitive environment variables or keys. Sanitize through regex redaction before passing to storage commands.

### Rule Drift / Obsolescence
A previously learned rule is invalidated by a new library version or runtime refactor. Quarantine the old rule, verify the new baseline, and supersede it in `Failure-lessons/lessons-index.md`.

---

## Anti-Patterns

- Archiving entire conversation transcripts verbatim without distillation.
- Documenting failures by Jira/GitHub issue numbers rather than failure classes.
- Persisting unverified hypotheses as confirmed root causes.
- Writing regression tests that pass even when the bug is reintroduced.
- Failing to link a resolved failure to automated regression test coverage.
- Bundling multiple disparate failure classes into one unorganized document.
- Sanitizing history by omitting failed approaches that contain valuable architectural lessons.

---

## Completion Criteria

Execution of `fable-learning` completes when:
1. Session realities have been reviewed across failures, discoveries, corrections, and test results.
2. Root causes are honestly classified (Confirmed, Strongly indicated, Open hypothesis, Unknown).
3. `Failure-lessons/` is created or updated with `README.md`, `lessons-index.md`, `testing-and-verification.md`, and relevant topic files.
4. All entries adhere to the 14-section Failure-Lesson schema and are indexed with prevention rules.
5. Invariants are connected to stable code references and regression tests.
6. Distilled prevention rules are persisted to `agent-kernel` and `gbrain` if available.
7. The 8-section final report is delivered to the user.

---

## Progressive Resources

- Failure lessons knowledge base protocol: `references/failure-lessons.md`
- Deep extraction schema & taxonomy: `references/analysis.md`
- Multi-target storage rules & synthesis formats: `references/synthesis.md`
- Empirical confidence & rule drift: `references/confidence-and-drift.md`
- Compound solution architecture & vocabulary: `references/solution-architecture.md`
- Post-training signal taxonomy: `references/post-training-signals.md`
- Session source adapters: `references/session-sources.md`
- Skill package compilation: `references/skill-compilation.md`
- Walkthrough example: `examples/learning-walkthrough.md`
