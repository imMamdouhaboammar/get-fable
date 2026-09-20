# Product goals, non-goals, and success definition

## Goal

Improve routing quality on semantically ambiguous or novel tasks without sacrificing get-fable's deterministic safety properties, offline behavior, explainability, or compatibility.

## Primary use cases

1. Distinguish lookalike skills whose descriptions overlap but whose semantic intent differs.
2. Identify skill intent when the user uses wording not covered by regex/keywords.
3. Provide calibrated uncertainty so the system can abstain from model-driven overrides.
4. Detect semantic escalation signals such as recovery need, security relevance, research need, planning need, or verification need.
5. Build a routing evidence loop that measures model value against the current router rather than assuming it.

## Secondary use cases

- skill-shortlist generation
- parallel-candidate suggestion
- evaluation assistance for new canonical skills
- routing diagnostics for maintainers
- semantic features for future classical routing models

## Non-goals

Jev v1 will not:

- generate code, plans, explanations, or user-facing prose
- decide whether tests passed
- decide whether a release is actually safe
- calculate mutation freshness
- replace evidence gates
- replace registry validation
- execute tools or side effects
- read source code by default
- receive secrets by design
- change the lifecycle state directly
- become mandatory for offline use
- become a new hidden source of canonical skill definitions
- replace Rust routing semantics

## Success definition

The integration is successful only if it proves one or more measurable benefits while holding safety metrics flat or better:

- lower routing error on ambiguous/holdout cases
- lower needless specialist routing
- lower wrong-skill routing among close neighbors
- useful confidence/abstention behavior
- bounded latency and failure isolation
- zero new forbidden-skill violations on approved release suites
- zero behavior change when feature is off
- deterministic fallback remains available under every provider failure

"Jev is fast" is not a success criterion. "Jev improves get-fable routing under measured gates" is.
