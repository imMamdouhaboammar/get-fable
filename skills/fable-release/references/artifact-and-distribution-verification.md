# Artifact and Distribution Verification

Release failures often happen after source correctness is already proven. Treat packaging and public distribution as separate systems with their own evidence.

## Candidate identity
Bind every check to:
- semantic version;
- commit SHA;
- tag (if any);
- artifact hash/name;
- target channel.

A release report without candidate identity cannot prove freshness.

## Artifact inspection
Before publish, inspect the exact archive/bundle users receive.

Check:
- executable/import entrypoints exist;
- package `files`/exports include runtime dependencies;
- expected docs/manifests/assets ship;
- generated files are current;
- internal eval holdouts, secrets, `.env`, coverage, screenshots/videos, local state, and temp files are absent unless intentionally public;
- runtime engine/dependency metadata matches implementation.

## Clean-install smoke
Use a temporary directory/environment that does not inherit repository-local modules or files.

For a CLI package, a minimal smoke often proves:
1. install from packed/public artifact;
2. executable resolves;
3. `--version` reports expected version;
4. `--help` starts;
5. one read-only core command works.

Add behavior-specific smoke only where release changes warrant it.

## Tag integrity
Before tag creation:
- confirm version tag is absent;
- candidate SHA is final and pushed;
- required CI references candidate SHA.

After tag:
- resolve remote tag and compare exact SHA;
- never force-move a released version tag as a routine fix.

## GitHub Release state
Distinguish:
- no release;
- draft;
- prerelease;
- published public release.

Only the last is normal public-release evidence unless prerelease was intentional.

## Registry verification
Do not trust only `publish` exit status. Query public registry/package metadata and perform a clean install from the public source. Confirm version, dist metadata/artifact, and runtime behavior.

## External/manual channels
Marketplaces may have states such as prepared, submitted, pending review, approved, published. Report exact state. "Artifacts ready" is not "marketplace published."

## Last-minute docs changes
If docs/README change after package content checks and those docs are packaged, rebuild/reinspect the artifact. If release notes change only in remote metadata, package evidence may remain fresh; state which boundary changed.

## Rollback thinking
Before irreversible rollout ask:
- can previous version be reinstalled?
- are data migrations backward compatible?
- can feature be disabled without restoring data?
- what external state (tag/version) is immutable?

Rollback does not justify force-overwriting immutable registry versions or release tags.