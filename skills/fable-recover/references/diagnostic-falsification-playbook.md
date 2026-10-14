# Diagnostic Falsification Playbook

Use this after repeated failure when another code edit would be less informative than a diagnostic probe.

## Turn guesses into predictions
A hypothesis is useful only if it predicts an observation that alternatives do not.

Weak:
- cache issue;
- race condition;
- wrong version.

Operational:
- **Stale build**: direct source invocation shows new behavior while packaged CLI still shows old; source mtime/hash differs from dist.
- **Race**: forcing two operations through a barrier at the check-then-act boundary reproduces duplicate creation deterministically.
- **Wrong version**: lockfile/resolved module lacks the method shown in current docs; tagged source confirms introduction in later release.

## Cheapest-separator strategy
Do not fully investigate every theory. Pick the probe with best information gain and lowest mutation/risk.

Examples:
- print/inspect resolved module version before rewriting adapter;
- run source entrypoint and built entrypoint side by side;
- inspect route/registry mapping before editing similarly named handler;
- compare one failing fixture with one passing fixture;
- disable one feature flag rather than changing three code paths.

## Artifact/cache diagnosis
Before deleting anything, collect:
- source/build hashes or timestamps;
- actual executable/import path;
- current branch/worktree;
- process PID/start time;
- cache/build directory used;
- command working directory.

Then run a discriminating comparison. Cleanup is a repair only after staleness is proven.

## CI-only failure
Compare:
- OS/runtime/package versions;
- environment variables/secrets shape;
- filesystem case sensitivity;
- timezone/locale;
- test parallelism/order;
- network/service availability;
- clean checkout vs dirty local state.

Reproduce the smallest environmental difference locally/containerized where possible.

## Data-specific failure
Minimize the state:
1. identify one passing and one failing case;
2. diff meaningful fields/state;
3. remove irrelevant data until failure disappears;
4. the last necessary difference becomes a strong causal lead.

## Binary search / bisect
Use when behavior changed across commits/config/features and individual code inspection is low signal. Keep the reproduction constant and change only the candidate revision/flag.

## Temporary instrumentation
Instrument only boundaries that distinguish hypotheses. Include correlation IDs/timestamps/state where needed. Remove instrumentation after the repair unless it is independently useful product observability.

## Recovery success test
Before leaving recovery, you should be able to complete this sentence:

> The previous attempts failed because ___; probe ___ established this by showing ___; therefore repair ___ should change observable ___ while leaving ___ unchanged.

If you cannot, the diagnosis is not yet strong enough for another expensive mutation.