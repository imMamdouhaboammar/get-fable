# RFC: Fable Provider ABI v1

**Status:** Proposed; interface direction is M0-ready, wire/package details become stable only after the M1 DSH/Cordis spike  
**Date:** 2026-09-11  
**Depends on:** Fable Agency Runtime RFC and Authority Matrix

## 1. Purpose

The Fable Provider ABI is the compatibility boundary between Fable Agency Runtime semantics and implementations of models, repositories, tools, memory, verification, review, search, approvals, workflows and host capabilities.

It exists so that Fable can use DeepSeek Harness, Cordis, MCP, CLIs, SDKs, HTTP services and remote workers without making any one transport or host API equivalent to Fable's public architecture.

## 2. ABI principles

1. **Capabilities describe outcomes, not vendors.**
2. **Providers implement capabilities; they do not become orchestration authorities.**
3. **Manifest metadata and runtime invocation are separate contracts.**
4. **Permissions and trust are explicit before invocation.**
5. **Provider-declared cost/latency/retry values are hints; Runtime policy is authoritative.**
6. **Cancellation is mandatory for long-running invocations where the transport can support it.**
7. **Evidence has provenance and scope.**
8. **Secrets are references, not serialized provider config values.**
9. **A host adapter may translate Fable ABI to DSH/Cordis internals, but those internals do not appear in ABI types.**
10. **V1 contains only concepts required to reach the Issue-to-verified-PR vertical slice plus the provider types needed to prove extensibility.**

## 3. Versioning

The manifest contains:

```text
schemaVersion: 1
abiVersion: "1.0"
```

Capability identifiers carry an independent major contract version:

```text
repository.issue.read.v1
reasoning.architecture.v1
verification.freshness.v1
```

A provider advertises exact supported capability contracts. Compatible minor additions belong in the capability input/output schema version or ABI minor version; breaking semantic changes require a new capability major identifier or ABI major version.

The Runtime never silently aliases an incompatible capability major.

## 4. Provider kinds

V1 recognizes descriptive kinds for policy/UI only:

```text
model
repository
filesystem
shell
memory
search
browser
verification
review
security
workflow
approval
host
composite
```

Kind does not determine authority or transport. A composite provider may implement several capability namespaces.

## 5. Provider manifest

Conceptual TypeScript shape:

```ts
interface FableProviderManifestV1 {
  schemaVersion: 1
  abiVersion: '1.0'
  provider: {
    id: string
    name: string
    version: string
    kind: ProviderKind
    description?: string
  }
  provides: CapabilityDescriptorV1[]
  transport: TransportDescriptorV1
  requires?: ProviderRequirementV1[]
  permissions: PermissionRequestV1[]
  sideEffects: SideEffectDescriptorV1[]
  trust: TrustDescriptorV1
  compatibility: CompatibilityDescriptorV1
  installation?: InstallationDescriptorV1
  health: HealthDescriptorV1
  concurrency?: ConcurrencyHintsV1
  costHints?: CostHintsV1
  latencyHints?: LatencyHintsV1
  evals?: EvalDescriptorV1[]
}
```

The manifest is descriptive input to Runtime policy. It cannot grant itself permissions.

## 6. Capability descriptor

```ts
interface CapabilityDescriptorV1 {
  id: CapabilityId
  description: string
  inputSchema: JsonSchemaRef
  outputSchema: JsonSchemaRef
  evidenceProduced?: EvidenceType[]
  requiredPermissions?: PermissionSelector[]
  sideEffects?: SideEffectClass[]
  cancellable: boolean
  idempotency: 'idempotent' | 'idempotent-with-key' | 'non-idempotent' | 'unknown'
  streaming?: boolean
}
```

Capability descriptions must state observable outcomes. Marketing terms are not contracts.

## 7. Transports

V1 transport vocabulary:

```text
in_process_host
mcp
cli
sdk
http
model_api
remote_agent
```

Host-specific values such as `cordis` and `dsh-plugin` may appear in a private Host Adapter compatibility descriptor, not as required Fable public runtime semantics.

A package may describe its physical host integration separately:

```ts
interface HostBindingDescriptorV1 {
  host: 'dsh' | 'standalone' | string
  adapterId: string
  adapterVersion: string
}
```

This is compatibility metadata, not a Fable capability.

## 8. Permission model

Permission requests are explicit and structured:

```ts
interface PermissionRequestV1 {
  domain:
    | 'filesystem.read'
    | 'filesystem.write'
    | 'shell.execute'
    | 'network.connect'
    | 'repository.read'
    | 'repository.write'
    | 'repository.merge'
    | 'credentials.resolve'
    | 'package.install'
    | 'external.side_effect'
  scope?: unknown
  required: boolean
  reason: string
}
```

