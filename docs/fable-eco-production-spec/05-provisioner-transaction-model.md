# Fable Eco Provisioner and Transaction Model

## 1. Provisioning lifecycle

Every mutating command follows the same state machine:

```text
DISCOVER
  -> RESOLVE
  -> PLAN
  -> APPROVAL
  -> JOURNAL_OPEN
  -> STAGE
  -> VERIFY_STAGE
  -> APPLY_PACKAGES
  -> APPLY_HOST_PATCHES
  -> HEALTH_CHECK
  -> COMMIT_STATE
  -> JOURNAL_CLOSE
```

Failure after `JOURNAL_OPEN` enters:

```text
ROLLBACK
  -> ROLLBACK_VERIFY
  -> JOURNAL_CLOSE
```

If rollback cannot fully complete, state is `RECOVERY_REQUIRED` and subsequent mutation commands are blocked until `eco recover` or `eco repair` resolves the journal

## 2. Discovery

Discovery must be side-effect free. Probes have individual timeouts and return `present`, `absent`, `unknown`, or `error`. An `unknown` fact cannot be treated as absent when that difference affects safety

Probes include:
- operating system and architecture
- home and config roots
- shell and PATH
- write access
- current get-fable native binary
- Git
- Bun and Node
- Rust/Cargo
- Python and uv/pipx
- package managers relevant to selected entries
- supported coding hosts
- browsers used by selected browser capabilities
- prior Eco inventory and open transaction journal

## 3. Built-in install drivers

Official catalog may reference only allowlisted drivers compiled into get-fable

### `github_release`

Downloads an exact release asset selected by platform mapping, verifies expected digest, stages extraction, validates file shape, then atomically moves owned files into Eco-managed binary root or an explicitly declared target

### `binary_archive`

Like GitHub release but source URL and expected immutable digest are declared by trusted catalog metadata

### `git_checkout`

Clones or fetches into an Eco-managed source cache and checks out an exact revision. No branch checkout is accepted as committed state

### `bun_package` and `npm_package`

Install exact package versions into an Eco-managed tool prefix unless the upstream integration explicitly requires another location. Global user package installs require visible plan operations

### `cargo_package`

Installs exact crate version or revision into an Eco-managed cargo root when supported. Package identity collision checks are required

### `uv_tool`

Uses `uv tool install` with an exact package/version source and an Eco-owned tool directory when possible

### `copy_skill`

Copies validated static skill files from staged source into host-specific managed skill locations using ownership metadata

## 4. Forbidden official install behavior

- arbitrary `curl | sh`
- arbitrary manifest-provided shell commands
- privilege escalation without explicit operation and confirmation
- writing outside declared target roots
- executing source repository hooks
- treating a successful process exit as health proof without declared post-checks

A future community catalog can support an unsafe script driver only behind an explicit unsafe policy and clear trust warning. It is outside stable V1

## 5. Operation graph

A plan consists of operations with stable IDs and dependencies. Example operation types:

- FetchMetadata
- DownloadArtifact
- VerifyDigest
- ExtractArchive
- InstallPackage
- CopyFile
- CreateDirectory
- PatchJson
- PatchToml
- PatchYaml
- PatchTextBlock
- RegisterMcpServer
- InstallSkill
- WriteWrapper
- RunHealthCheck
- WriteInventory
- WriteLock

Operations declare whether they are read-only, stage-only, mutating, reversible, or commit-only

## 6. Staging

All downloadable or extractable content is staged under a transaction-specific directory. Archive extraction must reject path traversal, absolute paths, device files, unsafe symlinks, and entries outside extraction root

Staged executable content is not run until artifact verification succeeds

## 7. Configuration patching

Host config must be modified structurally when a parser exists. For text-only formats, Eco writes an owned delimited block with stable ID and original-content digest

Every patch receipt records:
- path
- precondition digest
- patch kind
- owned keys or block ID
- resulting digest
- rollback payload or prior owned fragment

Eco aborts if the current file no longer matches the expected precondition during apply

## 8. Rollback

Rollback executes completed reversible operations in reverse dependency order. Package manager uninstall is used only when Eco can prove ownership. Shared dependencies remain if referenced by another installed capability

Rollback success requires verification, not only reverse command exit status

## 9. Idempotency

Operation planners compare desired state against inventory and actual machine facts. A satisfied operation is emitted as `NoOp` with reason in JSON plan when `--verbose-plan` is used and omitted from concise human plan

## 10. Recovery

On startup, mutating commands check for an open journal. If present:

- if no commit marker exists, offer or perform safe rollback according to policy
- if commit marker exists but journal close did not complete, validate committed state and close journal
- if file state diverges from both before and after digests, mark manual recovery required and identify exact paths

`eco recover --json-v1` must be non-interactive when policy defines the recovery action

## 11. Privilege model

Stable V1 strongly prefers user-local installs. Any operation requiring administrator or sudo privileges is blocked by default. A capability whose only supported installation requires elevation is classified unsupported for stable profile unless a future privileged driver is explicitly designed and audited
