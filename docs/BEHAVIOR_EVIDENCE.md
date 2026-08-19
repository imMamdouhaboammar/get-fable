# Behavioral evidence

get-fable keeps deterministic runtime checks separate from real agent behavior proof. The 22 action Skills that are still M3 can earn M4 only after an independent provider executes the blinded enterprise behavior bundle and the scored evidence meets every category threshold.

## Export the blinded requests

```bash
bun ./bin/get-fable.js behavior-eval export \
  --out /tmp/get-fable-agent-behavior-requests.json
```

The current bundle contains 115 requests across the 22 M3 action Skills. Provider-facing case IDs are opaque and the bundle contains no `expected`, `forbidden`, or evaluation-category fields.

The provider must receive only each request's `skillId`, opaque `caseId`, `instruction`, `given`, and `actionVocabulary`. Do not give the provider repository eval files, scoring code, expected outputs, or forbidden outputs.

## Execute with an independent provider

For every request, return one structured response:

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
  "providerId": "your-provider-and-model-id",
  "responses": [
    { "caseId": "case-...", "response": { "action": "..." } }
  ]
}
```

A missing, duplicate, unknown, or malformed case fails closed. Provider errors must be represented as missing/failed cases rather than filled from the oracle.

## Score and persist evidence

```bash
bun ./bin/get-fable.js behavior-eval score \
  /tmp/get-fable-agent-behavior-responses.json \
  --out evals/results/agent-behavior-v1.json

bun ./bin/get-fable.js behavior-eval status
bun ./bin/get-fable.js doctor --json-v1
```

Scoring happens only after provider execution. The evidence snapshot is bound to SHA-256 hashes of the current request corpus and private oracle metadata. Validation also recomputes every case verdict from the recorded provider response, so editing pass flags or aggregate counts cannot manufacture fresh evidence.
## M4 thresholds

Each Skill must have executed evidence in all five categories:

- known: pass rate >= 90%
- negative: pass rate >= 95%
- ambiguous: pass rate >= 90%
- adversarial: pass rate >= 95%
- holdout: pass rate >= 90%

`get-fable`, `fable-spark`, and `fable-verify` already use their dedicated deterministic enterprise corpora and frozen holdout evidence. The provider bundle intentionally excludes those three Skills.

## Public schemas

- `schemas/agent-behavior-request-bundle.schema.json`
- `schemas/agent-behavior-response-bundle.schema.json`
- `schemas/agent-behavior-eval-result.schema.json`
- `schemas/cli-json-envelope.schema.json`

Existing `--json` output remains backward compatible. `--json-v1` is additive and wraps supported machine output as `{ "schemaVersion": 1, "command": "...", "data": ... }`.
