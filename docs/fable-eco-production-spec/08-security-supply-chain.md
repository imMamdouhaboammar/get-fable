# Fable Eco Security and Supply-Chain Specification

## 1. Security objectives

Fable Eco will fetch, install, configure, and invoke third-party code. That makes the catalog and provisioner a supply-chain boundary. The security design therefore treats external repositories, package registries, release metadata, archives, executable output, host configuration, and local environment state as untrusted inputs

Security objectives:
- prevent catalog entries from becoming arbitrary code execution during resolution
- prevent archive and path traversal during staging
- preserve user configuration not owned by Eco
- pin resolved software to immutable identities
- make every mutation attributable to a transaction
- avoid storing secrets
- restrict security tooling to explicitly authorized tasks
- fail closed when artifact identity or recovery state is ambiguous

## 2. Threat actors and failure sources

- compromised upstream repository or release account
- typosquatted package
- package name collision across registries
- malicious or compromised community catalog
- tampered download in cache
- archive containing traversal paths, symlinks, device nodes, or oversized expansion
- local process racing configuration writes
- user config changed between plan and apply
- poisoned PATH resolving a different binary than expected
- tool output attempting prompt or command injection
- security capability pointed at an unauthorized target
- crash or power loss in the middle of a transaction

## 3. Catalog trust

Official catalog changes are code-reviewed in get-fable. Stable capability entries require a source identity and adapter qualification tests. Community and local catalogs are never automatically promoted to official trust

Catalog parsing rules:
- strict schema
- reject unknown critical fields
- bound file size and nesting
- canonicalize IDs
- reject duplicate IDs after merge
- reject source URL schemes other than allowlisted secure schemes
- reject install drivers not compiled into the running version

## 4. Artifact integrity

For downloadable artifacts:
- use HTTPS
- bind artifact to immutable version or revision
- verify SHA-256 when expected digest exists
- prefer upstream signatures or checksums when independently verifiable
- store verified digest in lock and receipt
- re-verify cached artifact before use

A checksum downloaded from the same compromised release page is provenance metadata, not an independent trust anchor. Documentation must not overstate that guarantee

## 5. Package identity

Package manager drivers require explicit registry and package identity. Manifest must connect that identity to expected upstream source. Resolution must never assume a package named like the repository is the correct package

For Git sources, committed state stores exact commit SHA even when selection originated from a tag

## 6. Filesystem safety

Before any write:
- resolve and validate target root
- reject target escape through `..`
- use `lstat`-equivalent checks for managed directories and existing targets
- reject special files where regular file or directory is expected
- reject unsafe symlinks for lifecycle and Eco-owned state
- create temporary files exclusively
- fsync critical journal and committed state where platform support makes it meaningful
- use atomic replace only within the same filesystem and document platform fallback

Archive extraction additionally rejects absolute paths, parent traversal, links escaping staging root, hard links outside root, device entries, and decompression exceeding configured size limits

## 7. Secrets

Eco state may record only secret variable names or credential provider references, never secret values

Forbidden persistence locations for secret values:
- inventory
- lockfile
- receipts
- transaction journal
- support bundle
- JSON CLI output
- debug logs

At invocation, a host adapter may pass explicitly mapped environment values directly to the child process without logging them

## 8. Security capability authorization

Capabilities requesting `security:active-testing` require all of:
- canonical Fable routing decision identifies security work
- target scope exists in task context or explicit user input
- policy permits active testing
- execution contract declares target constraints
- adapter can enforce or validate the target boundary strongly enough for the requested action

If target scope cannot be bounded, active actions are denied. Passive local analysis can be allowed separately

## 9. Network policy

Policies can allow:
- no network
- metadata-only network
- public internet
- allowlisted domains
- scoped security target

Install-time network access and runtime network access are separate permissions

## 10. Tool output handling

Third-party tool output is untrusted data. Adapters parse structured output when available. Raw text is not automatically inserted into privileged instructions. Prompt-bearing output is tagged as external content in host adapters

## 11. Cache security

Artifact cache entries are addressed by digest. Metadata maps source identity to digest. Cache poisoning is detected when bytes do not match lock or expected digest

Cache cleanup never follows arbitrary symlinks and never removes files outside Eco cache root

## 12. Policy signatures and enterprise use

V1 may support local policy files without cryptographic signing. The stable schema must include optional `policy_digest` and `catalog_digest` fields so an enterprise signing layer can be added without redesigning locks

## 13. Security testing requirements

Required automated tests:
- malicious archive traversal
- symlink escape
- hard-link escape where platform permits
- decompression size bomb guard
- package identity mismatch
- wrong digest
- stale cache wrong digest
- mutable branch rejected as locked revision
- host config TOCTOU precondition mismatch
- journal tampering
- foreign transaction state
- secret redaction property test
- security target absent
- security target outside scope
- capability output containing prompt injection text

## 14. Disclosure and emergency response

Official catalog supports deny rules for compromised versions or digests. Emergency catalog updates may disable installation and routing of a capability without deleting user files. The CLI reports affected installed versions and recommends a visible update or removal plan