The provider asks. Runtime/user/workspace policy grants a subset. Invocation receives the **effective grant**, never the original request as implicit authority.

No prompt or model output can create a permission grant.

## 9. Side-effect classes

V1 uses conservative classes:

```text
none
local_read
local_write
process
network_read
network_write
repository_mutation
remote_mutation
merge
credential_use
package_install
```

The most severe applicable class is visible before activation/invocation.

## 10. Trust descriptor

```ts
interface TrustDescriptorV1 {
  executionMode: 'in-process' | 'subprocess' | 'remote' | 'declarative'
  publisher?: string
  sourceUrl?: string
  integrity?: string
  signature?: {
    scheme: string
    identity: string
    valueRef: string
  }
  reviewedByFable: boolean
}
```

`reviewedByFable` is an explicit release fact for first-party distributions, not an automatic property of marketplace listing.

Because native DSH plugin code runs with user privileges and tool approvals do not sandbox plugin implementation code, `in-process` external providers receive the highest trust scrutiny.

## 11. Compatibility descriptor

```ts
interface CompatibilityDescriptorV1 {
  platforms?: ('darwin' | 'linux' | 'win32')[]
  architectures?: string[]
  fableRuntime?: string
  providerAbi: string
  hostAdapters?: Array<{
    id: string
    range: string
  }>
}
```

Host Adapter compatibility ranges are tested by Fable's conformance matrix. A provider manifest cannot claim compatibility solely because TypeScript compiles.

## 12. Runtime registration

A resolved provider instance implements a host-independent service surface conceptually equivalent to:

```ts
interface FableProviderV1 {
  readonly manifest: FableProviderManifestV1

  health(signal: AbortSignal): Promise<ProviderHealthV1>

  invoke(
    capability: CapabilityId,
    request: CapabilityInvocationV1,
  ): Promise<CapabilityResultV1> | AsyncIterable<CapabilityEventV1>

  cancel?(invocationId: string): Promise<void>

  reconcile?(
    operation: ProviderOperationRefV1,
    signal: AbortSignal,
  ): Promise<ProviderReconciliationV1>

  dispose(): Promise<void>
}
```

A transport adapter is responsible for mapping CLI/MCP/HTTP/DSH/etc. into this logical shape.

## 13. Invocation envelope

```ts
interface CapabilityInvocationV1 {
  invocationId: string
  runId: string
  taskId: string
  workerId?: string
  input: unknown
  inputSchemaId: string
  expectedOutputSchemaId: string
  permissions: EffectivePermissionGrantV1[]
  contextRefs: ContextRefV1[]
  artifactRefs: ArtifactRefV1[]
  credentialRefs: CredentialRefV1[]
  budget?: InvocationBudgetV1
  timeoutMs?: number
  idempotencyKey?: string
  policyDecisionRef: string
  signal: AbortSignal
}
```

The invocation carries references, not an unbounded dump of the Run.

## 14. Result envelope

```ts
interface CapabilityResultV1 {
  invocationId: string
  providerId: string
  providerVersion: string
  capability: CapabilityId
  status: 'succeeded' | 'failed' | 'cancelled' | 'blocked'
  output?: unknown
  outputSchemaId?: string
  artifacts?: ArtifactRefV1[]
  evidence?: EvidenceRefV1[]
  operationRef?: ProviderOperationRefV1
  usage?: UsageV1
  error?: ProviderFailureV1
}
```

A `succeeded` capability result means the provider operation succeeded according to that capability contract. It does not mean the Fable Task or Run is complete.

## 15. Failure model

Provider failures normalize to:

```ts
interface ProviderFailureV1 {
  code: string
  message: string
  category:
    | 'invalid-input'
    | 'permission-denied'
    | 'unavailable'
    | 'timeout'
    | 'cancelled'
    | 'conflict'
    | 'rate-limited'
    | 'external-state'
    | 'incompatible'
    | 'internal'
  retryAfterMs?: number
  retryableHint?: boolean
  providerRequestId?: string
  detailsRef?: string
}
```

`retryableHint` is not the retry decision. Runtime Task policy and idempotency determine whether another attempt is permitted.

## 16. Cancellation

Every invocation receives a caller-owned `AbortSignal`.

For transports that cannot accept an AbortSignal directly, the adapter must provide equivalent cancellation or declare `cancellable: false` for the capability. Runtime cancellation still marks the Task/Worker cancelled and then reconciles any external operation whose final state is uncertain.

