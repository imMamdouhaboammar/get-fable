# Atomic Action and Silence

Spark should make the immediate future smaller, not larger.

## Atomicity test
A good suggestion has one observable completion event. If it contains `and then`, split it.

Good:
- run `test/auth-refresh.test.ts`;
- inspect which binary `get-fable` resolves to;
- reproduce the failing request with the known fixture;
- compare current mutation and verified generations.

Too broad:
- investigate and fix the bug;
- improve tests and release it;
- research the API and implement the integration.

## Information gain
Prefer actions whose outcomes separate competing states.

If a CLI still shows old behavior after source change, `rebuild everything` may work but teaches little. `compare the source entrypoint with the packaged entrypoint` is a better next move because each outcome changes the diagnosis.

## Gate-first policy
When a lifecycle gate is missing, the Spark should usually point at the smallest evidence that can satisfy or falsify it:
- valid RED before implementation;
- current-generation test after mutation;
- diff review after verification;
- source-backed API fact before design;
- registry lookup after publish.

## Silence quality
Silence is not failure. It prevents three common agent problems:
- narrating obvious work;
- inventing new scope after completion;
- distracting an active specialist with alternate plans.

Stay silent when the agent is already executing the obvious bounded next action and no state override appears.

## Precedence examples

### Mutation + old green tests
Suggestion: rerun affected proof. Do not suggest release/review yet.

### Same failure twice
Suggestion: diagnose repeated failure. Do not suggest another unchanged test run.

### Idle complete task
Suggestion: none. Do not manufacture cleanup tasks.

### Security scan green after functional repair
If mutation is not functionally verified, suggest functional verification rather than release readiness.

### Unknown SDK behavior
Suggest current primary-source lookup or route to research; do not suggest writing the adapter.

## Confidence
Confidence should come from explicit state patterns, not stylistic certainty. If context does not support a unique atomic action, silence or orchestration is safer than a low-information guess.