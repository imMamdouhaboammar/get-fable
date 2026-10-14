# Conversation Analysis & Reality Mining Protocol

## Purpose
Provide the unified extraction taxonomy, reality mining procedures, and artifact harvesting rules for Phase 1 of **Fable Learning**, synthesizing paradigms from `gsd-extract-learnings`, `learn`, and `ce-compound`.

---

## 1. Input Sources & Artifact Harvester

Realities live across both live conversational transcripts and durable lifecycle artifacts. Analysis harvests both:

### Transcript Sources (Priority Order)
1. **Antigravity Brain Session**:
   ```bash
   TRANSCRIPT=~/.gemini/antigravity/brain/<session-id>/.system_generated/logs/transcript.jsonl
   ```
2. **Standard File Path**: Explicit `.jsonl`, `.md`, or `.txt` transcript.
3. **Piped / Pinned Context**: Direct conversation snippets delivered on stdin or tool input.

### Lifecycle Artifact Harvester
When running in a project workspace, automatically harvest completed planning artifacts:
- **`docs/SPEC.md`**: Specification requirements, invariants, and source tags (`[measured]`, `[inferred]`, `[not-shown]`).
- **`.fable/LEDGER.md`**: Bounded cards, explicit acceptance checks, and verified `-- evidence:` tags.
- **`.fable/state.json`**: Workspace mutation generations, verified generations, and runtime evidence history.
- **Phase Artifacts** (GSD / Compound loops):
  - `*-PLAN.md`: Planned approaches and intentional decisions.
  - `*-SUMMARY.md`: Execution outcomes, challenges, and actual resolutions.
  - `*-VERIFICATION.md` & `*-UAT.md`: Observed verification failures, regression discoveries, and passing evidence.

---

## 2. Core 4-Category Extraction Taxonomy

Learnings must be categorized into GSD's four core reality categories:

### 1. Decisions
Technical and architectural choices made during execution.
- **What was decided**: The choice made (e.g. library, design pattern, configuration strategy).
- **Why it was decided**: Rationale, alternatives evaluated, trade-offs accepted.
- **Reversibility**: Reversible vs one-way door decision.
- **Source**: Artifact or turn index where the decision originated.

### 2. Lessons
Empirical discoveries during execution that were not anticipated in advance.
- **What was learned**: Specific runtime behavior, API quirk, or unexpected complexity.
- **Context & Symptom**: Verbatim error message or failure mode observed.
- **Failed Hypotheses**: What was tried first that failed, and why.
- **Verified Resolution**: The exact diff, command, or change that succeeded.
- **Confidence**: Assigned level $L1 \to L4$ (per `references/confidence-and-drift.md`).

### 3. Patterns
Reusable implementation, testing, or structural workflows.
- **Pattern Name**: Clear verb-noun phrase (e.g. *Dual-Condition Holdout Validation*).
- **When to Use**: Trigger condition and applicable architectures.
- **When NOT to Use**: Exclusions and counter-indications.
- **Cross-Project Score**: 1 (project-specific) to 5 (universal).

### 4. Surprises
Non-obvious findings that subverted expectations.
- **The Surprise**: "Wish I knew this earlier" realizations about compilers, frameworks, or cloud runtimes.
- **Impact**: Clock time, complexity, or test regressions caused.
- **Prevention**: How future agents can avoid falling into the same trap.

---

## 3. The `/learn` 3-Question Inclusion Filter

Do not clutter durable knowledge stores with generic advice or trivial observations. Before promoting any candidate finding to a durable rule, apply the 3-Question Filter:

1. **Recurrence & Context**: Does this insight appear in at least two different contexts or solve a repeated failure?
2. **Predictive Utility**: Can this rule predict or prevent a failure when facing a new, unseen task?
3. **Specificity**: Is this specific and non-obvious, or is it generic advice ("write good tests", "check logs") that adds no value?

**Filter Decisions:**
- **Passes 3**: Promoted to `agent-kernel` critical rule and/or `docs/solutions/`.
- **Passes 2**: Recorded in `gbrain` as an entity memory chunk.
- **Passes 1 or 0**: Dropped from durable storage.

---

## 4. Candidate Distillation Matrix

Before modifying durable storage, assemble a structured Candidate Matrix:

| Candidate ID | Source / Artifact | Failure Mode | Transferable Rule | Target Layer | Confidence |
|---|---|---|---|---|---|
| `C-01` | `transcript:L124` | Router SHA mismatch | Recapture holdout snapshot after router edits | `agent-kernel` + `docs/solutions/` | L3 |
| `C-02` | `LEDGER.md:C-04` | Extension validation | Add `.toon` to allowed template set | `skills/fable-delegate/` | L4 |

### Target Layers
- **`agent-kernel`**: Global, host-wide critical rules and workflows.
- **`gbrain`**: Long-term associative memory and cross-session entity recall.
- **`docs/solutions/`**: Repository-specific problem-solution documentation.
- **`docs/learning/`**: Periodic chronological session retrospectives.
- **`SKILL.md`**: Canonical lifecycle skills and instructions.

---

## 5. Post-Training Signals (LLM Fine-Tuning)

Classify human-agent turns into machine-learning post-training signals:
- **Corrections** (user rejected agent action): Extracted as *[prompt, rejected_response, preferred_response]* pair for DPO / RLHF.
- **Confirmations** (user validated output): Extracted as positive demonstration data for SFT.
- **Escalations** (user took over manual terminal execution): Extracted as failure signatures indicating agent blind spots.
