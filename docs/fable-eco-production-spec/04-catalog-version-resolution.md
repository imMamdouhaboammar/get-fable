# Fable Eco Catalog and Version Resolution

## 1. Catalog layers

Resolution merges catalogs in explicit order:

1. Fable Official
2. Enterprise catalogs configured by policy
3. User local catalog
4. Project-local catalog only when policy explicitly permits it

Higher-precedence catalogs may pin or disable an existing capability but may not silently replace the source identity of an official capability ID. Source replacement requires a new namespace or an explicit trusted override declaration

## 2. Official catalog layout

```text
eco/catalog/
  index.toml
  capabilities/
    codegraph.toml
    agent-browser.toml
    impeccable.toml
    rtk.toml
  profiles/
    core.toml
    frontend.toml
    research.toml
    security.toml
```

Catalog files are validated at build time and again at runtime before use

## 3. Version strategy

Supported strategies:

### `github-release`

Select the highest stable release matching the declared semver range and platform asset constraints. Ignore drafts and prereleases for stable channel

### `registry`

Resolve from an explicitly named registry and package identity. Registry package identity must be associated with the expected upstream project in the manifest. Name matching alone is insufficient

### `git-tag`

Resolve a semver-compatible immutable Git tag when release assets are not provided

### `git-revision`

Use an exact commit SHA. This is allowed for official entries only when no stable packaged distribution exists or when a temporary compatibility pin is required. A mutable branch name is not a resolved revision

### `bundled`

Capability bytes ship inside get-fable and inherit get-fable versioning

## 4. Stable selection order

When a manifest supports more than one source method, preference is:

1. official immutable release artifact with upstream checksum or signature
2. official immutable release artifact with Fable-recorded digest from reviewed metadata
3. verified package registry artifact tied to expected upstream identity
4. immutable signed or annotated tag
5. immutable commit SHA

`main` and `master` are not stable versions

## 5. Metadata freshness

Catalog metadata cache stores fetch timestamp, ETag where available, upstream identity, response digest, and parsed releases. Default online plan may refresh metadata older than 24 hours. `--offline` never performs refresh. Runtime capability selection never refreshes metadata

## 6. Lock model

A committed lock entry contains:

```text
capability_id
manifest_digest
source_type
source_repository
resolved_version
resolved_revision
artifact_url or package_identity
artifact_sha256 when applicable
install_driver
driver_version
resolved_dependencies
host_bindings
qualified_platform
resolved_at
```

A lock is immutable input for repair and reproducible reinstall unless user requests `update`, `relock`, or changes profile constraints

## 7. Compatibility constraints

Resolution considers:

- OS
- architecture
- minimum runtime versions
- package manager availability
- host versions or features when declared
- conflicting capabilities
- policy restrictions
- pinned versions in current lock
- project binding minimum contract version
- driver support

Compatibility failure returns structured reason codes rather than silently switching provider unless the profile explicitly allows alternative providers

## 8. Dependency solver

V1 can use deterministic graph resolution rather than a general SAT solver if all official manifests follow these constraints:

- one selected version per capability ID
- semantic version ranges are conjunctive
- provider alternatives are ordered preferences
- hard conflicts are binary
- optional dependencies never alter required compatibility

If catalog requirements later need complex disjunctions, move to a dedicated constraint solver without changing manifest identity semantics

## 9. Downgrades

Automatic downgrade is forbidden during normal install and update. A downgrade requires one of:

- exact lock restoration
- explicit `--allow-downgrade`
- policy-mandated security rollback to an approved version

The plan must mark every downgrade prominently

## 10. Yanked or compromised versions

Official catalog may publish deny rules by capability version or artifact digest. Plan generation blocks known denied versions even if present in a previous lock, unless an emergency override policy explicitly permits forensic use. Repair never silently upgrades a denied lock; it instructs the user to run an update plan so mutation is visible
