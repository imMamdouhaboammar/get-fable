# Score-Ranked Skill Routing Over Hardcoded Priority Cascades

## Problem

When multiple skills matched signals in a user prompt, a sequential hardcoded priority cascade (`if (scores['fable-security'] >= 8) return 'fable-security'; else if ...`) caused cross-cutting skills to capture prompts intended for specific specialist skills.

For example, a prompt like:
```text
"Design a Mermaid architecture diagram for the authentication flow"
```
generated a high score (12) for `fable-artifact` due to `diagram|mermaid`, but was captured by `fable-security` (score 9) because `authentication` was checked earlier in the hardcoded cascade.

## Incorrect Assumption

Assuming that priority cascades are sufficient to order skill selection when expanding to a large catalog of specialized skills.

## Engineering Concept

**Sort candidates strictly by computed signal score, and restrict waterfall overrides solely to critical recovery conditions.**

When evaluating multiple skills against a task:
1. Candidate scores must be ranked numerically (`ranked.sort((a, b) => b.score - a.score)`).
2. The top-ranked skill (`ranked[0].skill`) must win unless a verified failure streak requires anti-loop recovery (`failureStreak >= 2`).
3. Specialist domain keywords (e.g. diagrams, configuration files, test suites, simulator oracles) should carry higher weights (10–12) than generic cross-cutting security or planning filters (6–9).

## What get-fable Now Does

1. `src/core/task-router.ts` ranks all skills by score and selects `ranked[0].skill`.
2. Recovery priority (`fable-recover`) triggers only when `failureStreak >= 2` and recovery score is high.
3. Keyword regexes use precise multi-word patterns to prevent incidental overlaps.
