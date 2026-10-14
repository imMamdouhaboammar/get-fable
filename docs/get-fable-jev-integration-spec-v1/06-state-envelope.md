# Reflex state envelope

## Purpose

Jev accuracy degrades when state is full of unrelated detail. The integration must build the smallest useful semantic state instead of forwarding the repository, prompt compiler output, or conversation history.

## Allowed first-pass state

```ts
interface ReflexStateEnvelopeV1 {
  schemaVersion: 1;
  task: string; // sanitized
  lifecycle: {
    phase: FablePhase;
    currentSkill: FableSkillId | null;
    failureState: 'none' | 'single-failure' | 'repeated-failure';
    substantial: boolean;
    hasActiveCard: boolean;
    verificationFreshness: 'fresh' | 'stale' | 'none';
  };
  deterministic: {
    selectedSkill: FableSkillId;
    selectedPack: FablePack;
    reasons: string[];
    requiresPlan: boolean;
    topCandidates: Array<{ skill: FableSkillId; scoreBucket: 'strong' | 'moderate' | 'weak' }>;
  };
  constraints: {
    suppressResearch: boolean;
    suppressRelease: boolean;
    suppressSecurity: boolean;
    suppressTdd: boolean;
    suppressPlan: boolean;
    suppressReview: boolean;
    suppressDelegation: boolean;
  };
}
```

## Values computed in code before Jev

Do not ask Jev to calculate:

- failure streak threshold
- mutation generation comparisons
- dates or elapsed time
- number of failures
- score normalization
- whether evidence generation matches mutation generation

Convert those into descriptive fields first.

## Excluded by default

Do not send:

- source files
- `.env`
- credentials
- API keys
- raw shell output
- Git remote URLs containing credentials
- full conversation history
- full evidence history
- arbitrary file paths unless needed and sanitized
- generated prompts
- user secrets

## Sanitization

Before provider calls:

1. cap task length
2. redact high-confidence secret patterns
3. redact bearer tokens and common API-key forms
4. remove null bytes/control characters
5. preserve ordinary code identifiers and filenames where safe
6. record only a hash of the pre-redaction task in telemetry, not the raw task

If redaction materially destroys the meaning of the task, abort provider use and fall back to deterministic routing.

## Context budget

Target normal first-pass state: under 4k tokens.

Hard local ceiling: 12k tokens for first-pass routing, regardless of Jev's larger context capacity.

Second pass should be smaller than first pass because it contains only three candidate contracts.
