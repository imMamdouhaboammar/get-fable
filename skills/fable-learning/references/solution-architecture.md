# Compound Solution Architecture & Vocabulary Capture

Capturing solved problems as durable repository knowledge is the core mechanism of the Compound Engineering loop (`ce-compound`). This guide outlines the file organization, frontmatter schema, writing standards, and vocabulary capture conventions for `docs/solutions/` and `CONCEPTS.md`.

---

## 1. The Compound Principle

In software development, solving a difficult problem once is productive. Solving the same problem twice is a waste of engineering bandwidth. If a difficult bug, obscure framework gotcha, or tricky test harness failure is resolved during a session, future agents and developers should immediately discover the solution when encountering the symptom.

### Location & Structure

All durable solution documents are written under the repository's solutions directory:
`<repo-root>/docs/solutions/YYYY-MM-DD-<slug-title>.md`

Example:
`docs/solutions/2026-09-14-eval-runner-router-sha-mismatch.md`

---

## 2. Solution Document Frontmatter Schema

Each solution document must begin with YAML frontmatter following this exact contract:

```yaml
---
title: "Descriptive Sentence-Cased Problem and Resolution"
problem_type: "config" # One of: bug | config | dependency | harness | architecture | performance
impact_scope: "repo"   # One of: repo | module | host | cross-project
root_cause: "Single sentence identifying why the issue occurred"
verified_fix: "Single sentence identifying the exact modification that resolved it"
verification_command: "bun test path/to/test.ts"
confidence: "L3"       # L1 | L2 | L3 | L4
extracted_at: "2026-09-14T07:50:00Z"
session_id: "af109caf-dd45-4674-91ec-27a52f0271a2"
---
```

---

## 3. Solution Document Sections

A complete solution document contains five mandatory sections:

### 1. Problem Overview
- Provide the verbatim error message, stack trace snippet, or failing test output.
- Avoid paraphrasing error strings: verbatim logs ensure future full-text grep hits will match exact errors.

### 2. Root Cause Analysis
- Explain the underlying mechanics: why did this failure occur?
- Clarify why intuitive initial attempts or common naive fixes failed.
- Describe runtime or architectural constraints that influenced the problem.

### 3. Verified Fix
- Show the exact code diff, configuration tweak, or command sequence that fixed the problem.
- Keep diffs concise and relevant, removing irrelevant lines.

### 4. Verification Evidence
- State the machine-checkable command executed to verify the fix.
- Include the verification output summary confirming success.

### 5. Reusable Invariant & Future Prevention
- Formulate an actionable, unambiguous rule that prevents recurrence.
- State keywords that future searchers might use.
- Confirm whether the rule was also persisted to `agent-kernel` and `gbrain`.

---

## 4. Vocabulary Capture (`CONCEPTS.md`)

When a solved problem or session introduces a novel domain concept, custom abbreviation, or specialized entity (for example: `holdout evidence`, `mutation generation`, `fail-open dispatcher`, `TOON packet`), record the term in `docs/solutions/CONCEPTS.md`.

### Format

```markdown
# Concept Dictionary & Domain Vocabulary

| Term | Category | Domain Definition | First Observed In | Related Rules / Invariants |
|---|---|---|---|---|
| Routing Holdout Evidence | eval | Frozen benchmark snapshot verifying router accuracy on unseen prompts | scripts/capture-routing-holdout.ts | Router changes invalidate holdout evidence until recaptured |
```

### Invariants for Vocabulary Entries
1. **One Concept, One Meaning**: Ensure terms are not overloaded with ambiguous multiple meanings.
2. **Contextual Relevance**: Only record terms that have substantive meaning within the project codebase.
3. **No Slop**: Avoid vague generalities. Every definition must explain the term's concrete architectural role.
