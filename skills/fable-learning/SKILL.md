---
name: fable-learning
description: "Analyze conversation transcripts, session logs, and agent executions to extract structured learnings, reusable patterns, post-training signals, and agent-kernel Playbooks. Use when extracting session learnings, synthesizing knowledge from conversations, generating playbooks, capturing post-training signals, or recording durable engineering takeaways — even if the user does not explicitly say \"fable-learning\" (e.g. \"what did we learn\", \"convo-learn\", \"fable-convo-learn\", \"extract learnings\", \"save what we learned\", \"analyze this session\"). Do NOT use for general code review or diff audits (use fable-review)."
version: 1.6.1
pack: evolution
inputs:
  - session_transcript
requires:
  - substantive_conversation
produces:
  - learning_evidence
  - extracted_patterns
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

# Fable Learning — Conversation Analysis & Knowledge Synthesis Engine

Turn any conversation, agent trajectory, or session realities into durable, reusable knowledge saved as **agent-kernel rules**, **agent-kernel Playbooks**, **GBrain chunks**, **compound solution docs** (`docs/solutions/`), and optionally a portable **SKILL.md** usable across AI agent harnesses.

$$\text{Session Realities} \xrightarrow{\text{Reality Mining}} \text{Decisions, Lessons, Patterns, Surprises} \xrightarrow{\text{Distillation \& Confidence}} \text{agent-kernel + docs/solutions/ + gbrain} \xrightarrow{\text{Evolution}} \text{Playbooks \& Skills}$$

---

## Mission

Learning is not chat archiving. It is the empirical extraction of verified fixes, root cause discoveries, architectural decisions, and failure patterns discovered during real engineering execution.

Every engineering session uncovers surprises: unexpected compiler flags, third-party API quirks, runtime edge cases, test harness gotchas, and user corrections. If these insights remain trapped in a single session transcript, every future session is doomed to repeat the same discovery cost.

**Fable Learning** grounds every learning in actual session evidence, prevents hallucinated takeaways, assigns rigorous empirical confidence levels ($L1 \to L4$), monitors rule drift over time, and automatically codifies durable facts into `agent-kernel`, `gbrain`, `docs/solutions/`, and `docs/learning/`.

---

## Activate When

- Extracting takeaways, verified fixes, or patterns from a completed or in-progress session.
- User asks "what did we learn?", "convo-learn", "extract learnings", "save what we learned", "document solution", or "analyze this session".
- Resolving a non-trivial bug, test regression, or configuration obstacle and codifying the solution into `docs/solutions/`.
- Capturing user corrections, confirmations, or escalations as LLM post-training signals.
- Synthesizing 3+ related problem-solution pairs into an `agent-kernel` Playbook.
- Compiling conversation takeaways into a new portable Skill package via `fable-skill-creator`.
- Running headless at session completion (`Stop` / `SessionEnd` hook events) to record learning chunks.

---

## Do Not Activate When

- Reviewing code diffs or pull requests without transcript analysis (`fable-review`).
- Verifying whether an application feature or bugfix works against tests (`fable-verify`).
- Storing user preferences or identity facts into static memory (`fable-memory`).
- Running quantitative benchmarks or comparing prompt models (`fable-eval`).

---

## Situation Classification

| Invocation Pattern | Mode | Target Storage | Action & Depth | Output Artifact |
|---|---|---|---|---|
| Explicit session ID or transcript file | `ANALYZE` | `agent-kernel` + `gbrain` + `docs/solutions/` | Full 4-category extraction & synthesis | Structured markdown report |
| Short session or `--depth lightweight` | `QUICK` | `agent-kernel` + `gbrain` | Top 5 atomic $L3+$ rules | Terminal output |
| Resolved non-trivial bug or harness issue | `COMPOUND` | `docs/solutions/` + `CONCEPTS.md` | Single atomic problem-solution doc | `docs/solutions/YYYY-MM-DD-<slug>.md` |
| "make a skill from this" or `--compile` | `COMPILE` | `skills/<name>/` | Full extraction + author `SKILL.md` via `fable-skill-creator` | Skill package |
| "what did we learn?" or `--recall` | `RECALL` | Terminal output / summary | Query `gbrain` and `agent-kernel` to synthesize | Interactive digest |
| Post-session hook (`Stop` / `SessionEnd`) | `HEADLESS` | `agent-kernel` + `gbrain` | Automated background extraction with fail-soft safety | `Documentation complete` / `skipped` |

