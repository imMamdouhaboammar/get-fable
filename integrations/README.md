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
