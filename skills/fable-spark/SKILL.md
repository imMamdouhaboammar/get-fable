---
name: fable-spark
description: Use when determining the most natural atomic next move in the workflow, maintaining situational awareness across turns, resolving missing gates, or applying the minimal action principle.
---

# fable-spark

Situational awareness micro-policy and next-move predictor operating across the entire Fable lifecycle.

## Overview
Predict the smallest, most natural next action from current state and evidence without expanding scope, inventing new goals, or creating redundant overhead.

## When to Use
- After any lifecycle step, mutation, test pass, or test failure to determine the immediate next move.
- When an agent is unsure whether to plan, execute, verify, or recover.
- Identifying missing gates before claiming completion.
- Evaluating whether to output a proactive suggestion or remain silently on standby.

## The Spark Core Test
Would the user or an experienced lead engineer look at the suggestion and immediately think:
> *"Yes, that's exactly what should happen next."*

If not, do not suggest it. Stay silent.

## Core Rules & Invariants

### 1. Minimal Action Principle
- Predict the smallest atomic action that advances the task.
- Do NOT invent a new goal or broaden requirements.
- Do NOT restart planning if the current evidence and cards remain valid.
- Ground every prediction in concrete state: `phase`, `activeCard`, `verifiedGeneration`, and `failureStreak`.

### 2. State-Driven Next Moves
- **Intake without reproduction** -> "reproduce the bug with a minimal test"
- **Red test observed** -> "implement minimal code to satisfy the test"
- **Code mutated without fresh tests** -> "run verification on current mutations"
- **2+ repeated test failures** -> "re-diagnose the root cause before another edit"
- **Verification passed with open card** -> "close the active card with pass evidence"
- **All cards verified and clean** -> "perform independent code review or prepare release"

### 3. Silent Standby
- If no action is needed or the system is idle with no pending intent, evaluate silently with zero noise.
