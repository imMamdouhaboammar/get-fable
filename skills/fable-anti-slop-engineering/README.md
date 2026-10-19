# Fable Anti-Slop Engineering (`fable-anti-slop-engineering`)

Autonomous coding discipline and anti-slop prevention engine for the get-fable lifecycle.

## Overview

`fable-anti-slop-engineering` protects repositories from AI coding slop, synthetic tests, swallowed errors, security bypasses, and unauthorized complexity creep.

Powered by both:
1. Native ultra-fast Rust engine (`crates/fable-anti-slop`, compiling to `fable-anti-slop` binary).
2. Deep Playbook V2 lifecycle rules and 7 verification gates applied at each coding round.

## Key Slop Defenses

- **Test Integrity**: Detects and blocks skipped tests (`@pytest.mark.skip`, `it.skip`, `#[ignore]`), weak assertions (`expect(true).toBe(true)`, `assert 1 == 1`), and deleted regression assertions.
- **Error Transparency**: Prevents swallowed exceptions (`except: pass`, empty `catch {}`, `.catch(() => {})`, `rescue nil`).
- **Security Boundaries**: Blocks security bypasses (`verify=False`, `rejectUnauthorized: false`, `--no-verify`, disabled auth) and hardcoded secrets.
- **Type & Lint Hygiene**: Flags suppressions (`@ts-ignore`, `@ts-nocheck`, `eslint-disable`, `# type: ignore`).
- **Execution Safety**: Detects dangerous dynamic execution (`eval()`, `exec()`, `shell=True`).
- **Diff Discipline**: Flags excessive diff bloat (>400 lines) and untracked file leakage.

## CLI Usage

```bash
# Run diff scan against git base
bun ./bin/get-fable.js anti-slop --base HEAD --fail-on-blocker

# Using the native Rust engine binary
fable-anti-slop scan --base HEAD --fail-on-blocker --json-v1
```
