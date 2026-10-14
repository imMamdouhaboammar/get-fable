# Failure modes and fallback behavior

## Universal rule

No provider failure may make deterministic routing unavailable.

## Failure table

| Failure | Shadow | Recommend | Guarded/Authority |
| --- | --- | --- | --- |
| API key missing | record disabled | deterministic | deterministic |
| timeout | deterministic | deterministic | deterministic |
| 429 | deterministic | deterministic | deterministic |
| 5xx | deterministic | deterministic | deterministic |
| auth denied | deterministic + doctor warning | deterministic + warning | deterministic + warning |
| malformed normalized result | deterministic | deterministic | deterministic |
| unapproved model returned | record drift | deterministic | deterministic and mark provider unhealthy |
| low Choice confidence | record | deterministic | deterministic |
| low top1-top2 margin | stage2 or abstain | stage2 or abstain | stage2 or deterministic |
| `none_of_these` in stage2 | deterministic | deterministic | deterministic |
| hard-policy conflict | deterministic | deterministic | deterministic |

## Circuit breaker

A process-local circuit breaker prevents repeated slow failures.

Suggested behavior:

- open after 3 provider failures in 60 seconds
- remain open 30 seconds
- half-open with one probe
- never persist circuit state as durable lifecycle truth

Values are configurable and tested.

## Model drift

If response model id differs from configured approved id in guarded/authority mode:

- do not apply override
- record drift
- warn in reflex status/doctor

## Corrupt ledger

Ledger corruption must not block routing. Move invalid ledger aside only through an explicit repair command; do not silently delete evidence.
