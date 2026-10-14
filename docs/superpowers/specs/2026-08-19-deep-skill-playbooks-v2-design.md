# Deep Skill Playbooks V2 Design

## Goal
Turn get-fable Skills from concise instruction cards into operational playbooks that materially improve agent behavior under ambiguity, failure, legacy constraints, and long-running engineering work.

## Problem
The current Skills have good routing metadata and correct high-level principles, but most bodies, references, examples, and evals are too shallow. In several cases a complex discipline is reduced to 4-5 procedure steps, one small reference, one example, and one base eval scenario. This creates breadth without enough behavioral depth.

## Design principle
A Skill should not merely tell an agent what good practice looks like. It should help the agent decide what to do next, what evidence is required, what failure mode it is facing, when to stop, and which specialist should take over.

## Skill Contract V2
Every core Skill should contain:

1. Activation contract: positive triggers, negative triggers, prerequisites, escalation conditions.
2. Situation classification: a small taxonomy that changes execution behavior.
3. Decision table: explicit branches for common ambiguous cases.
4. Execution protocol: stages with objective, allowed actions, required evidence, exit condition, and stop condition.
5. Failure taxonomy: domain-specific failure classes and how to distinguish them.
6. Invariants: rules that must remain true throughout execution.
7. Anti-patterns: tempting but invalid shortcuts.
8. Handoff contract: structured evidence passed to the next Skill.
9. Progressive resources: decision guides and deep dives rather than duplicate summaries.
10. Behavioral eval families: multiple semantically distinct scenarios rather than one scenario multiplied by surface variations.

## Core batch
The first implementation batch covers the execution spine:

- skill-creator
- fable-discover
- fable-research
- fable-plan
- fable-tdd
- fable-delegate
- fable-execute
- fable-verify
- fable-review
- fable-recover
- fable-release

These Skills define the quality bar for the remaining canonical Skills.

## Evaluation changes
Each core Skill must have several scenario families that exercise different reasoning failures. Categories such as known, negative, ambiguous, adversarial, and holdout remain useful, but they are not substitutes for semantic breadth.

Examples for TDD include:

- bug reproduction before implementation
- wrong-red detection
- choosing unit vs integration vs contract tests
- legacy seams and testability constraints
- flaky or nondeterministic behavior
- concurrency and timing bugs
- pressure to change the test to match the implementation

Existing scored behavioral evidence must become stale when the scenario corpus changes. Re-evaluation is required rather than inheriting M4 from the older, narrower corpus.

## Progressive disclosure
SKILL.md stays decision-oriented and reasonably compact. Detailed domain material moves into references. References must add new operational knowledge: decision heuristics, failure diagnosis, edge cases, and worked examples.

## Compatibility
Do not break existing Skill IDs, frontmatter fields, router names, install commands, or host packaging. The V2 upgrade strengthens content and evaluation while preserving public identities and runtime contracts.

## Success criteria
A core Skill is considered upgraded when:

- SKILL.md includes classification, decision rules, failure taxonomy, anti-patterns, and handoff evidence.
- at least one existing thin reference is replaced or supplemented with a genuinely useful deep guide.
- evals contain multiple semantically distinct scenario families.
- the Skill can explain what to do when the obvious happy-path procedure is not valid.
- changing the eval corpus invalidates prior behavioral evidence as designed.
- repository validation remains green after regeneration/re-scoring work that does not require an external model.
