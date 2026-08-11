# Contributing

Contributions are welcome when they make `get-fable` safer, easier to inspect, or more reliable on real agent work

## Before changing code

1. Read `README.md`, `docs/USAGE.md`, `docs/ARCHITECTURE.md`, and `THIRD_PARTY_NOTICES.md`
2. Keep the documented trust boundary intact. Do not claim model equivalence, vendor endorsement, or compatibility that the code does not provide
3. Prefer changes that can be verified through a public interface or an observable file/result
4. Do not replace user-owned configuration silently

## Local setup

Requirements

- Bun
- Python 3 when exercising lifecycle hooks
- Git

Install development dependencies

```bash
bun install
```

Run the quality checks

```bash
bun run typecheck
bun test
bun run build
```

Or run the combined check

```bash
bun run check
```

## Tests

Tests should describe observable behavior rather than implementation details

Useful boundaries include

- CLI command behavior and exit codes
- project initialization output
- configuration merge safety
- provider request normalization
- local proxy HTTP behavior
- lifecycle hook input/output contracts

For filesystem tests, use temporary directories. Do not write test data into the real `~/.claude`, `~/.gemini`, or `~/.agent-kernel` directories

For proxy tests, bind to loopback on an ephemeral port. Tests must not require a real model provider or API key

## Bundled third-party material

Do not copy external prompts, skills, code, or documentation into the repository without checking the source license and adding or updating the required attribution in `THIRD_PARTY_NOTICES.md`

Do not describe community material as official vendor material unless the source itself establishes that provenance

## Pull requests

Keep each pull request focused enough to review as one coherent change

Include

- what behavior changed
- why the change is needed
- tests or other evidence that cover the change
- configuration or compatibility impact
- attribution changes when third-party material is added or modified

CI must pass before merge

## Security issues

Do not submit sensitive vulnerability details in a normal pull request or public issue. Follow `SECURITY.md`