---

## Protocol

Structured TWI (Training Within Industry) procedure for empirical reality mining and knowledge distillation:

### Step 1: Source & Lifecycle Artifact Harvesting
- **Action**: Locate the session transcript and gather completed planning artifacts (`docs/SPEC.md`, `.fable/LEDGER.md`, `*-PLAN.md`, `*-SUMMARY.md`, `*-VERIFICATION.md`).
- **Key Point**: For Antigravity, resolve `~/.gemini/antigravity/brain/<id>/.system_generated/logs/transcript.jsonl`.
- **Why**: Transcripts record execution attempts, while phase artifacts document initial intent and verified gates.
- **Inline Checklist**:
  - [ ] Transcript resolved from session ID, file path, or active context
  - [ ] Workspace planning artifacts scanned for verified `-- evidence:` tags
  - [ ] Temporary or corrupted environment artifacts excluded

### Step 2: Reality Mining Across the 4-Category Taxonomy
- **Action**: Extract realities into GSD's four core categories:
  1. **Decisions**: Architectural and technical choices (*What*, *Why*, *Source*).
  2. **Lessons**: Unexpected discoveries, failed hypotheses, and verified resolutions (*What*, *Context*, *Source*).
  3. **Patterns**: Reusable implementation or testing approaches (*Pattern*, *When to use*, *Source*).
  4. **Surprises**: Subverted expectations, edge cases, timing/perf variance (*What*, *Impact*, *Source*).
- **Key Point**: Keep exact verbatim error strings and commands to preserve searchability.
- **Why**: Future agents search for exact error text; paraphrasing destroys full-text grep utility.

### Step 3: Digestion & 3-Question Inclusion Filter
- **Action**: Run candidate findings through the `/learn` inclusion test:
  1. *Does this idea appear in $\ge 2$ contexts or resolve a repeated failure?*
  2. *Can this rule predict or prevent a failure on an unseen task?*
  3. *Is this specific and non-obvious (not generic advice)?*
- **Key Point**: Drop dated line numbers, current-score framing, and local machine absolute paths (`/Users/username/...`).
- **Why**: Generic advice ("write tests") wastes context window; non-portable paths break across machines.

### Step 4: Empirical Confidence Scoring ($L1 \to L4$) & Anomaly Screening
- **Action**: Assign confidence level ($L1 \text{ Anecdotal}$, $L2 \text{ Observed}$, $L3 \text{ Verified}$, $L4 \text{ Universal Invariant}$).
- **Key Point**: Only promote to $L3$ if a machine-checked verification command proved the fix.
- **Why**: Speculative unverified fixes generate agent hallucinations.
- **Inline Checklist**:
  - [ ] Failure was observed and documented verbatim
  - [ ] Fix was executed and succeeded
  - [ ] Machine verification command returned exit code 0
  - [ ] Not an isolated transient anomaly (dirty cache, timeout, rate limit)

### Step 5: Multi-Target Storage & Codification
- **Action**: Route findings to appropriate target layers:
  - **`agent-kernel`**: `agent-kernel remember "<rule>" --type rule --level critical`
  - **`gbrain`**: `gbrain remember "<fact>" --provenance "session:<id>" --entity "learnings/<domain>"`
  - **`docs/solutions/`**: For resolved issues, write `docs/solutions/YYYY-MM-DD-<slug>.md` using `templates/solution.template.md`.
  - **`CONCEPTS.md`**: Record novel domain vocabulary or mental models.
  - **`agent-kernel Playbooks`**: When $\ge 3$ related learnings form a workflow, run `agent-kernel evolve generate`.

### Step 6: Non-Interactive Headless Termination
- **Action**: In headless hook mode (`Stop` / `SessionEnd`), emit a clean machine-parseable status and exit code 0:
  - `[fable-learning] Documentation complete: N rules persisted to agent-kernel.`
  - Or `[fable-learning] Documentation skipped: no non-trivial L3+ solutions found.`

---

## Decision Rules

