# Acceptance criteria

## Architectural

- deterministic `routeTask()` remains synchronous
- deterministic route is available with no network and no API key
- Jev cannot mutate lifecycle state directly
- hard policy cannot be downgraded by Jev
- registry remains canonical for skill/gate/fallback/next definitions
- Rust deterministic parity remains intact

## Security

- remote routing off by default
- API key never persisted
- task/state sanitization covered by tests
- no source files sent by default
- adversarial task cannot create unknown route or bypass registry

## Reliability

- provider timeout falls back
- 429 falls back
- auth failure falls back
- malformed result falls back
- model drift falls back in guarded/authority mode
- circuit breaker prevents repeated slow failures

## Compatibility

- existing CLI route contract passes unchanged when feature off
- existing JSON contracts pass
- existing state v3 loads with no migration
- normal `bun run check` does not require TypeSafe credentials

## Evaluation

Before guarded override:

- zero hybrid forbidden-skill violations on required corpus
- no hard-policy downgrade
- holdout performance not worse than deterministic baseline
- >=95% precision on actually overridden benchmark cases
- thresholds supported by calibration evidence
- provider operational measurements recorded

## Documentation

- architecture boundary documented
- configuration documented
- data handling documented
- model pinning/upgrades documented
- rollback documented
