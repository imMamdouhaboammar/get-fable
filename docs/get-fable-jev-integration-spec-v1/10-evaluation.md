# Evaluation and calibration specification

## Evaluation arms

Every corpus must be scored against at least these arms:

A. Current deterministic router
B. Jev first-pass raw top-1
C. Jev with second-stage disambiguation
D. Hybrid guarded fusion

Do not report only Jev accuracy. The comparison target is the current get-fable router.

## Existing corpora to reuse

- `eval/scenarios/lifecycle-v2.json`
- skill-local eval JSON under canonical packages
- `eval/benchmarks/routing-v1.json`
- `evals/holdouts/routing-v1.json`

Never tune against the holdout and then continue calling it a holdout.

## New corpus

Add a dedicated semantic-routing corpus with categories:

```text
known
negative/default
lookalike
ambiguous
adversarial
suppression
continuation-state
recovery
security-boundary
new-wording
multilingual-observational
```

English remains the authority corpus initially because TypeSafe documents English as its strongest language. Arabic or mixed-language routing may be measured, but it must not be promoted without its own sample size and thresholds.

## Core metrics

### Routing quality

- top-1 accuracy
- top-2 recall
- confusion matrix
- per-skill precision/recall where sample size permits
- forbidden-skill violation count/rate
- default-route false positive rate
- hard-policy disagreement rate

### Override quality

For cases where hybrid would override deterministic:

- override coverage
- override precision
- override win rate
- override harm rate
- abstention rate

The most important authority metric is **override precision**, not global model accuracy.

### Calibration

Use Jev probabilities as probabilities, not decorative numbers.

Measure:

- Brier score for selected routing events
- Expected Calibration Error (ECE) with documented binning
- accuracy by confidence decile
- reliability diagram data
- risk-tier-specific precision at threshold

### Operational

- p50/p95/p99 provider latency
- timeout rate
- rate-limit rate
- provider failure rate
- average input tokens
- average estimated cost
- second-stage invocation rate

## Promotion gates

### Shadow -> recommend

- no code-path behavior difference when mode is off/shadow
- corpus harness reproducible
- provider failures always fall back
- no secret leakage in fixtures/logs
- stable event schema

### Recommend -> guarded

Minimum required evidence:

- zero forbidden-skill violations from hybrid on required release corpus
- holdout accuracy no worse than deterministic baseline
- override precision >= 95% on the subset the policy would actually override
- no hard-policy downgrade in any benchmark
- calibration curve supports chosen thresholds
- provider p95 is within configured route budget on representative environments
- at least 200 evaluated potential overrides or a documented reason that statistical power is insufficient

If sample size is insufficient, remain in recommend mode.

### Guarded -> broader authority

Requires a new RFC and fresh holdout. Not automatically authorized by this spec.

## Model upgrades

For every new Jev version:

1. pin new version in an eval branch
2. run full benchmark and holdout once
3. compare calibration and confusion changes
4. retune thresholds only on non-holdout data
5. generate a version-adoption evidence artifact
6. merge model bump only if gates pass

Do not point guarded/authority mode at `jev-latest`.
