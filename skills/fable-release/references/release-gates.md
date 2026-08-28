# Release Gates, Artifact Verification & Publication Protocol

## Purpose
Defines the mandatory release gates, semantic versioning rules, supply chain checks, and publication verification steps required before merging to production or publishing packages.

## The 5 Mandatory Pre-Release Gates

### Gate 1: Clean Working Tree & Fresh State
- `git status` must report zero uncommitted changes and zero untracked files.
- Current branch must be up-to-date with upstream origin.
- Workspace state in `.fable/state.json` must be verified at the current mutation generation.

### Gate 2: Full Repository Test & Build Gate
- Static typecheck passes: `bun run typecheck`
- Full unit and integration test suite passes: `bun test`
- Clean production build succeeds: `bun run build`
- Linting and schema validation pass: `bun ./bin/get-fable.js lint`

### Gate 3: Semantic Versioning & Changelog
- Version in `package.json` and manifests must follow strict SemVer (`MAJOR.MINOR.PATCH`).
- `CHANGELOG.md` must contain release notes summarizing new features, fixes, and breaking changes.

### Gate 4: Supply Chain & Dependency Hygiene
- Zero high/critical security advisories in dependencies.
- Third-party GitHub Actions pinned to full commit SHAs.
- No exposed credentials or secret tokens in release bundles.

### Gate 5: Artifact & Package Inspection
- Inspect the packed distribution tarball (`npm pack --dry-run`) to confirm all required skills, assets, and binaries are present while development fixtures and sensitive files are excluded.
