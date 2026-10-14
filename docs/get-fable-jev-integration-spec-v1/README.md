# get-fable × Jev Integration Specification v1

Status: Implementation-ready design, not yet implemented

Prepared: 2026-09-18

Repository baseline:

- Repository: `imMamdouhaboammar/get-fable`
- Branch: `master`
- Commit: `8446e33378ca7c55313fe8e08f57de9e353519ce`
- Package version: `1.9.1`
- Runtime: Bun-first TypeScript with a Rust `fable-core` parity path
- Current routing contract: deterministic, synchronous, explainable, registry-backed

TypeSafe baseline:

- Model: Jev 1.13, versioned id `jev-1.13.0`
- API: `POST /v1/systemone`
- JavaScript package: `@typesafe-ai/sdk`
- Inputs: text / structured text state only
- Current model limits documented by TypeSafe: 64k total request context, with 32k for state plus the longest question

## Executive decision

Do **not** replace get-fable's deterministic router with Jev.

Introduce Jev as an optional, provider-backed **Reflex Advisor** above the deterministic core. The deterministic router remains the compatibility path, fallback path, hard-policy owner, and final validator. Jev contributes semantic classification where the current regex/additive-weight router is weakest: ambiguous natural-language intent, lookalike skill selection, semantic gates, and confidence-aware escalation.

The target stack is:

```text
User task + minimal lifecycle state
          |
          v
Deterministic signal extraction
          |
          +-------------------------+
          |                         |
          v                         v
Current deterministic route     Jev Reflex Advisor
          |                         |
          |                  typed probabilities
          |                         |
          +-----------+-------------+
                      v
               Route Fusion Policy
                      |
            hard invariants win
                      |
                      v
            canonical RoutingDecision
                      |
                      v
        registry gates / state / execution
```

The first production milestone is **shadow mode**, where Jev never changes behavior. Promotion proceeds only through measured gates:

```text
off
 -> shadow
 -> recommend
 -> guarded override
 -> authority for approved low/medium-risk route classes
```

There is no required path to full Jev authority. Hard policy classes remain deterministic permanently.

## Why this architecture fits get-fable

The current router already owns important guarantees: recovery precedence, explicit security/release/handoff behavior, user suppression signals, registry-derived gates, state continuation, and public JSON contracts. It is also duplicated in the Rust path and tested for parity.

Jev is valuable precisely where the deterministic router is not ideal: fuzzy semantic distinctions. TypeSafe itself recommends keeping control flow and deterministic rules in code while using System One for narrow decisions over unstructured input. This spec follows that boundary.

## Package layout

- `00-source-of-truth.md`: evidence and baseline
- `01-current-state-audit.md`: exact integration constraints in get-fable 1.9.1
- `02-product-goals.md`: goals, non-goals, success definition
- `03-target-architecture.md`: target component architecture
- `04-routing-policy.md`: hard policy, fusion algorithm, thresholds
- `05-jev-contracts.md`: Choice/Noul/Score contracts and two-stage disambiguation
- `06-state-envelope.md`: what may be sent to Jev and what must stay local
- `07-provider-adapter.md`: provider-neutral interface and TypeSafe adapter
- `08-config-cli.md`: configuration and CLI surface
- `09-shadow-mode.md`: shadow logging and labeling
- `10-evaluation.md`: offline/online evaluation and calibration
- `11-observability.md`: telemetry, receipts, and dashboards
- `12-security-privacy.md`: secrets, remote processing, retention, prompt injection
- `13-failure-fallback.md`: outages, timeouts, malformed results, model drift
- `14-rust-parity.md`: Rust/TypeScript boundary
- `15-testing.md`: TDD and test matrix
- `16-rollout.md`: staged rollout and rollback
- `17-performance-cost.md`: budgets and capacity model
- `18-compatibility-migrations.md`: compatibility promises and schema policy
- `19-change-map.md`: expected repository edits by file
- `20-acceptance.md`: release acceptance criteria
- `21-open-questions.md`: questions that require measured evidence rather than guesses
- `adrs/`: architectural decisions
- `tasks/TASKS.md`: dependency-ordered implementation cards
- `schemas/`: draft machine-readable contracts
- `examples/`: request, response, config, and telemetry examples
- `prompts/CODING_AGENT_IMPLEMENTATION_PROMPT.md`: execution brief for a coding agent
- `references/official-sources.md`: official sources checked for this spec

## Implementation principle

Jev is allowed to be wrong. The system is not allowed to become unsafe because Jev is wrong.

That principle drives every boundary in this package.
