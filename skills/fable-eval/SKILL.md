---
name: fable-eval
description: "Evaluate changes to agent prompts, skills, routing policies, and harnesses against reproducible baselines, held-out suites, and regression benchmarks. Use when optimizing agent system prompts, measuring skill triggering accuracy, evaluating routing changes, or running benchmark regressions — even if the user does not explicitly say \"fable-eval\" (e.g. \"benchmark this prompt\", \"evaluate agent behavior\", \"test skill performance\", \"run the eval suite\"). Do NOT use for routine application unit tests (use fable-verify)."
version: 1.3.0
pack: evolution
inputs:
  - candidate_modification
requires:
  - reproducible_baseline
produces:
  - eval_verdict
  - regression_evidence
gates:
  - baseline_frozen
  - holdout_tested
  - rollback_defined
fallback: fable-plan
mutatesWorkspace: false
parallelSafe: true
neural_links:
  precursors:
    - skill-creator
  continuations:
    - fable-plan
    - fable-execute
  lateral_peers:
    - fable-verify
  recovery: fable-recover
---

# Fable Eval

Measure whether an agent-control change improves the behavior it claims to improve without quietly overfitting the benchmark or breaking neighboring behavior.

## Mission
An eval is a decision instrument, not a scoreboard. It needs a frozen comparison point, representative semantic families, oracle isolation, explicit failure costs, and a rollback decision.

A candidate should not win because the prompts resemble its instructions, because holdouts leaked into authoring, or because one average score hides a severe regression.

## Activate When
- changing Skills, prompts, routers, hooks, agent profiles, policies, or model-control logic;
- comparing candidate prompt/agent configurations;
- measuring trigger precision/recall or action compliance;
- validating a new behavioral maturity claim;
- investigating whether an apparent improvement is robust or benchmark-specific.

## Do Not Activate When
- verifying ordinary application behavior (`fable-verify`);
- authoring a Skill before its intended behavior is clear (`skill-creator`);
- running a one-off subjective prompt demo with no acceptance decision.

## Evaluation Classification
| Change | Primary eval risk |
| --- | --- |
| Router/trigger | false positives, false negatives, precedence |
| Skill instruction | action correctness, forbidden shortcuts, boundary behavior |
| Spark/next-action | top-1 action, unsafe suggestion, silence precision |
| Hook/guard | enforcement, false blocking, bypasses |
| Prompt/persona | task quality + regressions + instruction conflicts |
| Tool policy | correct tool choice, unsafe/missing action |
| Model/config | quality/latency/cost variance across representative tasks |

## Protocol
### Stage 1 — Define the decision before running tests
State:
- candidate being evaluated;
- baseline/control;
- exact behavior expected to improve;
- metrics and thresholds;
- unacceptable regressions;
- rollback action.

Avoid inventing metrics after seeing results.

### Stage 2 — Build semantic scenario families
Cover distinct decisions, not wording variants. Include as applicable:
- straightforward positive case;
- non-trigger/boundary case;
- ambiguous competing action;
- adversarial shortcut pressure;
- partial/contradictory evidence;
- failure/recovery path;
- legacy/constrained environment;
- unseen holdout.

Record family coverage separately from raw prompt count.

### Stage 3 — Freeze baseline and corpus identity
Bind the run to:
- corpus hash/version;
- candidate/baseline identity;
- evaluator/scorer version;
- provider/model/config where external;
- timestamp/repository revision.

Changing the subject, oracle, corpus, or scoring logic invalidates direct comparability unless explicitly normalized.

### Stage 4 — Protect the oracle
Provider-facing requests must not reveal expected actions, forbidden actions, category labels, holdout identity, scoring implementation, or answer-bearing metadata.

Do not draft the candidate while repeatedly reading holdout failures. Promote discovered cases into a future checked corpus and preserve a new unseen holdout.

### Stage 5 — Execute baseline and candidate consistently
Use the same task inputs, tool availability, context budget, temperature/configuration, timeout policy, and scoring rules where comparison requires them.

