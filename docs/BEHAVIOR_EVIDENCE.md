# Behavioral evidence

get-fable keeps deterministic package/runtime checks separate from real agent behavior proof.

A checked-in Skill file can be structurally valid and still produce weak behavior. Conversely, an old provider run does not remain proof after the Skill instructions, semantic scenarios, oracle, or scoring corpus changes.

## Deep Skill Playbooks V2 freshness rule

The Deep Skill Playbooks V2 upgrade materially changes the canonical Skill instructions and expands each non-trivial Skill from a small baseline scenario into multiple semantically distinct decision families.

That means behavioral evidence captured against the previous corpus is **historical evidence, not fresh V2 evidence**.

This is intentional.

The evidence loader binds scored results to hashes of the exact Skill/request corpus and private oracle metadata. After a V2 Skill/eval change, `get-fable doctor` should report behavioral maturity as `NOT_CHECKED` for affected Skills until a fresh external-provider run is captured. Do not weaken freshness checks or thresholds to keep an old M4 label.

## What V2 is trying to prove

The V2 corpus tests more than the happy-path slogan of each Skill. Semantic families cover decisions such as:

- activation vs refusal/defer boundaries;
- competing next actions under ambiguity;
- failure classification and recovery;
- stale or contradictory evidence;
- unsafe shortcuts under adversarial pressure;
- legacy/constrained environments;
- incorrect-but-tempting tool choices;
- cross-Skill handoff decisions;
- holdout behavior not used to author the Skill.

The enterprise harness then evaluates those semantic families across `known`, `negative`, `ambiguous`, `adversarial`, and `holdout` conditions.

Because the corpus is generated from the current Skill packages, **do not hard-code a request count in documentation**. Export the current bundle and inspect its `requests.length` and corpus hashes.

## Export the blinded requests

```bash
bun ./bin/get-fable.js behavior-eval export \
  --out /tmp/get-fable-agent-behavior-requests.json
```

The provider-facing bundle is oracle-free. It contains opaque case IDs and the task context/action vocabulary needed for execution, but must not expose:

- `expected` answers;
- `forbidden` answers;
- evaluation category names;
- holdout identity;
- scoring code or oracle files.

The provider must receive only the public request contract. Do not provide repository eval files, expected outputs, forbidden outputs, or hidden scoring metadata.

## Execute with an independent provider

For every request, return one structured response such as:

```json
{
  "action": "write-failing-test-first",
  "selectedSkill": "optional-skill-id",
  "produces": "optional-artifact",
  "gates": ["optional-gate"],
  "structure": ["optional-path"]
}
```

Wrap all responses in the public response bundle contract:

```json
{
  "schemaVersion": 1,
  "metric": "agent-behavior-responses",
  "providerId": "provider-and-model-id",
  "responses": [
    { "caseId": "case-...", "response": { "action": "..." } }
  ]
}
```

A missing, duplicate, unknown, malformed, or timed-out case fails closed or remains explicitly incomplete according to the scorer contract. Never fill a missing provider response from the private oracle.

## Score and persist evidence

```bash
bun ./bin/get-fable.js behavior-eval score \
  /tmp/get-fable-agent-behavior-responses.json \
  --out evals/results/agent-behavior-v1.json

bun ./bin/get-fable.js behavior-eval status
bun ./bin/get-fable.js doctor --json-v1
```

Scoring happens only after provider execution. Validation recomputes case verdicts from the recorded provider responses, so editing pass flags or aggregate counts cannot manufacture valid fresh evidence.

## M4 thresholds

Each covered Skill must have executed evidence in all five enterprise categories:

- known: pass rate >= 90%
- negative: pass rate >= 95%
- ambiguous: pass rate >= 90%
- adversarial: pass rate >= 95%
- holdout: pass rate >= 90%

Forbidden-action violations remain disqualifying according to the maturity contract.

`get-fable`, `fable-spark`, and `fable-verify` use dedicated deterministic enterprise/holdout paths rather than the provider action bundle. Their evidence is also subject to freshness rules when the relevant implementation/corpus changes.

## Evidence status vocabulary

Use these states precisely:

- **PASS** — fresh evidence for the current corpus meets the required thresholds.
- **FAIL** — fresh executed evidence exists and does not meet a required threshold.
- **NOT_CHECKED** — required evidence has not been executed for the current corpus, is stale, or cannot be validated.

`NOT_CHECKED` is not a softer spelling of PASS. It is the correct state after material Skill/corpus changes and before a fresh provider run.

## Public schemas

- `schemas/agent-behavior-request-bundle.schema.json`
- `schemas/agent-behavior-response-bundle.schema.json`
- `schemas/agent-behavior-eval-result.schema.json`
- `schemas/cli-json-envelope.schema.json`

Existing `--json` output remains backward compatible. `--json-v1` is additive and wraps supported machine output as `{ "schemaVersion": 1, "command": "...", "data": ... }`.
