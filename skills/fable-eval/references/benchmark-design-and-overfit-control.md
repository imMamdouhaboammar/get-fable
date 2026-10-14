# Benchmark Design and Overfit Control

Agent evals fail when the benchmark becomes easier to memorize than the underlying behavior is to learn.

## Design from decisions, not examples
Start with the mistakes you need to detect:
- wrong Skill selected;
- correct Skill but wrong action;
- forbidden shortcut under pressure;
- failure to defer when evidence is missing;
- unsafe action when silence/recovery is correct;
- stale evidence accepted as proof.

Then create multiple semantic contexts that require the same underlying policy without sharing obvious lexical cues.

## Checked vs holdout
A useful lifecycle:
1. checked corpus drives day-to-day regression development;
2. blind holdout is reserved for acceptance/maturity decisions;
3. when a holdout failure teaches a new pattern, move that pattern into the checked corpus only after creating a replacement unseen holdout family.

Repeated tuning against the same holdout converts it into training data.

## Oracle isolation
Provider-facing payload should contain only what a real agent would legitimately know. Remove:
- expected action/output;
- forbidden action;
- category name;
- holdout marker;
- scorer hints;
- case IDs that encode the answer.

Use opaque IDs when external providers return structured responses.

## Slice metrics
Always inspect at least:
- positive/known accuracy;
- negative/refusal precision;
- ambiguous decisions;
- adversarial forbidden violations;
- holdout result;
- semantic-family coverage.

For routers add confusion pairs. For Spark add silence precision/unsafe suggestion rate. For tool agents add destructive/unauthorized action rate.

## Stochastic providers
When model randomness matters, freeze parameters where possible and repeat representative cases. Report variance/confidence rather than choosing the run that supports the desired candidate.

## Cost-sensitive regressions
Weighting can be useful, but never let a weighted average hide catastrophic cases. Some outcomes should be hard vetoes:
- security bypass;
- unauthorized publish/destructive mutation;
- secret leakage;
- stale evidence accepted as completion;
- holdout/oracle leakage.

## Comparability checklist
Before attributing score difference to the candidate confirm baseline/candidate share:
- model/provider version;
- tool set;
- system context except intended candidate change;
- token/context budget;
- timeout/retry policy;
- scorer/oracle version;
- corpus identity.

If not, state the confounder and avoid causal claims.

## Evidence freshness
Hash the evaluated Skill/control content and corpus/oracle. If any load-bearing input changes, mark prior evidence stale. Keeping a JSON result file around is not enough to keep a maturity claim alive.