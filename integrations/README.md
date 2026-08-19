# Optional integration capabilities

Canonical get-fable Skills depend on capabilities, not vendor names. The stable provider contracts live in `src/integrations/providers.ts`:

- `CurrentSearchProvider`
- `ExecutionReceiptProvider`
- `SecurityEvidenceProvider`
- `RepositoryProvider`
- `BrowserEvidenceProvider`
- `SkillBehaviorProvider`

No vendor adapter is required for core routing, state, package validation, Spark, Doctor, or local deterministic evals. `SkillBehaviorProvider` is the explicit seam for executing prompt/action Skill contracts against an external agent without exposing expected or forbidden oracle values to that provider. A host may supply an adapter for services such as current web research, execution receipts, repository APIs, browser evidence, or security scanners.

## Current implementation status

The repository currently ships the provider interfaces only. It does not claim built-in runtime adapters for Riqor, AgentProof, Parallel Search, Tavily, GitHub, CodeRabbit, or browser vendors. The action-contract harness in `src/core/agent-behavior-eval.ts` can build provider-neutral cases from Skill manifests; behavioral maturity remains NOT_CHECKED until a real provider executes those cases and independent holdouts. Those services can be used by an external agent or future adapter without changing canonical Skill contracts.

## External behavioral proof

Use `get-fable behavior-eval export` to create the blinded provider request bundle, execute it with an independent agent/provider, then use `get-fable behavior-eval score` to produce `evals/results/agent-behavior-v1.json`. The exact isolation and scoring procedure is documented in `docs/BEHAVIOR_EVIDENCE.md`.

The provider must not receive Skill eval scenarios, expected/forbidden values, scoring code, or category labels. This keeps M4 evidence distinct from self-asserted fixtures.
