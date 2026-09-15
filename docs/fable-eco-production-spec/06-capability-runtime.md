# Fable Eco Capability Runtime

## 1. Runtime role

The runtime is the second half of Fable Eco. It is responsible for consuming installed capabilities, not merely listing them

It operates after get-fable produces a canonical routing decision. It takes that decision as authoritative lifecycle intent and returns a bounded execution contract

## 2. Inputs

```text
RoutingDecision from fable-core
ProjectEcoBinding
MachineInventory
SelectedHost
HostCapabilityMatrix
EcoPolicy
CapabilityCatalog snapshot
PlaybookCatalog
Current Fable state summary
```

The runtime does not need the complete user prompt if the canonical route and a bounded task descriptor contain enough information. When raw task text is needed for argument construction, it is treated as data and cannot alter policy

## 3. Candidate generation

Candidates are generated from:
- selected canonical Fable skill
- task shape
- intents declared by capability
- project stack facts
- required evidence
- active profile

Candidates are then filtered by:
- installed state
- current health
- platform compatibility
- selected host integration grade
- permissions
- project binding
- conflicts
- policy

## 4. Minimal capability set

The runtime should prefer the smallest set that satisfies the playbook. A capability that adds no required output, enforcement, or evidence for the current route is not activated

Selection ordering:
1. required playbook capability
2. primary provider chosen by binding or profile
3. local deterministic capability over autonomous network capability when both satisfy the same requirement
4. lower permission footprint
5. lower expected latency/cost class
6. catalog preference as final deterministic tie breaker

## 5. Playbooks

Playbooks are declarative and versioned. They map lifecycle context to capability roles

Example conceptual UI implementation playbook:

```text
precondition: task_shape == implementation AND project_has_frontend
steps:
  inspect: code-intelligence provider
  design-guidance: ui-review skill
  implement: host agent
  exercise: deterministic browser provider
  verify: existing Fable tests + browser observation
```

Playbooks do not contain unrestricted shell commands

## 6. Execution contract

The runtime output is a signed-by-process data structure, not prose-only guidance

Contract fields:
- contract schema version
- contract ID
- routing decision digest
- selected host
- selected capabilities and resolved versions
- ordered steps
- required and optional steps
- invocation mode per step
- minimum enforcement grade
- granted permissions
- expected outputs
- evidence mapping
- timeouts
- retry policy
- fallback
- parallel groups
- stop conditions
- provenance

See `schemas/execution-contract.schema.json`

## 7. Invocation modes

- `host_skill`: expose a compact skill contract to host
- `cli`: invoke an installed deterministic CLI
- `mcp`: expose a named MCP tool or server
- `plugin`: invoke host plugin action
- `wrapper`: execute through an Eco-owned wrapper
- `delegated_agent`: hand a bounded subtask to a registered agent provider
- `manual_gate`: request user approval or external action

## 8. Enforcement

A contract step can require Grade A, B, or C. If actual host integration is weaker than required, runtime must either choose a fallback with sufficient grade or return `HostUnsupported`. It may not silently downgrade a security or mutation-control requirement

For advisory steps, contract output explicitly marks them advisory

## 9. Result protocol

Each invoked capability adapter returns:

```text
step_id
capability_id
started_at
finished_at
status
exit_code when applicable
structured_output
artifact_refs
mutated_workspace
network_used
warnings
raw_output_digest
adapter_version
```

Large raw output stays outside lifecycle state. State receives digest and normalized evidence or receipt

## 10. Evidence bridge

Evidence adapters are code, not manifest expressions, for stable official capabilities. They parse structured capability results and map them to existing Fable evidence kinds

Rules:
- research output remains research evidence
- code graph discovery remains research or receipt unless a specific verification adapter proves behavior
- browser execution may produce observation evidence only when playbook defines observable assertions and adapter confirms them
- security scanner success does not close a normal feature
- review tool approval does not substitute for required tests when the routed task requires behavior verification

## 11. Retry and fallback

Retries are bounded and reason-aware. Do not retry deterministic policy denial, schema error, or unsupported host state

Fallback can select another provider only if:
- it advertises the required feature
- it satisfies permissions
- it meets minimum enforcement grade
- playbook allows provider fallback
- evidence semantics remain equivalent

## 12. Delegated agents

Agent providers such as delegate-team are executors, not peer routers. Fable owns decomposition policy and task intent. A delegated agent receives a bounded subtask contract and returns a structured result. It may not mutate Fable routing state directly

## 13. Context discipline

Host prompt compilation contains:
- current canonical skill contract
- only selected Eco capability instructions
- exact execution steps relevant to the host
- permission and stop rules
- compact state facts

It excludes the full Eco catalog, unrelated installed skills, full historical transaction receipts, and unused playbooks

## 14. Explainability

`get-fable eco explain-run <contract-id>` reports concise routing evidence:

- why each capability was selected
- which alternatives were rejected and reason code
- required evidence
- actual enforcement grade
- permissions granted
- fallbacks available

It does not expose hidden model chain-of-thought
