# Fable Eco Host Adapter Specification

## 1. Goal

Host adapters connect Eco capability contracts to real coding environments without pretending all hosts have the same control surface

## 2. Adapter interface

Every host adapter implements conceptual operations:

```text
detect() -> HostDetection
capabilities() -> HostCapabilityMatrix
plan_install(capability) -> HostPatchPlan
apply_patch(plan) -> HostPatchReceipt
remove_patch(receipt) -> HostPatchReceipt
expose(contract) -> HostExposure
collect(result_ref) -> AdapterResult
health() -> HostHealth
```

Host-specific mutation and presentation may be implemented in Rust or TypeScript, but machine-readable semantics must match shared fixtures

## 3. Host facts

Detection records:
- host ID
- executable location if applicable
- version when obtainable safely
- user config roots
- project config roots
- supported plugin format
- supported skill format
- MCP support
- pre-tool hook support
- post-tool hook support
- command wrapping support
- project instruction support
- non-interactive invocation support

Unknown facts remain unknown

## 4. Configuration ownership

Eco writes only:
- exact structured keys it owns
- managed skill directories it created
- managed plugin registration entries
- delimited text blocks with stable ownership IDs

Receipts allow precise removal. Existing unrelated keys are preserved

## 5. Host capability matrix

Example fields:

```json
{
  "host_id": "codex",
  "features": {
    "skills": "supported",
    "mcp": "supported",
    "pre_tool_hook": "unknown",
    "post_tool_hook": "unknown",
    "command_wrapper": "supported",
    "project_instructions": "supported"
  }
}
```

Do not hardcode assumed host behavior in policy. Adapter detection and versioned compatibility tables decide actual features

## 6. Enforcement calculation

Example:

- an RTK wrapper invoked through an Eco-owned command wrapper may qualify as Grade A for only that wrapped command path
- a capability presented as a skill instruction without interception is Grade C
- an MCP-only capability can be Grade B if the host exposes only the selected MCP server but the host can still access unrestricted shell by another route

The grade applies to the specific policy objective, not the host globally

## 7. Multi-host installs

User can choose:

```text
--hosts detected
--hosts codex,claude,cursor
--hosts none
```

Machine installation and host integration are separate operations. A capability can be installed once and bound to several hosts

## 8. Project vs global binding

Global host config is used only when required by the host or explicitly chosen. Prefer project-local binding for project-specific capabilities. The plan must show scope for every host mutation

## 9. Host update drift

`eco doctor` detects:
- missing managed entry
- altered managed entry
- host moved config path
- host version no longer compatible
- duplicate Eco registration
- stale skill copy

Repair uses current receipt and lock. It does not rewrite unrelated host config

## 10. Adapter qualification

A stable host adapter must pass:
- clean install fixture
- config already exists fixture
- malformed config fixture
- no write permission fixture
- concurrent config edit fixture
- repeated install idempotency
- repeated remove idempotency
- install then manual user edit then remove
- crash between patch and receipt write
- host version compatibility fixture
- JSON round-trip for capability matrix

## 11. Initial support policy

Stable V1 should support a small number of thoroughly qualified hosts rather than claiming universal enforcement. Existing get-fable host distribution assets can remain available, but Eco stable routing is enabled only for adapters that have completed qualification tests