Capture provider errors/timeouts as failures or explicit unavailable states; do not fill missing outputs from the oracle.

### Stage 6 — Score by slices, not average alone
Inspect:
- overall metric;
- each semantic family;
- negative/adversarial forbidden violations;
- high-cost regressions;
- variance/repeated-run stability where stochasticity is material;
- routing confusion pairs where applicable.

A 1% average gain is not acceptable if it introduces a severe release/security/recovery regression.

### Stage 7 — Investigate suspicious gains
Check for:
- prompt leakage;
- duplicated/near-duplicate scenarios;
- benchmark-specific keyword matching;
- changed tool/context budget;
- scorer drift;
- cherry-picked seeds/runs;
- examples copied into the candidate.

### Stage 8 — Decide and preserve rollback
Verdict:
- **ACCEPT**: thresholds met, no prohibited regression, evidence representative/fresh;
- **REJECT**: candidate regresses required behavior or fails threshold;
- **INCONCLUSIVE**: evidence lacks breadth/stability/holdout integrity.

Record baseline artifact so rollback remains possible.

## Decision Rules
- Semantic family breadth matters more than raw scenario count.
- Surface rewrites of one case do not create independent coverage.
- Holdouts stop being holdouts once used repeatedly to tune the candidate.
- Compare slices before averages; safety-critical forbidden violations can veto a higher average score.
- If stochastic variance could change the decision, repeat enough runs to estimate stability rather than cherry-picking one seed.
- If provider/runtime errors differ between candidate and baseline, separate infrastructure failure from behavior score.
- Never preserve an old maturity result after the evaluated Skill/corpus/oracle changes unless freshness validation proves identity.
- Do not lower thresholds after a candidate fails simply to ship it.

## Invariants
- Baseline is reproducible/frozen before candidate judgment.
- Oracle/holdout data remains hidden from the evaluated agent.
- Candidate and baseline are compared under equivalent conditions where claimed.
- Missing/failed provider outputs are never replaced by expected answers.
- Every acceptance decision has a rollback path.
- High-cost regressions remain visible even when aggregate score improves.

## Failure Taxonomy
### Benchmark overfit
Candidate improves checked cases but fails unseen family/holdout. Increase semantic breadth and reject/generalize candidate.

### Oracle leakage
Expected/forbidden/category data reaches provider/candidate authoring loop. Discard contaminated evidence and create fresh blind cases.

### Metric blindness
Average improves while important slice worsens. Use per-family and veto metrics.

### Non-comparable runs
Different model/tool/context/scorer settings produce apparent gain. Re-run under controlled conditions.

### High variance
Repeated runs change verdict. Increase samples/control nondeterminism or mark inconclusive.

### Corpus drift
Skill/scenario/oracle changed after evidence capture. Mark evidence stale and rerun.

## Anti-Patterns
- five paraphrases counted as five independent tests;
- reading holdouts while tuning every candidate;
- accepting on average score alone;
- changing thresholds after seeing failure;
- treating provider timeout as skipped rather than failed/incomplete;
- evaluating only positive examples;
- copying expected action vocabulary in a way that reveals the answer per case;
- claiming M4 because an evidence JSON file exists even though corpus hash changed.

## Eval Report
```text
Candidate / baseline:
Corpus + hashes:
Provider/config:
Semantic families:
Metrics + thresholds:
Per-family results:
Forbidden/high-cost regressions:
Variance/repeats:
Leakage/comparability checks:
Verdict: ACCEPT | REJECT | INCONCLUSIVE
Rollback:
Evidence freshness:
```

## Completion Criteria
Evaluation completes when:
- baseline and candidate identities are explicit;
- semantic coverage and blind holdout integrity are credible;
- metrics are inspected by meaningful slices;
- regressions/forbidden actions are not hidden by averages;
- verdict and rollback are evidence-backed;
- evidence freshness is tied to the exact evaluated corpus/control.

## Progressive Resources
- Deep guide: `references/benchmark-design-and-overfit-control.md`
- Existing protocol: `references/eval-harness-protocol.md`
- Example: `examples/eval-regression-run.md`
