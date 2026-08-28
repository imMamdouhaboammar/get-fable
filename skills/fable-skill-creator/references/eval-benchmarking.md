# BinEval Scoring Methodology & Evaluation Benchmarking

## Purpose
Detailed specification of the BinEval evaluation method, the 5 quality dimensions, the binary question bank, the 60/40 train/held-out split, and the gated self-update loop for agent skills.

## The 5 BinEval Dimensions
Every skill artifact is evaluated across 5 core dimensions using atomic binary (1/0) questions:
1. **Discovery**: Does the description trigger accurately for target queries and reject non-target queries?
2. **Clarity**: Are the instructions unambiguous, concise, and written in imperative voice without jargon?
3. **Structure**: Does the skill adhere to progressive disclosure budgets (<500 line SKILL.md, >=1000 byte references)?
4. **Robustness**: Are failure modes, edge cases, and negative boundaries explicitly handled without leaking secrets?
5. **Completeness**: Are templates, examples, platform profiles, and evaluation suites fully populated?

## The Gated Self-Update Loop
When refining a skill:
1. **Freeze Train/Held-Out Split**: Deterministically split eval queries (60% train, 40% held-out).
2. **Train Analysis**: Identify failing questions on train scenarios only; the held-out set remains unopened.
3. **Atomic Edits**: Apply at most 3 targeted edits to SKILL.md or references.
4. **Gate Acceptance Rule**: Accept the update IF AND ONLY IF:
   - Train pass rate strictly improves.
   - Zero regressions occur on the held-out set (pass -> fail).
   - No new critical failures are introduced.
