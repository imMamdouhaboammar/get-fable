# Fable Eco Capability Model

## 1. Principle

A capability is not equal to a repository or package. A capability is an installable or configurable unit with a stable Fable identity, declared functions, permissions, dependencies, conflicts, host exposure rules, and health criteria

A single upstream project may provide multiple Fable capabilities. Multiple upstream projects may provide the same abstract capability class

## 2. Identity

Canonical ID format:

```text
<namespace>/<name>
```

Examples:

```text
fable/codegraph
fable/agent-browser
fable/impeccable
fable/rtk
community/example-tool
company/internal-reviewer
```

Official curated entries use namespace `fable`

IDs are immutable. Upstream repository rename does not rename the Fable ID

## 3. Capability kinds

- `skill`: prompt/instruction capability installed into host skill locations
- `tool`: executable or service invoked by agents or playbooks
- `plugin`: host extension or plugin package
- `agent`: independently invokable agent runtime or persona bundle
- `service`: long-running local process, MCP server, indexer, or daemon
- `library`: dependency needed by another capability but not normally invoked directly
- `bundle`: virtual capability depending on a curated set of other capabilities

## 4. Functional classes

Entries can advertise one or more classes:

- lifecycle-methodology
- planning
- debugging
- testing
- code-intelligence
- code-review
- security
- browser-automation
- web-research
- frontend-quality
- document-ingestion
- context-reduction
- memory
- delegation
- release-quality
- data-format

Classes are used for routing candidates and overlap detection. They are not permission grants

## 5. Manifest required fields

Every official capability declares:

```text
schema_version
id
name
description
kind
classes
source
version
install
platforms
dependencies
conflicts
provides
permissions
health
hosts
runtime
governance
```

See `schemas/capability-manifest.schema.json`

## 6. Dependencies

Dependency edges have type:

- `required`: capability cannot function without it
- `runtime`: required only for execution
- `install`: required only during installation
- `optional`: improves functionality but cannot block the capability
- `host`: only required for a named host integration

Dependencies reference capability IDs wherever possible. External runtime requirements use typed facts such as `binary:git >= 2.40` or `runtime:python >= 3.11`

The resolver rejects dependency cycles among required capability edges

## 7. Provides and alternatives

A capability can provide abstract features:

```text
code.graph.query
browser.deterministic
browser.autonomous
ui.review
shell.output.compaction
security.dynamic-assessment
```

Profiles should depend on abstract features only when interchangeable providers are acceptable. The resolver then selects a preferred provider according to catalog priority and policy

## 8. Conflicts

Conflict types:

- `hard`: cannot coexist due path, hook, package, port, or behavior collision
- `primary-provider`: may coexist installed, but only one may be active as default provider for an abstract feature
- `context-overlap`: may coexist but must not be injected together by default
- `hook-order`: can coexist only with declared ordering
- `version`: coexistence depends on version constraint

A conflict declaration has a machine-readable reason code and remediation choices

## 9. Permissions

Permission vocabulary is explicit and deny-by-default at runtime:

- `filesystem.read:workspace`
- `filesystem.write:workspace`
- `filesystem.read:user-config`
- `filesystem.write:user-config`
- `filesystem.write:host-config`
- `network:public-internet`
- `network:scoped-target`
- `process:spawn`
- `browser:control`
- `git:read`
- `git:write`
- `credentials:host-provided`
- `security:active-testing`

No manifest may request arbitrary secret enumeration. Capabilities that need vendor tokens receive only explicitly mapped environment names at invocation time

## 10. Enforcement grades

Each host-capability binding receives an enforcement grade determined by supported mechanism:

### Grade A: enforceable

Host supports a native mechanism that can block or rewrite relevant actions before execution, or Eco owns the wrapped command path through which the action must pass

### Grade B: bounded integration

Host can expose only approved tools, MCP servers, commands, or scoped plugin actions, but cannot guarantee all alternate paths are intercepted

### Grade C: advisory

Host integration is instruction, skill text, or prompt guidance. Eco can request behavior and validate outputs but cannot claim prevention

### Grade N: unavailable

Required integration mechanism is absent. Capability may remain installed but is not routable for that host

The grade is computed from host facts and adapter support. Manifests may declare required minimum grade per playbook step

## 11. Runtime metadata

Runtime section includes:

```text
intents
accepted_task_shapes
preconditions
inputs
outputs
evidence_adapter
mutates_workspace
parallel_safe
network_required
interactive
expected_cost
expected_latency
fallbacks
```

`expected_cost` is a coarse routing class such as `free-local`, `network-free`, `provider-billed`, or `unknown`. It must not contain account pricing assumptions

## 12. Governance

Official catalog entries require:

- upstream repository and license recorded
- owner or maintainer identity recorded when publicly available
- adapter maintainer assigned in get-fable
- qualification tests present
- last qualification date recorded
- stable support tier declared
- security-sensitive designation where applicable
- update strategy declared
- removal strategy tested

## 13. Support tiers

- `stable`: included in normal profiles and release qualification
- `optional`: supported but user must select it or a specialized profile
- `experimental`: cataloged behind explicit experimental flag, no stable compatibility promise
- `compatibility`: known integration target but not owned as a primary Fable provider
- `blocked`: catalog entry retained only to explain why it cannot currently be installed or routed