Late provider results after an authoritative cancellation transition cannot silently mark the Worker complete.

## 17. Reconciliation

Side-effecting providers SHOULD return a stable `operationRef` when the external operation can outlive the request.

Examples:

```text
GitHub PR creation request id / resulting PR number
CI workflow run id
remote agent job id
package transaction id
```

After restart or timeout, Runtime asks `reconcile(operationRef)` before retrying a non-idempotent action.

## 18. Health

```ts
interface ProviderHealthV1 {
  status: 'healthy' | 'degraded' | 'unavailable' | 'incompatible'
  checkedAt: string
  capabilities?: Record<CapabilityId, 'ready' | 'degraded' | 'unavailable'>
  reason?: string
  detailsRef?: string
}
```

Health is freshness-bounded by policy. A stale healthy check is not permanent admission.

## 19. Artifacts

Artifacts are immutable typed handoffs:

```ts
interface ArtifactRefV1 {
  artifactId: string
  schemaId: string
  mediaType: string
  producer: {
    runId: string
    taskId: string
    workerId?: string
    providerId: string
  }
  contentRef: string
  digest?: string
  size?: number
  summary?: string
  createdAt: string
}
```

`contentRef` can point to Fable-owned content storage or a provider-owned immutable object. A Worker does not pass important state to another Worker only through natural-language transcript.

## 20. Evidence references

```ts
interface EvidenceRefV1 {
  evidenceRefId: string
  providerId: string
  type: EvidenceType
  subjectRef: string
  providerEvidenceRef: string
  result: 'pass' | 'fail' | 'unknown'
  observedAt: string
  freshness?: 'fresh' | 'stale' | 'unknown'
  repositoryRevision?: string
  mutationGeneration?: number
  scope?: string[]
}
```

The Runtime does not change provider-owned evidence by editing normalized metadata.

## 21. Capability taxonomy for M6

The initial catalog is intentionally small.

### Reasoning

```text
reasoning.issue_analysis.v1
reasoning.planning.v1
reasoning.code.v1
reasoning.review.v1
reasoning.security.v1
reasoning.summarize.v1
```

### Repository

```text
repository.issue.read.v1
repository.issue.comment.v1
repository.issue.close.v1
repository.branch.create.v1
repository.change.read.v1
repository.change.write.v1
repository.commit.create.v1
repository.pull_request.create.v1
repository.pull_request.read.v1
repository.review.read.v1
repository.ci.observe.v1
repository.pull_request.merge.v1
```

### Workspace / execution

```text
filesystem.read.v1
filesystem.write.v1
shell.execute.v1
tests.execute.v1
typecheck.execute.v1
build.execute.v1
lint.execute.v1
```

### Assurance

```text
verification.freshness.v1
review.independent.v1
security.audit.v1
evidence.read.v1
```

### Context / control

```text
memory.project.read.v1
memory.project.propose.v1
approval.request.v1
workflow.plan.v1
workflow.execute_declared.v1
```

Capabilities outside M6 require a real use case before addition.

## 22. Capability matching

A Task may declare:

```ts
interface CapabilityRequirementV1 {
  capability: CapabilityId
  required: boolean
  constraints?: {
    trust?: string[]
    executionMode?: string[]
    permissions?: PermissionSelector[]
    maxCost?: number
    maxLatencyMs?: number
    dataResidency?: string[]
    privacy?: string[]
    host?: string[]
  }
}
```

Exact capability major match is the default. Alias/deprecation maps are Runtime-owned compatibility data and may never widen semantics silently.

## 23. Resolution algorithm

### Stage A: hard eligibility

Reject candidates that fail any of:

- missing capability/version;
- ABI incompatibility;
- Host Adapter incompatibility;
- unavailable health;
- denied trust tier;
- permission requirement outside policy;
- prohibited side-effect class;
- platform/architecture incompatibility;
- required credential absent;
- active Dokion contract excludes the provider/capability.

### Stage B: policy preference

Apply explicit user/workspace/Run preferences and required privacy/evidence constraints.

### Stage C: deterministic ranking

Rank on configured priority, trust, evidence quality, provider health, historical success, privacy, cost, latency and user preference.

### Stage D: optional model recommendation

A model may recommend among candidates surviving A-C. It cannot reintroduce a rejected provider.

### Stage E: commit route

Persist the selected provider/capability version and the bounded reasons/hard-gate result in Run route history before invocation.

## 24. Model-as-provider specialization

A model provider advertises model workload capabilities such as:

