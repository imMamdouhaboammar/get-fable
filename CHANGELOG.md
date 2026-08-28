# Changelog

All notable changes to `get-fable` are documented in this file.

## [Unreleased]

### Fixed

- Resolve the effective Git hooks directory through Git itself so installation,
  status, and Doctor repair work from linked worktrees and repositories with a
  configured `core.hooksPath`.
- Return a non-zero CLI exit code when Git hook installation cannot resolve or
  write the effective hooks directory.

## [1.3.0] - 2026-08-19

### Highlights

- **Evidence-Backed Skill Maturity (M4)**: Transitioned all 25 canonical Skills to evidence-backed M4 maturity via an independent, oracle-free behavioral evaluation pipeline.
- **Oracle-Free Behavioral Evaluation**: Introduced `get-fable behavior-eval export` and `score` commands for blinded provider evaluation across 5 adversarial categories (`known`, `negative`, `ambiguous`, `adversarial`, `holdout`) with tamper-proof SHA-256 corpus and oracle binding.
- **Stable Machine-Readable CLI Envelopes (`--json-v1`)**: Added structured, versioned schema envelopes to CLI commands (`route`, `doctor`, `spark`, `behavior-eval`, `feed`, `status`) while maintaining backward-compatible `--json` support.
- **Supply-Chain & Security Hardening**: Pinned all 19 third-party GitHub Actions across 6 workflows to full 40-character commit SHAs, integrated TruffleHog secret scanning, CodeQL static analysis, and npm OIDC Trusted Publishing.
- **End-to-End Test Suite**: Added automated Cypress.io E2E smoke testing for the public web portal and documentation simulator.
- **Multi-Host Parity**: Full installer and lifecycle support verified across 9 agent environments (Claude Code, Antigravity / Gemini, Codex, OpenCode, Cursor, Kimi, DeepSeek, Kiro, Pi Code).

### Added

- `get-fable behavior-eval export`: Exports blinded evaluation requests without leaking oracles, expected outcomes, or forbidden actions.
- `get-fable behavior-eval score`: Scores independent provider response bundles and records signed evidence snapshots.
- `get-fable behavior-eval status`: Verifies evidence freshness against current Skill corpus and oracle digests.
- `--json-v1` flag across all major CLI commands adhering to `schemas/cli-json-envelope.schema.json`.
- TruffleHog OSS secret scanning workflow in `.github/workflows/security.yml`.
- Cypress E2E smoke tests in `.github/workflows/e2e.yml` and `cypress/e2e/site.cy.ts`.
- Automated GitHub Release drafting workflow in `.github/workflows/github-release.yml`.
- Isolated host installer matrix integration testing across all 9 supported host targets.

### Changed

- Lifted maturity distribution across all 25 canonical skills to `M4: 25`, backed by real execution results from Google Cloud Vertex AI (`gemini-2.5-flash`).
- Hardened `doctor` diagnostics to 42 system checks with explicit evidence boundaries distinguishing structural packages from behavioral proof.
- Hardened state transitions to enforce generation-based staleness invalidation when workspace mutations occur.
- Replaced all floating GitHub Actions version tags with immutable 40-character commit SHAs.
- Standardized package distribution whitelist in `package.json` ensuring clean runtime distribution while excluding developer holdouts and internal plans.

### Security & Integrity

- Zero npm dependencies in core runtime; frozen Bun lockfile in CI and local execution.
- High-risk parser fuzzing protecting against path traversal, symlink spoofing, and malformed state revisions.
- Request proxy security boundary with loopback default bind (`127.0.0.1`), header sanitization, and body byte limits.
