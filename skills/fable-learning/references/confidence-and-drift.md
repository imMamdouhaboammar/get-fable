# Empirical Confidence & Rule Drift Architecture

Rigorous engineering learning is an empirical science, not subjective note-taking. Inspired by modern machine learning validation and production governance (`engineering-ai-engineer`, `ml-best-practices`), this guide defines how session learnings are evaluated for statistical validity, confidence levels, and drift over time.

---

## 1. Empirical Confidence Hierarchy (L1–L4)

Not all insights are created equal. Persisting a casual hypothesis with the same weight as a compiler-verified bug fix pollutes agent memory and leads to hallucinations. Every extracted learning must be assigned an explicit confidence level:

| Level | Designation | Qualification Criteria | Target Storage | Action Policy |
|---|---|---|---|---|
| **L1** | **Anecdotal** | Stated in a comment, commit message, or transcript without an executed command proving it. | Scratch / session notes only | **Do not persist** to agent-kernel or repo rules. |
| **L2** | **Observed** | Observed behavior or pattern that occurred multiple times in a single session without formal verification proof. | `gbrain` with tag `#unverified` | Candidate for further testing; not an invariant. |
| **L3** | **Verified** | Directly validated by executing an explicit test, build, or verification command where failure was observed before and success after. | `agent-kernel`, `docs/solutions/`, `gbrain` | **Persist as durable rule**. High operational priority. |
| **L4** | **Universal Invariant** | Replicated across multiple sessions/workspaces or confirmed as an immutable architectural/runtime contract. | `agent-kernel` critical rule, `SKILL.md` invariant | Enforced strictly across all future agent runs. |

### Confidence Scoring Rubric

A learning qualifies for **L3 (Verified)** if and only if:
1. **Error Triggered**: The exact failure symptom was reproduced or documented verbatim in the transcript.
2. **Intervention Applied**: A concrete code, configuration, or environment modification was executed.
3. **Machine Verification**: A verification command (e.g. `bun test <file>`, `tsc --noEmit`, `curl -f <endpoint>`) returned exit code 0 and confirmed the fix.
4. **Contrast Established**: The agent understands *why* previous attempts failed and why this specific fix succeeded.

---

## 2. Anomaly Screening & Non-Generalization

A common trap in agent learning is **overfitting to a pathological environment**: treating an idiosyncratic local glitch (e.g. a corrupted local temp cache, an unpinned broken dependency, or a bad network connection) as a permanent architectural principle.

### Anomaly Screening Checklist

Before generalizing any session takeaway into a durable rule, apply this screening:

- [ ] **Transient Infrastructure vs Code**: Was the failure caused by network timeouts, rate limits, or disk exhaustion? If yes, classify as operational recovery, not an architectural invariant.
- [ ] **Dirty Environment Check**: Did the failure resolve simply after cleaning `.cache/`, `node_modules/`, or temporary files? If yes, record a cleanup recipe, not a code redesign rule.
- [ ] **Upstream Drift**: Did an upstream dependency release a broken patch? Verify against version specs before modifying project code.
- [ ] **Local Path Contamination**: Ensure the rule contains no hardcoded absolute paths (`/Users/name/...`), host usernames, or private ports.

---

## 3. Dual-Condition Validation

Borrowed from ML cross-validation and hypothesis testing: before enshrining a rule as an **L4 Universal Invariant**, test it against two orthogonal conditions:

1. **Positive Condition**: Does applying the rule reliably resolve the targeted failure across different test cases or files?
2. **Negative Boundary Condition**: Does applying the rule avoid breaking unrelated behaviors or degrading performance elsewhere in the repository?

If a proposed rule passes the positive case but introduces subtle regressions in neighboring modules, it is an overfitted fix and must be rejected or scoped down.

---

## 4. Rule Drift & Obsolescence Monitoring

Learnings are not eternal. Tools evolve, compilers update, libraries deprecate features, and repositories refactor their architectures. A rule learned in 2024 may actively cause errors in 2026.

### Drift Detection Signals

When a previously learned rule is recalled or enforced:
- **Contradiction Signal**: A compiler, typechecker, or test fails with an error explicitly citing the behavior mandated by an old rule.
- **Deprecation Warning**: Tool outputs indicate an API, flag, or option referenced in a rule has been deprecated or removed.
- **Negative Reinforcement**: The agent repeatedly fails when attempting to apply the rule, requiring user override.

### Drift Remediation Lifecycle

```
[Active Rule in agent-kernel]
            │
            ▼ (Obsolescence signal detected)
┌───────────────────────────────────────┐
│ 1. Flag Rule as 'Drift Candidate'     │
└──────────────────┬────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────┐
│ 2. Quarantine & Verify New Baseline   │
│    Run tests without the legacy rule  │
└──────────────────┬────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────┐
│ 3. Update or Supersede Rule           │
│    agent-kernel forget / supersede    │
│    Update docs/solutions/ archive     │
└───────────────────────────────────────┘
```

When rule drift is confirmed:
1. Execute `agent-kernel forget "<old-claim>"` or record supersession.
2. In `gbrain`, add tag `#superseded` and reference the replacing rule.
3. Update relevant docs in `docs/solutions/` with a `Superseded by:` header note.
