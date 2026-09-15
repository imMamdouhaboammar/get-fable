# Capability Distribution and Execution Control

## Core Principles
1. **Install many, activate few**: Capabilities are provisioned globally or bound per-project, but only the minimal set required for the routed task is activated in agent context.
2. **Allowlisted native drivers**: Official catalog items use compiled Rust drivers (`copy_skill`, `git_checkout`, `github_release`, `package_manager`). Shell scripts in manifests are prohibited.
3. **Transaction journaling**: Every mutation writes a write-ahead journal entry before touching disk, allowing clean rollback on failure.
4. **Immutable revisions**: Stable channel releases require exact commit SHAs or release digests. Mutable branch names are forbidden.
