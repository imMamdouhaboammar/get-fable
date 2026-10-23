# Public distribution boundary

This repository is the consumer-facing open-source distribution and documentation for get-fable. Development, release engineering, private evaluations, and unreleased products have separate ownership and should not be copied here.

## Publish only

- Community Skills with an explicit `audience: consumer` registry entry **and** a real `skills/<id>/SKILL.md` entry point.
- Public pack metadata, host integration manifests, supporting assets, schemas, and license/attribution information needed by those Skills.
- Accurate README, installation and usage guides, public APIs, changelog, contribution guidance, and security disclosure instructions.
- Built public-site pages and indexes generated **from the same consumer-only skill list**.

## Exclude from any public export or npm release

| Category | What stays outside the distribution |
| --- | --- |
| Private Skills | Anything marked `maintainer`, `private`, experimental-only, unreleased, or without a public license/release decision; their templates, tests, scripts, examples, and web copies |
| Engine implementation | Private core source, Rust crates, transport/protocol internals, engine workers, generated binaries, unreleased features, and build caches |
| Internal plans | Working design proposals, internal architecture decisions, implementation checklists, benchmark strategies, research drafts, incident notes, and commercial product specifications |
| Evaluation material | Holdout fixtures, scoring oracles, model credentials, raw behavioral transcripts, private test corpora, and release attestation internals |
| Local machine state | `.fable/` runtime state, `.agents/`, `.planning/`, local environment files, user-specific host settings, cache, logs, backups, and temporary artifacts |
| Secrets and identities | API keys, cookies, tokens, keys, service accounts, environment vaults, user data, and any exported credentials |
| Commercial distribution | Unreleased Pro MCP tools, billing and entitlement logic, private connectors, customer-specific integrations and deployment configuration |

**Important:** `.gitignore` only prevents adding untracked files. It does **not** remove content already committed to Git history, the npm registry, releases, cached pages, or downstream mirrors.

## Mandatory release gates

1. The private source export uses an explicit allowlist, filtered by consumer metadata, instead of copying broad directories without reviewing their contents.
2. Both the public Git tree and the **actual npm tarball** are checked against the same restricted-path and consumer-Skill inventory. A clean Git checkout cannot prove an npm package is clean.
3. Generated HTML, Markdown, text, JSON, sitemaps, lockfiles, pack indexes, and search metadata use the exact same consumer catalog. No dangling links or unpublished skill names.
4. License and third-party notices are checked for every included asset and integration.
5. Installation is tested in a fresh environment, including a Skills-only installation and an isolated CLI installation. Verify the actual `get-fable` executable, init path, host adapters, doctor, and downgrade/rollback.
6. Release artifacts are inspected before publishing. Block release if a forbidden category appears, even when documentation and tests are green.
7. If a sensitive secret was historically exposed, remove the source, rotate it, assess distribution copies, and use a carefully planned history-cleanup process if justified. Do not assume a normal delete commit retracts it.

The public repository runs `node scripts/public-boundary.mjs` as a structural check. This is necessary but does **not** replace the private source export policy, npm tarball inspection, manual docs review, or secret scanning.
