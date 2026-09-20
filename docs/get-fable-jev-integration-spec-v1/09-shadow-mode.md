# Shadow mode

## Contract

Shadow mode must be behaviorally invisible.

For every route event:

1. run deterministic router
2. build hard-policy snapshot
3. attempt Jev advisory call within shadow budget
4. record comparison
5. return the deterministic decision unchanged

Provider failure must not alter the command exit code unless the command explicitly asked for a live Jev diagnostic.

## Shadow event

Record:

- schema version
- timestamp
- repository revision if available
- task hash
- deterministic selected skill
- deterministic top candidates
- Jev selected skill
- Jev probabilities
- Choice confidence
- companion Noul outputs
- model version returned by API
- provider latency
- input token count if returned
- agreement/disagreement
- hard-policy lock state
- would-override under current thresholds
- provider error class if any

Do not record raw task text by default.

## Local ledger safety

Use the same filesystem safety posture as other `.fable` files:

- `.fable/reflex` must be a real directory
- event file must be a regular file
- never follow symlinked ledger paths
- writes are append-safe or atomic
- bound file growth

Suggested rotation:

```text
max active ledger: 5 MiB
max rotated files: 3
```

Exact values may be adjusted after implementation review.

## Labeling

Shadow events are not automatically ground truth.

Ground-truth sources, in descending order:

1. existing reviewed eval/holdout labels
2. explicit maintainer label
3. post-task adjudication by an independent verifier
4. downstream successful route outcome as a weak proxy

Do not train thresholds directly on unreviewed success proxies.