- **Empirical Grounding Over Speculation**: Never persist an unverified hypothesis or abandoned attempt as an invariant. Only persist solutions with executed verification evidence.
- **Atomicity**: One claim per rule chunk. Compound paragraphs must be split into atomic facts.
- **Sanitization Invariant**: Strip API keys, tokens, session IDs, private paths, and PII before persistence.
- **Fail-Soft Runtime**: Hook scripts must fail open without blocking terminal workflows, exits, or user commands.
- **Single Solution Doc Per Run**: Each run of Compound mode documents exactly one solved problem to avoid diluted multi-topic files.
- **Rule Drift Monitoring**: If a compiler or test proves an existing rule is obsolete, deprecate or update it via `agent-kernel forget` / `gbrain supersede`.

---

## Invariants

- Every persisted learning chunk is grounded in transcript or artifact evidence.
- `agent-kernel` auto-installs if absent, falling back to inbox buffering if package installation fails.
- Hook executions remain non-blocking (`async: true`) and headless.
- No confidential credentials, session tokens, or private PII are written to storage.
- Verification commands for $L3+$ solutions must be reproducible.

---

## Failure Taxonomy

### Transcript / Artifact Unavailable
The session ID or transcript file cannot be resolved. Fall back to active context memory or log a diagnostic warning.

### Unverified Fixes
The conversation contains attempted solutions that failed or were abandoned. Discard abandoned attempts; record only the final verified resolution.

### Missing agent-kernel Binary
`agent-kernel` is not found in `$PATH`. Automatically invoke `bun install -g agent-kernel`. If bun is unavailable, buffer learnings into `~/.gemini/antigravity/learning-inbox/`.

### Secret Exposure Risk
Transcript contains sensitive environment variables or keys. Sanitize through regex redaction before passing to storage commands.

### Rule Drift / Obsolescence
A previously learned rule is invalidated by a new library version or runtime refactor. Quarantine the old rule, verify the new baseline, and supersede it.

---

## Red Flags & Rationalization Counters

| Agent Excuse / Rationalization | Reality & Binding Rule |
|---|---|
| *"I will summarize the whole chat transcript as one learning document."* | **Violation.** Monolithic transcripts are unsearchable noise. Extract atomic rules and single-topic solution docs. |
| *"The proposed fix looks mathematically correct, so I can save it without running the test."* | **Forbidden.** Speculation causes hallucinations. Unverified fixes are restricted to $L1$ and never saved as rules. |
| *"This failure happened once due to a network glitch, so let's add a global retry architecture."* | **Violation.** Screen out transient operational anomalies before generalizing architectural rules. |
| *"I don't need to check if agent-kernel is installed."* | **Violation.** The skill must guarantee `agent-kernel` availability and auto-install it seamlessly if missing. |
| *"We don't need to record the verification command because the user saw it work."* | **Violation.** Machine-checked verification commands are mandatory for $L3$ solution documents. |

---

## Anti-Patterns

- Archiving entire conversation transcripts verbatim without synthesis.
- Persisting hallucinated or speculative learnings not verified by actual commands.
- Bundling multiple disparate lessons into a single monolithic memory chunk.
- Failing loudly during post-session hooks and disrupting the user's terminal workflow.
- Skipping `agent-kernel` installation when it can be seamlessly bootstrapped.
- Inventing domain vocabulary without updating `docs/solutions/CONCEPTS.md`.

---

## Completion Criteria

Execution of `fable-learning` completes when:
- All problems, verified solutions, and root causes from the transcript are extracted.
- Each learning is categorized into Decisions, Lessons, Patterns, or Surprises.
- Learnings pass the 3-Question Filter and are assigned an empirical confidence level ($L1 \to L4$).
- Learnings are persisted to `agent-kernel remember` and/or `gbrain remember`.
- Substantive solved problems are codified into `docs/solutions/YYYY-MM-DD-<slug>.md` if applicable.
- In headless hook mode, the exit code is 0 and non-interactive silence is maintained with `Documentation complete`.

---

## Progressive Resources

- Deep extraction schema & taxonomy: `references/analysis.md`
- Multi-target storage rules & synthesis formats: `references/synthesis.md`
- Empirical confidence & rule drift: `references/confidence-and-drift.md`
- Compound solution architecture & vocabulary: `references/solution-architecture.md`
- Post-training signal taxonomy: `references/post-training-signals.md`
- Session source adapters: `references/session-sources.md`
- Skill package compilation: `references/skill-compilation.md`
- Walkthrough example: `examples/learning-walkthrough.md`