```text
reasoning.general.v1
reasoning.classification.v1
reasoning.planning.v1
reasoning.architecture.v1
reasoning.code.v1
reasoning.review.v1
reasoning.security.v1
reasoning.critic.v1
reasoning.summarize.v1
reasoning.judge.v1
vision.inspect.v1
```

Registry metadata MAY include:

```text
provider route
model id
context window
tool support
multimodal support
reasoning modes
cost hints
latency hints
availability
privacy restrictions
preferred workloads
historical evaluation metrics
```

DSH's LLM adapter registry can implement the Host Adapter side of this contract without becoming the Fable model ABI.

## 25. Provider example: GitHub

```text
provider.id: github
kind: repository
transport: sdk/http
provides:
  repository.issue.read.v1
  repository.branch.create.v1
  repository.pull_request.create.v1
  repository.ci.observe.v1
  repository.pull_request.merge.v1
permissions:
  repository.read
  repository.write (for mutating capabilities)
  repository.merge (separate, high risk)
```

GitHub remains the remote source of truth. Provider results carry Issue/PR numbers and commit SHAs as operation/artifact references.

## 26. Provider example: Riqor

```text
provider.id: riqor
kind: verification
transport: cli/sdk
provides:
  verification.freshness.v1
  evidence.read.v1
```

Riqor returns references to its own run/trace state. Fable does not copy the full trace and does not reinterpret mutation freshness.

## 27. Provider example: Agent Kernel

```text
provider.id: agent-kernel
kind: memory
transport: cli/mcp/sdk candidate
provides:
  memory.project.read.v1
  memory.project.propose.v1
```

Read output is bounded context plus provenance. Proposed memory remains subject to Agent Kernel's review-first workflow.

## 28. Provider example: Dokion

```text
provider.id: dokion
kind: workflow
transport: cli/sdk
provides:
  workflow.execute_declared.v1
  approval.request.v1 (only where Dokion's contract exposes that decision)
  evidence.read.v1
```

Fable does not substitute capability selections inside an active Dokion Playbook.

## 29. Provider example: filesystem/shell host

A DSH Host Adapter may expose host-native filesystem/shell/tool implementations behind Fable capabilities. Permission grants are translated to the narrowest host sandbox/approval settings available. If the host cannot enforce the required grant, the provider is ineligible rather than silently widening access.

## 30. Provider conformance harness

M2 must ship a conformance suite that tests every provider adapter against common contracts:

- manifest/schema validation;
- duplicate capability registration rejection;
- denied permission never reaches invocation;
- cancellation behavior;
- timeout normalization;
- malformed output rejection;
- output-schema enforcement;
- stable provider/version provenance;
- evidence provenance preservation;
- secret redaction from serialized results;
- non-idempotent retry prevention without reconciliation;
- health transition behavior;
- dispose cleanup;
- host adapter replacement using fake providers.

Capability-specific suites add domain behavior such as GitHub stale-head merge protection or Riqor freshness invalidation.

## 31. Deliberately outside ABI v1

DEFERRED:

- distributed provider discovery;
- marketplace ranking/reputation;
- provider-to-provider direct calls bypassing Runtime;
- arbitrary capability composition language;
- provider-defined approval semantics overriding Runtime policy;
- automatic semantic capability aliases;
- self-modifying provider manifests;
- implicit provider installation from model output;
- universal billing settlement;
- cross-machine Worker migration.

## 32. M1 dependency

The following aspects remain **PROPOSED until M1 evidence**:

- exact private DSH Host Adapter method boundaries;
- whether Worker host binding can use only existing DSH AgentFactory/Session APIs or needs one narrow host extension;
- exact UI event bridge from Fable Run events into DSH/Fable Studio;
- cancellation/recovery mapping for a continuable DSH child Agent.

These unknowns do not block the conceptual ABI because host types are intentionally excluded. They block ABI **stability declaration** and M3 host implementation.

## 33. Acceptance criteria

Provider ABI v1 direction is ready for M2 implementation when:

- M1 returns GO, GO WITH CONSTRAINTS, or REQUIRES HOST EXTENSION with a bounded extension;
- every Wave-1 provider can be represented without vendor-specific fields in the core invocation envelope;
- permission and side-effect metadata can express GitHub, filesystem/shell, model, Agent Kernel, Riqor and Dokion requirements;
- a fake Host Adapter can execute model and deterministic provider conformance tests without DSH types in test fixtures;
- provider output cannot mark a Run complete directly;
- malformed provider output fails closed at the ABI boundary;
- secrets are absent from persisted conformance fixtures;
- capability resolver tests prove hard-gate rejection precedes ranking/model recommendation.
